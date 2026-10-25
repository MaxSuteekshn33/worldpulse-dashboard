import { NextResponse } from 'next/server'
import {
  CAPTURE_MS,
  VESSEL_MEMORY,
  VESSEL_REVALIDATE,
  type Vessel,
  captureVessels,
  mergeCaptures,
  watchBoxes,
} from '@/lib/vessels'

/** A socket is not an edge thing, and neither is this. */
export const runtime = 'nodejs'
/** Room for the capture plus the handshake, and no more. */
export const maxDuration = 25

/**
 * Ships around the watched chokepoints, over the last few minutes.
 *
 * Held in the instance that took it so a burst of visitors shares one listen
 * rather than opening a socket each — AISStream allows three connections per
 * account, and the answer is the same for everyone anyway. The CDN header
 * does the rest.
 *
 * It accumulates rather than replacing. A single capture is a few seconds of
 * listening and returns whatever happened to transmit in that window — a few
 * dozen ships, scattered. Merging successive captures and letting each ship
 * go `VESSEL_MEMORY` after it was last heard gives several times as many for
 * the same listening, because the cost of a capture is the waiting, and that
 * has already been paid.
 */
let cached: { at: number; vessels: Vessel[] } | null = null
let inFlight: Promise<Vessel[]> | null = null

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

  const fresh = cached && Date.now() - cached.at < VESSEL_REVALIDATE * 1000
  if (!fresh) {
    // One capture at a time per instance; concurrent requests wait on it
    // rather than each opening their own socket.
    inFlight ??= captureVessels(key).then(vessels => {
      const merged = mergeCaptures(cached?.vessels ?? [], vessels)
      cached = { at: Date.now(), vessels: merged }
      inFlight = null
      return merged
    })
    await inFlight
  }

  return NextResponse.json(
    {
      vessels: cached?.vessels ?? [],
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
