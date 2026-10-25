/**
 * The world's air hubs and the corridors between them.
 *
 * What `lib/chokepoints.ts` and `lib/lanes.ts` are to the shipping layer.
 * Shipping has twenty-eight straits that everything has to squeeze through;
 * aviation's equivalent is not a strait but an airport, because that is where
 * the capacity actually binds — a corridor can always be flown around, a slot
 * at Heathrow cannot.
 *
 * Hand-written rather than generated, unlike the shipping geometry. There is
 * no public dataset of "the airports that matter" to generate from: the
 * passenger and freight rankings disagree with each other and both disagree
 * with which airspace is worth watching. ANC and KEF are on this list because
 * of what crosses them, not how many people pass through them.
 *
 * Coordinates are the airport reference points, to four decimals — about ten
 * metres, which is far finer than anything drawn at this scale needs, but
 * they are also what the live radius query is centred on.
 *
 * A warning that the UI has to carry: ADS-B coverage is volunteer receivers,
 * not satellites. It is dense over Europe and North America, thin over much
 * of Africa and central Asia, and close to absent over mainland China. A hub
 * here reporting nothing means nobody nearby is listening, which is not the
 * same as an empty sky, and `lib/airspace.ts` keeps the two apart rather than
 * letting a coverage hole read as a quiet airport.
 */

export interface AirHub {
  /** IATA code. Short, known, and unique across this list. */
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  /** Why it is on the list, in a few words. Shown in the tooltip. */
  role: string
}

export const HUBS: AirHub[] = [
  // North America
  { id: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'United States', lat: 33.6407, lon: -84.4277, role: 'Busiest passenger airport' },
  { id: 'ORD', name: "O'Hare", city: 'Chicago', country: 'United States', lat: 41.9742, lon: -87.9073, role: 'Central US connecting hub' },
  { id: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'United States', lat: 33.9416, lon: -118.4085, role: 'Trans-Pacific gateway' },
  { id: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'United States', lat: 40.6413, lon: -73.7781, role: 'North Atlantic gateway' },
  { id: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canada', lat: 43.6777, lon: -79.6248, role: 'Largest Canadian hub' },
  { id: 'MEX', name: 'Benito Juárez', city: 'Mexico City', country: 'Mexico', lat: 19.4363, lon: -99.0721, role: 'Largest Latin American hub' },
  { id: 'ANC', name: 'Ted Stevens', city: 'Anchorage', country: 'United States', lat: 61.1743, lon: -149.9982, role: 'Trans-Pacific freight stop' },

  // South America
  { id: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731, role: 'Largest South American hub' },
  { id: 'BOG', name: 'El Dorado', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469, role: 'Andean freight hub' },

  // Europe
  { id: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', lat: 51.47, lon: -0.4543, role: 'Busiest two-runway airport' },
  { id: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479, role: 'Largest continental hub' },
  { id: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lon: 4.7683, role: 'European transfer hub' },
  { id: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lon: 8.5622, role: 'European freight hub' },
  { id: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Spain', lat: 40.4722, lon: -3.5608, role: 'South Atlantic gateway' },
  { id: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'Türkiye', lat: 41.2753, lon: 28.7519, role: 'Europe-Asia crossroads' },
  { id: 'KEF', name: 'Keflavík', city: 'Reykjavík', country: 'Iceland', lat: 63.985, lon: -22.6056, role: 'North Atlantic track entry' },
  { id: 'SVO', name: 'Sheremetyevo', city: 'Moscow', country: 'Russia', lat: 55.9726, lon: 37.4146, role: 'Largest Russian hub' },

  // Middle East
  { id: 'DXB', name: 'Dubai', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2532, lon: 55.3657, role: 'Busiest international airport' },
  { id: 'DOH', name: 'Hamad', city: 'Doha', country: 'Qatar', lat: 25.2731, lon: 51.608, role: 'Gulf long-haul hub' },
  { id: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel', lat: 32.0114, lon: 34.8867, role: 'Eastern Mediterranean hub' },

  // Africa
  { id: 'CAI', name: 'Cairo', city: 'Cairo', country: 'Egypt', lat: 30.1219, lon: 31.4056, role: 'North African hub' },
  { id: 'JNB', name: 'O. R. Tambo', city: 'Johannesburg', country: 'South Africa', lat: -26.1392, lon: 28.246, role: 'Largest African hub' },
  { id: 'ADD', name: 'Bole', city: 'Addis Ababa', country: 'Ethiopia', lat: 8.9779, lon: 38.7993, role: 'Sub-Saharan connecting hub' },

  // Asia
  { id: 'DEL', name: 'Indira Gandhi', city: 'Delhi', country: 'India', lat: 28.5562, lon: 77.1, role: 'Largest South Asian hub' },
  { id: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915, role: 'Southeast Asian hub' },
  { id: 'HKG', name: 'Hong Kong', city: 'Hong Kong', country: 'Hong Kong', lat: 22.308, lon: 113.9185, role: 'Busiest cargo airport' },
  { id: 'PVG', name: 'Pudong', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083, role: 'Chinese freight gateway' },
  { id: 'ICN', name: 'Incheon', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407, role: 'Northeast Asian hub' },
  { id: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', lat: 35.5494, lon: 139.7798, role: 'Busiest Japanese airport' },

  // Oceania
  { id: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9399, lon: 151.1753, role: 'Largest Australian hub' },
]

/** Lookup by code, for corridors and for the detail panel. */
export const HUB_BY_ID = new Map(HUBS.map(h => [h.id, h]))

/**
 * The corridors between them.
 *
 * Not published airways — those are a national-airspace concept with tens of
 * thousands of segments and no global registry. These are the long-haul
 * city pairs that carry the traffic, which is the honest level of detail for
 * a world map and the same one `lib/lanes.ts` works at for the sea.
 *
 * `tier` reads the way the shipping lanes do: the trunk routes draw brightest.
 */
export interface Corridor {
  a: string
  b: string
  tier: 'major' | 'middle' | 'minor'
  /** What the corridor is called, where it has a name of its own. */
  label?: string
}

export const CORRIDORS: Corridor[] = [
  { a: 'JFK', b: 'LHR', tier: 'major', label: 'North Atlantic Tracks' },
  { a: 'JFK', b: 'CDG', tier: 'major' },
  { a: 'FRA', b: 'JFK', tier: 'major' },
  { a: 'KEF', b: 'JFK', tier: 'minor' },
  { a: 'YYZ', b: 'LHR', tier: 'middle' },
  { a: 'LHR', b: 'DXB', tier: 'major', label: 'Europe-Gulf trunk' },
  { a: 'FRA', b: 'DXB', tier: 'middle' },
  { a: 'DXB', b: 'SIN', tier: 'major' },
  { a: 'DXB', b: 'DEL', tier: 'major' },
  { a: 'DOH', b: 'LHR', tier: 'middle' },
  { a: 'SIN', b: 'SYD', tier: 'major', label: 'Kangaroo route' },
  { a: 'SIN', b: 'HKG', tier: 'major' },
  { a: 'HKG', b: 'LHR', tier: 'middle', label: 'Siberian corridor' },
  { a: 'HND', b: 'LAX', tier: 'major', label: 'Trans-Pacific' },
  { a: 'ICN', b: 'LAX', tier: 'middle' },
  { a: 'PVG', b: 'LAX', tier: 'middle', label: 'Pacific freight' },
  { a: 'ANC', b: 'ICN', tier: 'middle', label: 'Polar freight' },
  { a: 'ANC', b: 'ORD', tier: 'minor' },
  { a: 'SYD', b: 'LAX', tier: 'middle' },
  { a: 'IST', b: 'FRA', tier: 'middle' },
  { a: 'SVO', b: 'IST', tier: 'minor' },
  { a: 'CAI', b: 'IST', tier: 'minor' },
  { a: 'TLV', b: 'FRA', tier: 'minor' },
  { a: 'GRU', b: 'MAD', tier: 'middle', label: 'South Atlantic' },
  { a: 'GRU', b: 'JFK', tier: 'middle' },
  { a: 'BOG', b: 'MEX', tier: 'minor' },
  { a: 'MEX', b: 'LAX', tier: 'middle' },
  { a: 'JNB', b: 'LHR', tier: 'middle' },
  { a: 'JNB', b: 'ADD', tier: 'minor' },
  { a: 'ADD', b: 'DXB', tier: 'minor' },
  { a: 'DEL', b: 'SIN', tier: 'middle' },
  { a: 'ATL', b: 'LHR', tier: 'middle' },
  { a: 'ORD', b: 'FRA', tier: 'middle' },
  { a: 'AMS', b: 'JFK', tier: 'middle' },
]

/** Which corridor, in a form that survives being put in React state. */
export interface CorridorRef {
  index: number
}

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

/**
 * The great circle between two points, as points to draw.
 *
 * Aircraft fly these and shipping lanes do not, which is why this is computed
 * rather than stored: the straight line between Tokyo and Los Angeles on a
 * Mercator map runs through the middle of the Pacific, and the route actually
 * flown goes a thousand miles north of it, up past the Aleutians. Drawing the
 * straight line would be drawing a route nobody takes.
 *
 * Spherical interpolation, so the points come out evenly spaced along the arc.
 * Longitudes are left to run past 180 where the arc crosses the antimeridian —
 * the steps are small enough that both the map and the globe join consecutive
 * points the short way round, which is the way the arc actually goes.
 */
export function greatCircle(
  aLat: number, aLon: number,
  bLat: number, bLon: number,
  steps = 64,
): { lat: number; lon: number }[] {
  const φ1 = aLat * RAD, λ1 = aLon * RAD
  const φ2 = bLat * RAD, λ2 = bLon * RAD

  const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1)
  const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2)

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))
  const arc = Math.acos(dot)
  // Antipodal or coincident: there is no unique arc, and nothing worth drawing.
  if (!Number.isFinite(arc) || arc < 1e-9) return [{ lat: aLat, lon: aLon }, { lat: bLat, lon: bLon }]

  const sin = Math.sin(arc)
  const out: { lat: number; lon: number }[] = []
  let prevLon = aLon

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ka = Math.sin((1 - t) * arc) / sin
    const kb = Math.sin(t * arc) / sin
    const x = ka * x1 + kb * x2
    const y = ka * y1 + kb * y2
    const z = ka * z1 + kb * z2

    const lat = Math.atan2(z, Math.hypot(x, y)) * DEG
    let lon = Math.atan2(y, x) * DEG
    // Unwrapped against the point before it, so a crossing of the
    // antimeridian comes out as 181 rather than jumping to -179 and drawing
    // a line all the way back across the map.
    while (lon - prevLon > 180) lon -= 360
    while (prevLon - lon > 180) lon += 360
    prevLon = lon

    out.push({ lat, lon })
  }

  return out
}

/** Great-circle distance in nautical miles. */
export function arcMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const φ1 = aLat * RAD, φ2 = bLat * RAD
  const dφ = φ2 - φ1
  const dλ = (bLon - aLon) * RAD
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  // Earth's mean radius in nautical miles.
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 3440.065
}

/** The drawable path of one corridor, or null if either end is unknown. */
export function corridorPath(c: Corridor): { lat: number; lon: number }[] | null {
  const a = HUB_BY_ID.get(c.a)
  const b = HUB_BY_ID.get(c.b)
  if (!a || !b) return null
  return greatCircle(a.lat, a.lon, b.lat, b.lon)
}

/** What a corridor is called, for a panel heading or a tooltip. */
export function corridorName(c: Corridor): string {
  const a = HUB_BY_ID.get(c.a)
  const b = HUB_BY_ID.get(c.b)
  return c.label ?? `${a?.city ?? c.a} — ${b?.city ?? c.b}`
}
