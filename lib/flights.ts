/**
 * Live aircraft positions, from adsb.lol.
 *
 * ADS-B is the opposite of AIS in every way that matters here. Aircraft
 * broadcast their own position continuously in the clear, volunteers run
 * receivers, and adsb.lol pools the result and gives it away over plain HTTP
 * with no key at all. So unlike `lib/vessels.ts`, which has to open a socket
 * and listen in bursts, this is a GET.
 *
 * What ADS-B does *not* carry is any notion of a flight as a scheduled thing:
 * there is no departure airport, no arrival time, no date. A message is a
 * transponder saying where it is right now. Schedules come from a different
 * class of product entirely (FlightAware, FR24, AviationStack) and are
 * effectively always paid. Everything here is therefore "where is it now",
 * and the UI should never imply otherwise.
 *
 * Two constraints from the provider shaped the design:
 *
 *   - The only geographic query is a radius around a point, capped at 250
 *     nautical miles. There is no bounding-box endpoint, and no way to ask
 *     for the whole sky at once.
 *   - Rate limits flex with load rather than being a published quota, so the
 *     polite thing is to ask rarely and share one answer between visitors.
 *
 * The radius cap is what the `mil` scope below is for. Zoomed out past 250nm
 * there is no honest way to show every aircraft, so the layer shows the one
 * subset that is both small and worth a dashboard's attention: military
 * traffic, worldwide, from the provider's own classification.
 *
 * The endpoint is ADSBExchange-compatible, so moving to a paid feed later is
 * a change of base URL and a key header, not a rewrite of this file.
 */

const BASE = 'https://api.adsb.lol/v2'

/**
 * Who is asking, and where to complain.
 *
 * Not optional and not politeness: adsb.lol answers an anonymous or default
 * user agent with `403 User-Agent too generic; include valid contact info.`
 * Node's fetch sends undici's own default, so every request from the server
 * was refused while the same URL in a browser or curl worked — which made the
 * layer look like a feed with no aircraft in it rather than a feed we were
 * being turned away from.
 *
 * The feed is donated by volunteers who ask to know who is hitting it. This
 * is how they are told.
 */
const USER_AGENT = 'WorldPulse/1.0 (+https://worldpulse-dashboard-gov9.vercel.app)'

/**
 * How long one answer is served before another is fetched.
 *
 * Deliberately the same 45 seconds as the vessel capture. The spec that
 * started this asked for 15, which is affordable against a paid feed and not
 * against a donated one: 15 seconds is 5,760 requests a day per scope, and
 * every one of them is someone else's receiver and bandwidth. At 45 the layer
 * still feels live, because `deadReckonAir` carries each aircraft forward
 * along its own heading between fetches rather than letting it sit still.
 */
export const FLIGHT_REVALIDATE = 45

/** The provider's radius ceiling, in nautical miles. */
export const MAX_RADIUS_NM = 250

/**
 * How coarsely a viewport is rounded before it becomes a request.
 *
 * The point of this whole mechanism. Asking for exactly what is on screen
 * means every pan and every pixel of zoom is a new URL, which defeats both
 * the browser cache and the CDN and turns one viewer idly dragging the map
 * into a hundred upstream requests. Rounding the centre to a 5 degree grid
 * and the radius to 25 mile steps means a pan within the same cell is free —
 * it is the same URL, already cached — and the number of distinct URLs the
 * whole world can produce is small enough for a CDN to hold all of them.
 *
 * Five degrees is about 550km at the equator, comfortably inside the 250 mile
 * radius it is paired with, so the rounding never moves the centre far enough
 * to push the visible area outside what was fetched.
 */
/**
 * How coarsely a circle's centre is snapped, as a fraction of its own radius.
 *
 * It was a flat five degrees, which is about 300 nautical miles across — more
 * than the radius being requested. So a 250 mile circle could be centred 150
 * miles from what you were actually looking at, and the traffic you came to
 * see could fall outside it. Tying the grid to the radius keeps the circle
 * over the view while still collapsing a pan into the same cache key.
 */
const GRID_FRACTION = 0.5
const MIN_GRID_DEG = 0.25
const RADIUS_STEP_NM = 25

/** One aircraft, as the map needs it. */
export interface Aircraft {
  /** ICAO 24-bit address, lowercase hex. The only identity that persists. */
  hex: string
  /** Callsign as broadcast, trimmed. Null when the aircraft isn't sending one. */
  callsign: string | null
  lat: number
  lon: number
  /** Barometric altitude in feet. Null on the ground or when not reported. */
  altitude: number | null
  /** Ground speed in knots. */
  speed: number
  /**
   * Track over the ground, degrees true — or -1 when not reported, following
   * the same convention as `Vessel.course` so the drawing code can treat a
   * missing heading the same way for both.
   */
  track: number
  onGround: boolean
  /** Military, per the provider's own database flags rather than our guess. */
  military: boolean
  /** ICAO type code, e.g. `B738`. Null when unknown. */
  type: string | null
  /** Registration, e.g. `G-EUUU`. Null when unknown. */
  registration: string | null
  squawk: string | null
}

/**
 * What to ask the provider for.
 *
 * Either a circle, or the worldwide military feed when a circle cannot cover
 * what is being looked at.
 */
export type Scope =
  | { kind: 'radius'; lat: number; lon: number; dist: number }
  | { kind: 'mil' }

/**
 * How many of the provider's circles may be used to cover one viewport.
 *
 * The provider caps a query at 250 miles, and the first version treated that
 * as a cap on the whole layer: any view wider than one circle fell back to
 * the worldwide military feed. In practice that meant a view of France — a
 * perfectly ordinary thing to look at — showed four military aircraft on an
 * empty map, because its corner-to-centre distance is about 420 miles.
 *
 * Four circles cover a view roughly twice that wide, which is most of what
 * anyone looks at. Beyond it the military feed really is the honest answer.
 * Each circle is a separate request, but each is also its own cache key, so a
 * pan within a cell costs nothing and viewers share each other's.
 */
export const MAX_CELLS = 4

/** Rounds to a step, away from floating point noise. */
function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

/**
 * Turns a viewport into a cacheable request.
 *
 * Called on the client to build the URL and again in the route to decide what
 * to fetch, so the two can never disagree about which cache key a viewport
 * belongs to. Anything wider than the provider's radius cap becomes the
 * military feed, which is the honest answer at that zoom rather than a
 * silently truncated one.
 */
export function quantizeScope(lat: number, lon: number, radiusNm: number): Scope {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusNm)) {
    return { kind: 'mil' }
  }
  if (radiusNm > MAX_RADIUS_NM) return { kind: 'mil' }

  // Clamped before snapping: a very tight zoom still asks for a sensible
  // circle rather than a zero-mile one that would come back empty.
  const dist = Math.min(MAX_RADIUS_NM, Math.max(RADIUS_STEP_NM, snap(radiusNm, RADIUS_STEP_NM)))
  const gridDeg = Math.max(MIN_GRID_DEG, (dist / 60) * GRID_FRACTION)
  const snappedLat = Math.max(-85, Math.min(85, snap(lat, gridDeg)))
  // Longitude wraps, so snapping near the antimeridian has to come back into
  // range rather than asking for 185 degrees east.
  let snappedLon = snap(lon, gridDeg)
  if (snappedLon > 180) snappedLon -= 360
  if (snappedLon < -180) snappedLon += 360

  return { kind: 'radius', lat: snappedLat, lon: snappedLon, dist }
}

/** A stable string for one scope, used as both cache key and query string. */
export function scopeKey(scope: Scope): string {
  return scope.kind === 'mil'
    ? 'mil'
    : `r:${scope.lat},${scope.lon},${scope.dist}`
}

/** The query string a client should ask `/api/flights` for, given a scope. */
export function scopeQuery(scope: Scope): string {
  return scope.kind === 'mil'
    ? 'scope=mil'
    : new URLSearchParams({
        lat: String(scope.lat),
        lon: String(scope.lon),
        dist: String(scope.dist),
      }).toString()
}

/** Rebuilds a scope from query parameters, falling back to the military feed. */
export function scopeFromParams(params: URLSearchParams): Scope {
  if (params.get('scope') === 'mil') return { kind: 'mil' }

  const latRaw = params.get('lat')
  const lonRaw = params.get('lon')
  const distRaw = params.get('dist')
  // Checked for absence before conversion, because `Number(null)` is 0 rather
  // than NaN — so a bare `/api/flights` with no parameters would otherwise
  // read as a circle off the coast of west Africa instead of as "no viewport
  // given, show me the military feed".
  if (latRaw === null || lonRaw === null || distRaw === null) return { kind: 'mil' }

  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  const dist = Number(distRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(dist)) {
    return { kind: 'mil' }
  }
  // Re-quantized rather than trusted: the route's cache is keyed on the
  // result, so a hand-typed URL must land on the same small set of keys as
  // the client's would.
  return quantizeScope(lat, lon, dist)
}

/** The provider URL for a scope. */
function endpoint(scope: Scope): string {
  return scope.kind === 'mil'
    ? `${BASE}/mil`
    : `${BASE}/lat/${scope.lat}/lon/${scope.lon}/dist/${scope.dist}`
}

/**
 * One row of the provider's response.
 *
 * Typed loosely on purpose. This is a community feed assembled from whatever
 * individual aircraft happen to be transmitting, so fields are routinely
 * absent and `alt_baro` is the string `"ground"` rather than a number when an
 * aircraft is on the ground. Parsing defensively here is cheaper than a layer
 * that throws when one aircraft in four hundred is missing a heading.
 */
interface RawAircraft {
  hex?: unknown
  flight?: unknown
  r?: unknown
  t?: unknown
  lat?: unknown
  lon?: unknown
  alt_baro?: unknown
  gs?: unknown
  track?: unknown
  squawk?: unknown
  dbFlags?: unknown
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length ? trimmed : null
}

/**
 * `dbFlags` is a bitfield in the ADSBExchange schema this feed follows, and
 * bit 0 is the military flag. Using it rather than guessing from the callsign
 * is the difference between a real signal and a regex that thinks every
 * flight starting "RCH" is a C-17 and every one that doesn't isn't.
 */
const MIL_FLAG = 1

function toAircraft(raw: RawAircraft): Aircraft | null {
  const hex = str(raw.hex)?.toLowerCase()
  const lat = num(raw.lat)
  const lon = num(raw.lon)
  // Without an identity and a position there is nothing to draw and nothing
  // to join a trail to.
  if (!hex || lat === null || lon === null) return null

  const onGround = raw.alt_baro === 'ground'
  const flags = num(raw.dbFlags) ?? 0

  return {
    hex,
    callsign: str(raw.flight),
    lat,
    lon,
    altitude: onGround ? null : num(raw.alt_baro),
    speed: num(raw.gs) ?? 0,
    track: num(raw.track) ?? -1,
    onGround,
    military: (flags & MIL_FLAG) !== 0,
    type: str(raw.t),
    registration: str(raw.r),
    squawk: str(raw.squawk),
  }
}

/**
 * Fetches one scope's worth of aircraft.
 *
 * Throws on a transport or status failure so the caller can decide whether to
 * serve a stale answer; returns an empty list only when the sky really is
 * empty, which over an ocean it legitimately is.
 */
export async function fetchAircraft(scope: Scope): Promise<Aircraft[]> {
  const res = await fetch(endpoint(scope), {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    // Cached by us, deliberately, rather than by Next's data cache: the
    // route holds one answer per scope in module memory and sets its own
    // CDN headers, which keeps the two caches from disagreeing about age.
    cache: 'no-store',
  })
  if (!res.ok) {
    // Worth quoting: this provider explains refusals in the body, and the
    // message is the difference between "no aircraft" and "not allowed".
    const why = await res.text().catch(() => '')
    throw new Error(`adsb.lol ${res.status}${why ? `: ${why.slice(0, 120).trim()}` : ''}`)
  }

  const body = await res.json()
  // The schema calls the array `ac`; older and adjacent implementations of the
  // same API have used `aircraft`. Accepting both costs one line and removes a
  // whole class of silent empty map.
  const rows: unknown = body?.ac ?? body?.aircraft
  if (!Array.isArray(rows)) return []

  const out: Aircraft[] = []
  for (const row of rows) {
    const parsed = toAircraft(row as RawAircraft)
    if (parsed) out.push(parsed)
  }
  return out
}
