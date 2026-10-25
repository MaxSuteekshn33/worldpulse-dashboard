import { NextResponse, after } from 'next/server'
import {
  COLD_EXPORTS,
  CONFLICT_MEMORY,
  CONFLICT_REVALIDATE,
  type ConflictEvent,
  fetchRecent,
  mergeEvents,
  stillRecent,
} from '@/lib/conflict'

/** Downloads and inflates zips; nothing to gain at the edge. */
export const runtime = 'nodejs'
/** Room for a cold sweep of several windows, most of it after the response. */
export const maxDuration = 45

/**
 * Conflict and unrest events over the last few hours.
 *
 * The same shape as the vessel route, for the same reasons: held per
 * instance so a burst of visitors costs GDELT one sweep, accumulated rather
 * than replaced, and refreshed behind the response so only a cold instance
 * ever waits.
 */
let cached: { at: number; events: ConflictEvent[] } | null = null
let inFlight: Promise<ConflictEvent[]> | null = null

function refresh(windows: number): Promise<ConflictEvent[]> {
  inFlight ??= fetchRecent(windows)
    .then(fresh => {
      const merged = mergeEvents(cached?.events ?? [], fresh)
      cached = { at: Date.now(), events: merged }
      return merged
    })
    .catch(() => cached?.events ?? [])
    .finally(() => { inFlight = null })

  return inFlight
}

export async function GET() {
  if (!cached) {
    // Nothing to show, so this visitor waits — but for ninety minutes of
    // history rather than the sixty events of the last quarter hour.
    await refresh(COLD_EXPORTS)
  } else if (Date.now() - cached.at >= CONFLICT_REVALIDATE * 1000) {
    // GDELT publishes every fifteen minutes and this refreshes every five,
    // so two windows comfortably covers whatever is new without gaps.
    after(() => refresh(2))
  }

  // Aged at the point of serving, not only when a sweep completes: a pool
  // whose refreshes stall would otherwise be served unchanged however old it
  // got, which is the bug this same pattern already had on the vessels.
  const events = stillRecent(cached?.events ?? [])

  return NextResponse.json(
    {
      events,
      fetchedAt: new Date(cached?.at ?? Date.now()).toISOString(),
      memorySeconds: CONFLICT_MEMORY,
    },
    {
      headers: {
        'Cache-Control': `s-maxage=${CONFLICT_REVALIDATE}, stale-while-revalidate=120`,
      },
    },
  )
}
