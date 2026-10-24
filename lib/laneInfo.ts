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
