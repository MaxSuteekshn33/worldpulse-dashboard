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
 * The chokepoints worth watching: all of them.
 *
 * It was nine, on the reasoning that every extra box widens the firehose and
 * a news dashboard wants the straits that turn up in the news. Measured, the
 * firehose barely widens — at a fixed window, twenty-eight boxes returned 54
 * vessels against the nine boxes' 38 to 52, because the limit is how fast the
 * stream sends rather than how much is subscribed to. What twenty-eight does
 * buy is coverage: ships off Lombok, Magellan and the Yucatan, instead of a
 * map with nine populated spots and empty ocean everywhere else.
 */
const WATCHED = new Set(CHOKEPOINTS.map(c => c.id))

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

/**
 * How long to listen.
 *
 * Yield is close to linear in this: measured over the same boxes, 7 seconds
 * returned 52 vessels, 14 returned 86 and 22 returned 144. The obvious move
 * is therefore to listen for much longer, and the reason not to is that the
 * capture blocks the request — whoever asks first waits out the whole window
 * staring at an empty sea.
 *
 * So the window stays short and `VESSEL_MEMORY` does the work instead: ten
 * seconds is a modest wait for the first visitor, and successive captures
 * accumulate rather than replacing each other.
 */
export const CAPTURE_MS = 10000

/**
 * How long a vessel stays on the map after it was last heard, in seconds.
 *
 * The capture is a few seconds of listening, so one on its own shows the
 * ships that happened to transmit in that window — a few dozen, scattered.
 * Four minutes of them, merged by MMSI, is several times that and is a much
 * fairer picture of what is actually at sea, because a ship that reported
 * three minutes ago has not gone anywhere: at 15 knots it has moved three
 * quarters of a mile, and it is carried forward along its own course anyway.
 *
 * Four minutes rather than longer because the error grows with the gap and
 * because a ship really can stop reporting — out of range, or transponder
 * off, which off Hormuz is itself the story. Past this it is dropped rather
 * than drawn somewhere it may no longer be.
 */
export const VESSEL_MEMORY = 240

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
  /**
   * When this fix was heard, as epoch milliseconds.
   *
   * Per vessel rather than one timestamp for the whole answer, because the
   * answer is no longer one capture: it is up to four minutes of them, and
   * carrying a ship heard three minutes ago forward by the age of the newest
   * capture would leave it a mile behind where it should be drawn.
   */
  seenAt: number
  lat: number
  lon: number
  /** Course over ground, degrees clockwise from north. */
  course: number
  /** Speed over ground, knots. */
  speed: number
  /**
   * Where the ship says it is going, and what it is.
   *
   * These ride on a different AIS message from the position — static data is
   * broadcast every few minutes rather than every few seconds — so a vessel
   * seen only briefly may have a position and nothing else. Optional for that
   * reason, not because they are unimportant: "where is it going" is the first
   * thing anyone asks of a ship on a map.
   */
  destination?: string
  kind?: string
  /** Metres, from the AIS dimension fields. */
  length?: number
}

/**
 * What a ship is, from the AIS type code.
 *
 * The codes are banded: the tens digit is the category and the units digit is
 * usually a cargo hazard class nobody needs here.
 */
export function shipKind(type: number | undefined): string | undefined {
  if (typeof type !== 'number' || type <= 0) return undefined
  if (type >= 80 && type <= 89) return 'Tanker'
  if (type >= 70 && type <= 79) return 'Cargo'
  if (type >= 60 && type <= 69) return 'Passenger'
  if (type >= 40 && type <= 49) return 'High-speed craft'
  if (type === 30) return 'Fishing'
  if (type === 31 || type === 32 || type === 52) return 'Tug'
  if (type === 35) return 'Military'
  if (type === 36) return 'Sailing'
  if (type === 37) return 'Pleasure craft'
  if (type === 50) return 'Pilot'
  if (type === 51) return 'Search and rescue'
  if (type === 55) return 'Law enforcement'
  if (type >= 33 && type <= 34) return 'Dredger'
  return 'Other'
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
  Message?: {
    PositionReport?: { Cog?: number; Sog?: number; UserID?: number; Latitude?: number; Longitude?: number }
    ShipStaticData?: {
      UserID?: number
      Destination?: string
      Type?: number
      Dimension?: { A?: number; B?: number; C?: number; D?: number }
    }
  }
}

/** The slower-moving half of a ship's story: what it is and where it is bound. */
export interface ShipFacts {
  destination?: string
  kind?: string
  length?: number
}

/**
 * What we know about ships, kept between captures.
 *
 * Static data is broadcast every few minutes while positions come every few
 * seconds, so a single seven-second window almost never catches both for the
 * same vessel — measured, 4 of 48 static senders also sent a position in the
 * same window. Asking each capture to identify its own ships therefore fails
 * almost always, which is why nothing had a destination.
 *
 * Remembering instead costs nothing and fills in: a ship identified on one
 * capture stays identified on the next. The cap is a safeguard, not a tuning
 * knob — this is a few dozen bytes a ship and it only grows while someone is
 * watching.
 */
const KNOWN = new Map<number, ShipFacts>()
const KNOWN_CAP = 5000

function remember(mmsi: number, facts: ShipFacts) {
  // Nothing useful arrived, so do not displace something that did.
  if (!facts.destination && !facts.kind && !facts.length) return
  if (KNOWN.size >= KNOWN_CAP) {
    const oldest = KNOWN.keys().next().value
    if (oldest !== undefined) KNOWN.delete(oldest)
  }
  KNOWN.set(mmsi, { ...KNOWN.get(mmsi), ...facts })
}

/** Pulls the static details out of a frame, or null if it carries none. */
export function readShipStatic(raw: RawMessage): { mmsi: number; facts: ShipFacts } | null {
  if (raw.MessageType !== 'ShipStaticData') return null
  const d = raw.Message?.ShipStaticData
  const mmsi = d?.UserID ?? raw.MetaData?.MMSI
  if (!d || typeof mmsi !== 'number') return null

  // AIS gives the hull as distances from the transponder to bow, stern and
  // each side; bow plus stern is the length.
  const bow = d.Dimension?.A
  const stern = d.Dimension?.B
  const length = typeof bow === 'number' && typeof stern === 'number' ? bow + stern : undefined

  // Destinations are free text typed by crews: padded, sometimes '@@@@', often
  // shouted. Anything that is not letters and a few separators is not a place.
  const raw_dest = (d.Destination ?? '').replace(/[@_]+/g, ' ').trim()
  const destination = /[A-Za-z]{2}/.test(raw_dest) ? raw_dest.slice(0, 40) : undefined

  return {
    mmsi,
    facts: {
      destination,
      kind: shipKind(d.Type),
      length: length && length > 0 ? length : undefined,
    },
  }
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
    // Replaced by the capture with the moment it was actually heard.
    seenAt: 0,
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
    // Static data arrives on its own schedule, minutes apart, so it is kept
    // separately and folded in at the end rather than waited for.
    const facts = new Map<number, ShipFacts>()
    let socket: WebSocket | null = null
    let done = false

    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try { socket?.close() } catch { /* already gone */ }
      const watched = CHOKEPOINTS.filter(c => WATCHED.has(c.id)).map(c => ({ lat: c.lat, lon: c.lon }))
      // This capture's own static data first, then anything learned earlier.
      const merged = [...seen.values()].map(v => ({
        ...v,
        ...(KNOWN.get(v.mmsi) ?? {}),
        ...(facts.get(v.mmsi) ?? {}),
      }))
      resolve(merged.filter(v => worthDrawing(v, watched)))
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
        // Positions say where; static data says what and where bound. Both,
        // because a dot you cannot ask anything about is not a tracker.
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }))
    }

    socket.onmessage = event => {
      try {
        const text = typeof event.data === 'string'
          ? event.data
          : decoder.decode(event.data as ArrayBuffer)
        const frame = JSON.parse(text)
        const vessel = readPositionReport(frame)
        // Last position wins: a vessel reporting twice in the window has
        // moved, and the newer fix is the one to draw.
        // Stamped here rather than in the parser, which stays pure: the
        // feed's own `time_utc` is a Go-formatted string that `Date.parse`
        // does not reliably read, and within a ten-second window the
        // difference does not matter.
        if (vessel) { seen.set(vessel.mmsi, { ...vessel, seenAt: Date.now() }); return }
        const stat = readShipStatic(frame)
        if (stat) { facts.set(stat.mmsi, stat.facts); remember(stat.mmsi, stat.facts) }
      } catch { /* a frame we cannot read is not a reason to lose the rest */ }
    }

    socket.onerror = finish
    socket.onclose = finish
  })
}

/**
 * Folds a fresh capture into what is already known, dropping what has gone
 * stale.
 *
 * Newest fix per MMSI wins, so a ship heard again this capture moves rather
 * than appearing twice. Everything last heard more than `VESSEL_MEMORY` ago
 * is let go — this is the only thing keeping the pool from growing all day
 * and the map from filling with ships that stopped reporting hours earlier.
 */
export function mergeCaptures(
  held: Vessel[],
  fresh: Vessel[],
  now = Date.now(),
): Vessel[] {
  const pool = new Map<number, Vessel>()
  for (const v of held) pool.set(v.mmsi, v)
  for (const v of fresh) {
    const prior = pool.get(v.mmsi)
    if (!prior || v.seenAt >= prior.seenAt) pool.set(v.mmsi, v)
  }

  const cutoff = now - VESSEL_MEMORY * 1000
  return [...pool.values()].filter(v => v.seenAt >= cutoff)
}
