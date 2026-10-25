/**
 * What is happening around each air hub, worked out from the sky already on
 * screen.
 *
 * The counterpart of `lib/shipping.ts`, and it arrives at the same place by a
 * very different road. The shipping chokepoints are read from IMF PortWatch,
 * which publishes a daily transit count going back years, so a strait can be
 * measured against its own last year and a collapse is unmissable.
 *
 * ADS-B offers neither the history nor the budget. There is no record of what
 * a normal Tuesday at Frankfurt looks like, and — the part that decided the
 * design — adsb.lol states its limits in every response:
 *
 *     x-ratelimit-limit: 4, 4;w=1, 60;w=60, 500;w=86400
 *
 * Four a second, sixty a minute, and **five hundred a day**. The first
 * version of this file swept thirty hubs on a two-minute cycle, which is
 * 21,600 requests a day: forty times the entire daily allowance, for one
 * layer, on a feed donated by volunteers. It was measured doing it, and most
 * of the sweep came back `429` — which the first draft then recorded as
 * "nobody heard anything", so Paris and Frankfurt appeared as coverage holes
 * on an evening when a thousand aircraft were visible over the Low Countries.
 *
 * So nothing here fetches. The viewport query has already pulled every
 * aircraft on screen, and any hub inside that viewport can be read straight
 * out of the same list for free. The figures appear as you zoom into a part
 * of the world, which is also the only zoom at which they mean anything, and
 * the daily allowance is left for the traffic layer that genuinely needs it.
 *
 * What the figures say: within a hundred miles of a working airport there is
 * a stream of aircraft descending toward it and another climbing away,
 * roughly in balance. That balance is the thing worth watching — a ground
 * stop shows up as arrivals stacking with nothing leaving, long before
 * anybody announces it, and it shows up without knowing the airport's normal.
 *
 * It stays a snapshot, and `judge` below is deliberately reluctant about it.
 */
import type { Aircraft } from '@/lib/flights'
import { type AirHub, arcMiles } from '@/lib/airways'

/**
 * How far around a hub counts as its airspace, in nautical miles.
 *
 * A hundred is roughly where arrivals have left cruise and joined the
 * approach stream for a major airport, so it is the radius at which an
 * inbound count means "coming here" rather than "passing overhead".
 */
export const HUB_RADIUS_NM = 100

/**
 * Above this, an aircraft is crossing rather than arriving.
 *
 * Twenty-four thousand feet is below the airways over Europe and the Gulf and
 * above where anything is lining up for a runway a hundred miles out.
 */
const CRUISE_FT = 24_000

/** How wide a cone counts as pointed at, or away from, the field. */
const TOWARD = 50
const AWAY = 130

/** One aircraft on its way in, as the panel lists it. */
export interface Inbound {
  hex: string
  callsign: string | null
  type: string | null
  altitude: number | null
  /** Nautical miles from the field. */
  distance: number
}

/**
 * How much of the hub's own circle the current viewport actually covered.
 *
 * The whole reason this is honest rather than misleading. Reading a hub from
 * the viewport means the answer depends on where the viewport was: a map
 * showing the eastern half of Heathrow's circle finds half its traffic, and
 * reporting that as the hub's traffic would invent a collapse. So coverage is
 * measured and carried, the figures are only claimed when the circle is
 * essentially whole, and the panel says so when it is not.
 */
export type HubCover = 'full' | 'partial' | 'none'

export interface HubReading {
  id: string
  cover: HubCover
  total: number
  airborne: number
  onGround: number
  military: number
  /** Below cruise and pointed at the field. */
  inbound: number
  /** Below cruise and pointed away from it. */
  outbound: number
  /** At cruise overhead: crossing, not using the airport. */
  overflying: number
  /** The closest few inbound, nearest first. */
  arrivals: Inbound[]
  /** The commonest airframes in the circle, commonest first. */
  types: { code: string; count: number }[]
  /** What the balance says, when it says anything. */
  verdict: 'flowing' | 'arrivals-held' | 'departures-held' | 'quiet' | 'unknown'
}

/** Initial bearing from one point to another, in degrees true. */
function bearing(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const rad = Math.PI / 180
  const f1 = fromLat * rad
  const f2 = toLat * rad
  const dl = (toLon - fromLon) * rad
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/** The smaller angle between two bearings, 0 to 180. */
function angleBetween(a: number, b: number): number {
  return 180 - Math.abs(((a - b + 540) % 360) - 180)
}

/**
 * How much of a hub's circle lies inside a viewport.
 *
 * Approximated by the overlap of the circle's bounding box with the
 * viewport's, which is a little pessimistic at the corners and exactly right
 * where it matters — a hub well inside the view, and a hub half off the edge.
 */
export function coverOf(
  hub: AirHub,
  view: { north: number; south: number; east: number; west: number } | null,
): HubCover {
  if (!view) return 'none'
  const dLat = HUB_RADIUS_NM / 60
  const cos = Math.cos((hub.lat * Math.PI) / 180)
  const dLon = Math.abs(cos) < 1e-6 ? 180 : HUB_RADIUS_NM / 60 / cos

  // Longitudes are shifted into the viewport's own frame first, so a view
  // spanning the antimeridian is compared like any other.
  const shift = (lon: number) => {
    let v = lon
    while (v < view.west) v += 360
    while (v > view.west + 360) v -= 360
    return v
  }
  const east = view.east < view.west ? view.east + 360 : view.east
  const left = shift(hub.lon - dLon)
  const right = left + dLon * 2

  const lonIn = Math.min(right, east) - Math.max(left, view.west)
  const latIn =
    Math.min(hub.lat + dLat, view.north) - Math.max(hub.lat - dLat, view.south)
  if (lonIn <= 0 || latIn <= 0) return 'none'

  const share = (lonIn / (dLon * 2)) * (latIn / (dLat * 2))
  return share > 0.92 ? 'full' : 'partial'
}

/**
 * Reads one circle of sky into a hub's figures.
 *
 * `sky` is whatever the viewport pulled; anything outside the hub's own
 * radius is dropped here rather than by the caller, so the figures mean the
 * same thing however they were obtained.
 */
export function readHub(hub: AirHub, sky: Aircraft[], cover: HubCover): HubReading {
  const base: HubReading = {
    id: hub.id,
    cover,
    total: 0,
    airborne: 0,
    onGround: 0,
    military: 0,
    inbound: 0,
    outbound: 0,
    overflying: 0,
    arrivals: [],
    types: [],
    verdict: 'unknown',
  }
  if (cover === 'none') return base

  const arrivals: Inbound[] = []
  const typeCount = new Map<string, number>()

  for (const a of sky) {
    const distance = arcMiles(a.lat, a.lon, hub.lat, hub.lon)
    if (distance > HUB_RADIUS_NM) continue

    base.total++
    if (a.military) base.military++
    if (a.type) typeCount.set(a.type, (typeCount.get(a.type) ?? 0) + 1)

    if (a.onGround) {
      base.onGround++
      continue
    }
    base.airborne++

    if ((a.altitude ?? 0) >= CRUISE_FT) {
      base.overflying++
      continue
    }
    // No reported track is no direction to judge, so it counts toward
    // neither rather than being guessed into one.
    if (a.track < 0) continue

    const off = angleBetween(a.track, bearing(a.lat, a.lon, hub.lat, hub.lon))
    if (off <= TOWARD) {
      base.inbound++
      arrivals.push({
        hex: a.hex,
        callsign: a.callsign,
        type: a.type,
        altitude: a.altitude,
        distance,
      })
    } else if (off >= AWAY) {
      base.outbound++
    }
  }

  arrivals.sort((x, y) => x.distance - y.distance)
  base.arrivals = arrivals.slice(0, 6)

  base.types = [...typeCount.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 3)

  base.verdict = judge(base)
  return base
}

/**
 * What the arrival and departure streams add up to.
 *
 * Deliberately reluctant, in two ways. A circle only partly on screen is
 * never judged at all, because the missing half is indistinguishable from an
 * empty one. And below a handful of movements the ratio is noise — three in
 * and none out is a quiet hour, not a ground stop — so anything under `FLOOR`
 * is reported as quiet and nothing is claimed about it. Above it, a stream
 * running better than three to one against the other is the shape a hold has,
 * and that is as far as a snapshot can honestly go.
 */
const FLOOR = 8
const LOPSIDED = 3

function judge(r: HubReading): HubReading['verdict'] {
  if (r.cover !== 'full') return 'unknown'
  const moving = r.inbound + r.outbound
  if (moving < FLOOR) return 'quiet'
  if (r.outbound === 0 || r.inbound / Math.max(1, r.outbound) >= LOPSIDED) return 'arrivals-held'
  if (r.inbound === 0 || r.outbound / Math.max(1, r.inbound) >= LOPSIDED) return 'departures-held'
  return 'flowing'
}

/**
 * Reads every hub against one viewport's worth of sky.
 *
 * `only`, when given, is the set of hubs the sky was actually gathered
 * around — the wide-zoom case, where the layer asks for a circle about a few
 * hubs rather than for the whole viewport. Every other hub is then left
 * uncounted however much of its circle happens to be on screen, because the
 * aircraft near it were never requested and counting them would report a
 * busy airport as a shut one.
 */
export function readHubs(
  hubs: AirHub[],
  sky: Aircraft[],
  view: { north: number; south: number; east: number; west: number } | null,
  only?: Set<string> | null,
): Map<string, HubReading> {
  const out = new Map<string, HubReading>()
  for (const hub of hubs) {
    const cover = only && !only.has(hub.id) ? 'none' : coverOf(hub, view)
    out.set(hub.id, readHub(hub, sky, cover))
  }
  return out
}
