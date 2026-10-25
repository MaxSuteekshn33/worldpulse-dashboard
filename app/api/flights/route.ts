import { NextResponse } from 'next/server'
import {
  FLIGHT_REVALIDATE,
  type Aircraft,
  type Scope,
  fetchAircraft,
  scopeFromParams,
  scopeKey,
} from '@/lib/flights'

/** Plain `fetch` against a third party, so there is nothing to gain at the edge. */
export const runtime = 'nodejs'
/** One upstream request with room for a slow one, and no more. */
export const maxDuration = 15

/**
 * Aircraft in a quantized viewport, or the worldwide military feed.
 *
 * Held per scope in the instance that fetched it, for the same reason the
 * vessel route holds its capture: a burst of visitors looking at the same part
 * of the world should cost adsb.lol one request, not one each. The CDN header
 * does the rest, and because `quantizeScope` rounds the viewport before it
 * becomes a URL, "the same part of the world" is a cheap thing to be.
 *
 * Unbounded growth is not a risk worth code here — the grid is coarse enough
 * that the whole globe is a few hundred possible keys, each a few hundred
 * aircraft, and a serverless instance is recycled long before that matters.
 */
const cached = new Map<string, { at: number; aircraft: Aircraft[] }>()
const inFlight = new Map<string, Promise<Aircraft[]>>()

async function load(scope: Scope, key: string): Promise<Aircraft[]> {
  const held = cached.get(key)
  if (held && Date.now() - held.at < FLIGHT_REVALIDATE * 1000) return held.aircraft

  let pending = inFlight.get(key)
  if (!pending) {
    pending = fetchAircraft(scope)
      .then(aircraft => {
        cached.set(key, { at: Date.now(), aircraft })
        return aircraft
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, pending)
  }

  try {
    return await pending
  } catch {
    // A donated feed under load is allowed to refuse. Last known positions
    // with an honest `fetchedAt` are far better than an empty sky, which on
    // this layer reads as "nothing is flying" rather than "we don't know".
    if (held) return held.aircraft
    throw new Error('upstream unavailable')
  }
}

export async function GET(request: Request) {
  const scope = scopeFromParams(new URL(request.url).searchParams)
  const key = scopeKey(scope)

  try {
    const aircraft = await load(scope, key)
    const held = cached.get(key)

    return NextResponse.json(
      {
        aircraft,
        scope: key,
        // Said plainly because it changes what the layer is claiming: outside
        // the provider's radius cap this is military traffic only, not every
        // aircraft in the air, and the legend says so.
        military: scope.kind === 'mil',
        fetchedAt: new Date(held?.at ?? Date.now()).toISOString(),
      },
      {
        headers: {
          'Cache-Control': `s-maxage=${FLIGHT_REVALIDATE}, stale-while-revalidate=30`,
        },
      },
    )
  } catch {
    return NextResponse.json(
      {
        aircraft: [],
        scope: key,
        military: scope.kind === 'mil',
        unavailable: true,
        fetchedAt: new Date().toISOString(),
      },
      // Not cached: the next request should get a real try rather than being
      // served this failure for the next three quarters of a minute.
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
