import { NextResponse } from 'next/server'
import { CAPTURE_MS, VESSEL_REVALIDATE, type Vessel, captureVessels, watchBoxes } from '@/lib/vessels'

/** A socket is not an edge thing, and neither is this. */
export const runtime = 'nodejs'
/** Room for the capture plus the handshake, and no more. */
export const maxDuration = 15

/**
 * Ships around the watched chokepoints, as of the last capture.
 *
 * Held briefly in the instance that took it so a burst of visitors shares one
 * listen rather than opening a socket each — AISStream allows three
 * connections per account, and the answer is the same for everyone anyway.
 * The CDN header does the rest.
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
      cached = { at: Date.now(), vessels }
      inFlight = null
      return vessels
    })
    await inFlight
  }

  return NextResponse.json(
    {
      vessels: cached?.vessels ?? [],
      configured: true,
      capturedAt: new Date(cached?.at ?? Date.now()).toISOString(),
      // Said so the client can be honest about what it is drawing: a sample
      // taken over a few seconds, not a continuous feed.
      captureMs: CAPTURE_MS,
      boxes: watchBoxes().length,
    },
    { headers: { 'Cache-Control': `s-maxage=${VESSEL_REVALIDATE}, stale-while-revalidate=30` } },
  )
}
