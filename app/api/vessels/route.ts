import { NextResponse, after } from 'next/server'
import {
  CAPTURE_MS,
  COLD_CAPTURE_MS,
  VESSEL_MEMORY,
  VESSEL_REVALIDATE,
  type Vessel,
  captureVessels,
  mergeCaptures,
  stillFresh,
  watchBoxes,
} from '@/lib/vessels'

/** A socket is not an edge thing, and neither is this. */
export const runtime = 'nodejs'
/**
 * Room for the response plus the listening that follows it.
 *
 * Most of this budget is spent after the visitor has already been answered:
 * the refresh runs in `after`, which still counts against the invocation.
 */
export const maxDuration = 45

/**
 * Ships around the watched chokepoints, over the last few minutes.
 *
 * Held in the instance that took it so a burst of visitors shares one listen
 * rather than opening a socket each — AISStream allows three connections per
 * account, and the answer is the same for everyone anyway. The CDN header
 * does the rest.
 *
 * It accumulates rather than replacing. A single capture returns whatever
 * happened to transmit during it — a few dozen ships, scattered — and
 * successive captures hear mostly different ships, so merging them and
 * letting each go `VESSEL_MEMORY` after it was last heard is worth several
 * times the listening.
 */
let cached: { at: number; vessels: Vessel[] } | null = null
let inFlight: Promise<Vessel[]> | null = null

function refresh(key: string, ms: number): Promise<Vessel[]> {
  // One capture at a time per instance; a second caller joins the first
  // rather than opening its own socket.
  inFlight ??= captureVessels(key, ms)
    .then(fresh => {
      const merged = mergeCaptures(cached?.vessels ?? [], fresh)
      cached = { at: Date.now(), vessels: merged }
      return merged
    })
    // A refused or dropped socket is not a reason to lose the fleet.
    .catch(() => cached?.vessels ?? [])
    .finally(() => { inFlight = null })

  return inFlight
}

export async function GET() {
  const key = process.env.AISSTREAM_KEY

  if (!key) {
    // Not an error: the rest of the shipping layer works without this, and
    // saying so plainly is better than an empty list that looks like calm seas.
    return NextResponse.json(
      {
        vessels: [],
        configured: false,
        reason: 'AISSTREAM_KEY is not set',
        boxes: watchBoxes().length,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (!cached) {
    // Nothing to show yet, so this one visitor does have to wait — but only
    // for the short window, because they are waiting on an empty sea.
    await refresh(key, COLD_CAPTURE_MS)
  } else if (Date.now() - cached.at >= VESSEL_REVALIDATE * 1000) {
    /**
     * Everyone after the first is answered immediately and the listening
     * happens afterwards.
     *
     * This is what makes a long capture affordable. While the refresh sat on
     * the request path, the window was bounded by how long it seemed fair to
     * make someone stare at an empty map — about ten seconds — and yield is
     * close to linear in the window. Moved behind the response, nobody is
     * waiting on it at all, so it can run more than twice as long and the
     * next visitor gets the benefit.
     */
    after(() => refresh(key, CAPTURE_MS))
  }

  // Aged here rather than only at merge time: a pool whose refreshes stall
  // would otherwise keep being served exactly as it was, however old it got.
  const vessels = stillFresh(cached?.vessels ?? [])

  return NextResponse.json(
    {
      vessels,
      configured: true,
      capturedAt: new Date(cached?.at ?? Date.now()).toISOString(),
      // Said so the client can be honest about what it is drawing: ships
      // heard over the last few minutes, not a continuous feed and not a
      // census of what is at sea.
      captureMs: CAPTURE_MS,
      memorySeconds: VESSEL_MEMORY,
      boxes: watchBoxes().length,
    },
    { headers: { 'Cache-Control': `s-maxage=${VESSEL_REVALIDATE}, stale-while-revalidate=30` } },
  )
}
