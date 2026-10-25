/**
 * What a shipping lane is, worked out from the line itself.
 *
 * The lanes dataset carries no names — three features, one per traffic tier,
 * and nothing else. So a lane cannot be looked up; it has to be described.
 * Everything here is derived from the geometry and the two things the app
 * already knows where to find: countries and chokepoints.
 *
 * That turns "some grey line" into "a secondary route, Spain to India, 4,800
 * nautical miles, through Suez and Bab el-Mandeb" — which is the actual
 * answer to what the line means, and it is in the line all along.
 */
import { COUNTRIES } from '@/lib/countries'
import { CHOKEPOINTS } from '@/lib/chokepoints'

/** Degrees from a lane vertex within which a chokepoint counts as threaded. */
const THREADS = 2.2
/**
 * Within this of a country's centre, an endpoint is just called that country.
 * Further out it is still described by the nearest coast, with the distance —
 * "640 nm off Portugal" says far more than "open sea", and the lanes end in
 * open water often enough that "open sea" on its own was most of them.
 */
const AT_COAST = 3.5

export interface LaneEnd {
  /** The nearest country to this end of the lane. */
  near: string
  /** How far off it, in nautical miles. Zero-ish means at the coast. */
  miles: number
}

export interface LaneRoute {
  tier: 'major' | 'middle' | 'minor'
  /** Great-circle length of the whole lane, nautical miles. */
  miles: number
  from: LaneEnd | null
  to: LaneEnd | null
  /** Chokepoints the lane threads, in the order it meets them. */
  via: string[]
}

/** How an endpoint should read: a country, or a distance off one. */
export function describeEnd(end: LaneEnd | null): string {
  if (!end) return 'open sea'
  return end.miles <= AT_COAST * 60 ? end.near : `${Math.round(end.miles)} nm off ${end.near}`
}

/** Nautical miles between two points. */
function miles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = bLat - aLat
  let dLon = bLon - aLon
  // The lanes cross the dateline; the short way round is the real distance.
  dLon -= 360 * Math.floor((dLon + 180) / 360)
  const mid = ((aLat + bLat) / 2 * Math.PI) / 180
  return Math.hypot(dLat, dLon * Math.cos(mid)) * 60
}

function nearestCountry(lat: number, lon: number): LaneEnd | null {
  let best: string | null = null
  let bestD = Infinity
  for (const c of COUNTRIES) {
    const d = miles(lat, lon, c.lat, c.lng)
    if (d < bestD) { bestD = d; best = c.name }
  }
  return best ? { near: best, miles: Math.round(bestD) } : null
}

export function describeLane(tier: LaneRoute['tier'], flat: number[]): LaneRoute {
  let total = 0
  for (let i = 2; i < flat.length; i += 2) {
    total += miles(flat[i - 1], flat[i - 2], flat[i + 1], flat[i])
  }

  // In path order and without repeats: a lane that runs along a strait passes
  // several of its vertices and should still name it once.
  const via: string[] = []
  for (let i = 0; i < flat.length; i += 2) {
    for (const c of CHOKEPOINTS) {
      if (via.includes(c.name)) continue
      if (Math.abs(flat[i + 1] - c.lat) <= THREADS && Math.abs(flat[i] - c.lon) <= THREADS) {
        via.push(c.name)
      }
    }
  }

  return {
    tier,
    miles: Math.round(total),
    from: nearestCountry(flat[1], flat[0]),
    to: nearestCountry(flat[flat.length - 1], flat[flat.length - 2]),
    via,
  }
}

/**
 * How far a point lies from a lane, in nautical miles.
 *
 * Point-to-segment rather than point-to-vertex: the lanes are stored as a few
 * dozen widely spaced points, so measuring to the nearest stored point would
 * put a ship sitting squarely on a leg tens of miles "off" it.
 */
function milesToLane(lat: number, lon: number, flat: number[]): number {
  let best = Infinity
  for (let i = 2; i < flat.length; i += 2) {
    const ax = flat[i - 2], ay = flat[i - 1]
    const bx = flat[i], by = flat[i + 1]
    // Longitude is squeezed by latitude before any of this, so the distance
    // is in comparable units north-south and east-west.
    const k = Math.cos((((ay + by) / 2) * Math.PI) / 180)
    const px = (lon - ax) * k, py = lat - ay
    const dx = (bx - ax) * k, dy = by - ay
    const len = dx * dx + dy * dy
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len))
    const d = Math.hypot(px - t * dx, py - t * dy) * 60
    if (d < best) best = d
  }
  return best
}

/** How close a ship has to be to count as being on the lane. */
export const ON_LANE_NM = 45

export interface LaneTraffic {
  /** Tracked ships within `ON_LANE_NM` of the lane. */
  count: number
  /** Of those, how many are making way. */
  moving: number
  /** Median speed of the ones making way, knots. */
  medianSpeed: number | null
  /** The largest few by length, for a sense of what uses it. */
  notable: { name: string; kind?: string; length?: number; speed: number }[]
}

/**
 * Which of the ships currently tracked are on this lane.
 *
 * Worth being clear about what this is not: it is not how busy the lane is.
 * The fleet is whatever AIS happened to be heard from around the chokepoints
 * in the last quarter of an hour, so a lane crossing an unwatched ocean shows
 * nothing however many ships are on it. It answers "of the ships I can
 * currently see, which are on this route", and the panel says so.
 */
export function laneTraffic(
  flat: number[],
  vessels: { name: string; lat: number; lon: number; speed: number; kind?: string; length?: number }[],
): LaneTraffic {
  const on = vessels.filter(v => milesToLane(v.lat, v.lon, flat) <= ON_LANE_NM)
  const making = on.filter(v => v.speed > 0.5)

  const speeds = making.map(v => v.speed).sort((a, b) => a - b)
  const medianSpeed = speeds.length
    ? Math.round(speeds[Math.floor(speeds.length / 2)] * 10) / 10
    : null

  const notable = [...on]
    .sort((a, b) => (b.length ?? 0) - (a.length ?? 0))
    .slice(0, 4)
    .map(v => ({ name: v.name, kind: v.kind, length: v.length, speed: v.speed }))

  return { count: on.length, moving: making.length, medianSpeed, notable }
}
