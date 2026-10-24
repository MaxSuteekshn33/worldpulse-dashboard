/**
 * Live vessel positions, captured in bursts from AISStream.
 *
 * AIS has no free REST feed. AISStream gives the data away but only over a
 * WebSocket, and a serverless function cannot hold one open — so this does not
 * try to. It opens a socket, listens for a few seconds, closes, and caches
 * what it heard. A burst, not a stream.
 *
 * That is a real trade and worth being clear about: these are the ships that
 * happened to transmit during the window, not every ship present. In a busy
 * strait a few seconds is plenty, because vessels report every few seconds and
 * the chokepoints are dense. In an empty one it will return very little, which
 * is the honest answer anyway.
 *
 * The alternative is an always-on relay holding the socket permanently and
 * writing to a store the app reads. That is genuinely continuous and it is a
 * second deployment to run; this needs nothing but the key.
 *
 * Constraints that shaped this, from AISStream's own documentation:
 *   - the subscription must be sent within 3 seconds of connecting
 *   - 3 subscribed connections per account, 3 per originating IP
 *   - browser connections are refused outright, so this can only be server-side
 *   - slow readers have their buffered messages dropped, so the boxes are
 *     narrow on purpose rather than one box around the world
 */
import { CHOKEPOINTS } from '@/lib/chokepoints'

const ENDPOINT = 'wss://stream.aisstream.io/v0/stream'

/**
 * The chokepoints worth watching.
 *
 * Not all 28: every extra box widens the firehose, and a dashboard about the
 * news wants the straits that turn up in it. These are the ones whose traffic
 * is a story when it changes.
 */
const WATCHED = new Set([
  'chokepoint1',  // Suez Canal
  'chokepoint2',  // Panama Canal
  'chokepoint3',  // Bosporus
  'chokepoint4',  // Bab el-Mandeb
  'chokepoint5',  // Malacca
  'chokepoint6',  // Hormuz
  'chokepoint8',  // Gibraltar
  'chokepoint9',  // Dover
  'chokepoint11', // Taiwan
])

/**
 * Half-width of each watch box, in degrees.
 *
 * Measured, not guessed. Yield turns out to depend far more on how wide the
 * boxes are than on how long the capture runs — across the nine boxes, at a
 * fixed 4.2 seconds, ±1.3 degrees returned 3 vessels and ±2.5 returned 11;
 * widening to ±4 over 8 seconds returned 144. Narrow boxes were starving the
 * capture, not the clock.
 *
 * Four degrees is about 440km, so this takes in the approaches as well as the
 * strait itself — which is the more useful picture anyway: ships queueing to
 * enter Hormuz are part of what is happening at Hormuz.
 */
const BOX = 4.0

/** How long to listen. Long enough to fill a busy strait, short enough to sit
 *  inside a serverless invocation with room to spare. */
export const CAPTURE_MS = 7000

/**
 * How close to a chokepoint a vessel has to be to count while stopped.
 *
 * The boxes have to be wide to catch anything, and wide boxes catch things
 * that are not shipping: at four degrees the Dover box reaches Paris, and the
 * capture came back full of Seine tour boats sitting at zero knots. But a ship
 * stopped *at* a chokepoint is the opposite of noise — a queue off Hormuz is
 * the whole story — so stillness alone cannot be the test.
 *
 * So: under way anywhere in the box, or stopped close in. That keeps Channel
 * traffic and anchored queues and drops the moored river boats.
 */
const ANCHORED_RANGE = 1.5
/** Knots. Below this a vessel is not going anywhere. */
const UNDER_WAY = 0.5

/** How long a capture is served before another is taken. */
export const VESSEL_REVALIDATE = 45

/** True for a vessel worth drawing on a chokepoint map. */
export function worthDrawing(v: Vessel, points: { lat: number; lon: number }[]): boolean {
  if (v.speed >= UNDER_WAY) return true
  return points.some(
    c => Math.abs(v.lat - c.lat) <= ANCHORED_RANGE && Math.abs(v.lon - c.lon) <= ANCHORED_RANGE,
  )
}

export interface Vessel {
  mmsi: number
  name: string
  lat: number
  lon: number
  /** Course over ground, degrees clockwise from north. */
  course: number
  /** Speed over ground, knots. */
  speed: number
}

/** `[[[north, west], [south, east]], ...]` — AISStream's own corner order. */
export function watchBoxes(): number[][][] {
  return CHOKEPOINTS
    .filter(c => WATCHED.has(c.id))
    .map(c => [
      [c.lat + BOX, c.lon - BOX],
      [c.lat - BOX, c.lon + BOX],
    ])
}

interface RawMessage {
  MessageType?: string
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; Latitude?: number; Longitude?: number }
  Message?: { PositionReport?: { Cog?: number; Sog?: number; UserID?: number; Latitude?: number; Longitude?: number } }
}

/**
 * Pulls one vessel out of a raw frame, or null if it is not a usable position.
 *
 * Exported so it can be exercised without a socket: the one part of this with
 * real logic in it is the part that cannot be reached by running the route.
 */
export function readPositionReport(raw: RawMessage): Vessel | null {
  if (raw.MessageType !== 'PositionReport') return null
  const meta = raw.MetaData ?? {}
  const report = raw.Message?.PositionReport ?? {}

  // The documentation shows coordinates on the metadata and the schema
  // explorer also lists them on the report itself, so take whichever is there.
  const lat = meta.Latitude ?? meta.latitude ?? report.Latitude
  const lon = meta.Longitude ?? meta.longitude ?? report.Longitude
  const mmsi = meta.MMSI ?? report.UserID
  if (typeof lat !== 'number' || typeof lon !== 'number' || typeof mmsi !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  // 360 means "not available" for course, and 102.3 is the not-available
  // speed; both would otherwise be drawn as a real heading or a racing ship.
  const cog = report.Cog
  const sog = report.Sog

  return {
    mmsi,
    name: (meta.ShipName ?? '').trim() || 'Unknown vessel',
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    course: typeof cog === 'number' && cog >= 0 && cog < 360 ? Math.round(cog) : -1,
    speed: typeof sog === 'number' && sog >= 0 && sog < 102 ? Math.round(sog * 10) / 10 : -1,
  }
}

/**
 * Listens for `ms` and returns the latest position heard for each vessel.
 *
 * Uses the runtime's own WebSocket — stable in Node 22, which is what this
 * deploys onto — rather than pulling in a library for one socket.
 */
export function captureVessels(apiKey: string, ms = CAPTURE_MS): Promise<Vessel[]> {
  const decoder = new TextDecoder()
  return new Promise(resolve => {
    const seen = new Map<number, Vessel>()
    let socket: WebSocket | null = null
    let done = false

    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try { socket?.close() } catch { /* already gone */ }
      const watched = CHOKEPOINTS.filter(c => WATCHED.has(c.id))
      resolve([...seen.values()].filter(v => worthDrawing(v, watched.map(c => ({ lat: c.lat, lon: c.lon })))))
    }

    // The only hard deadline: whatever happens to the socket, the route
    // answers. A capture that hangs would take the whole request with it.
    const timer = setTimeout(finish, ms)

    try {
      socket = new WebSocket(ENDPOINT)
      // AISStream sends binary frames. Left alone, the runtime hands them
      // over as Blobs, which cannot be read synchronously — and stringifying
      // one gives the literal "[object Blob]", which parses as nothing. That
      // failure is silent by construction, since an unreadable frame is
      // caught and skipped, so the capture returned zero vessels while
      // happily receiving hundreds of messages. Asking for ArrayBuffers
      // instead makes them decodable where they arrive.
      socket.binaryType = 'arraybuffer'
    } catch {
      finish()
      return
    }

    socket.onopen = () => {
      // Within 3 seconds of opening, or the connection is dropped.
      socket?.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: watchBoxes(),
        FilterMessageTypes: ['PositionReport'],
      }))
    }

    socket.onmessage = event => {
      try {
        const text = typeof event.data === 'string'
          ? event.data
          : decoder.decode(event.data as ArrayBuffer)
        const vessel = readPositionReport(JSON.parse(text))
        // Last position wins: a vessel reporting twice in the window has
        // moved, and the newer fix is the one to draw.
        if (vessel) seen.set(vessel.mmsi, vessel)
      } catch { /* a frame we cannot read is not a reason to lose the rest */ }
    }

    socket.onerror = finish
    socket.onclose = finish
  })
}
