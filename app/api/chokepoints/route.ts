import { NextResponse } from 'next/server'
import { CHOKEPOINT_REVALIDATE, getChokepointTraffic } from '@/lib/shipping'

/**
 * Daily vessel transits for the world's 28 maritime chokepoints.
 *
 * Server-side because the upstream is an ArcGIS endpoint with its own CORS
 * and its own shape, and because the answer is identical for every visitor —
 * so it is worth fetching once and caching rather than two hundred times from
 * two hundred browsers.
 */
export async function GET() {
  try {
    const { readings, latestDate } = await getChokepointTraffic()
    return NextResponse.json(
      {
        readings,
        // Said plainly, because it is not today: the source publishes daily
        // and runs about a week behind.
        latestDate,
        source: 'IMF PortWatch',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': `s-maxage=${CHOKEPOINT_REVALIDATE}, stale-while-revalidate=3600`,
        },
      },
    )
  } catch (err) {
    // The map still has its lanes and its chokepoints without this; only the
    // numbers go missing, so say so rather than failing the view.
    return NextResponse.json(
      { readings: [], latestDate: null, error: err instanceof Error ? err.message : 'unavailable' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
