import { NextRequest, NextResponse } from 'next/server'
import { getPulseMap, getSearchPulse, PULSE_BATCH, REVALIDATE_SECONDS } from '@/lib/news'
import { COUNTRIES } from '@/lib/countries'

/**
 * Bubble colours for the dashboard map.
 *
 * Two modes, because the two halves of the map cost very different amounts.
 * Bare, this scores all 200 countries against the curated wires in one pass —
 * one set of feed fetches, cheap, and it answers for the roughly half of the
 * world those wires actually cover.
 *
 * With `?codes=`, it reads the long tail from the per-country search instead,
 * at one request per country. The map asks for those in batches once it knows
 * which countries came back quiet, so the expensive half is paid for only
 * where it's needed, spread over several requests rather than fired as one
 * 200-wide burst that Google would refuse outright.
 */
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('codes')

  const codes = param
    ? param.split(',').map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, PULSE_BATCH)
    : null

  const pulse = codes
    ? await getSearchPulse(codes)
    : await getPulseMap(COUNTRIES.map(c => c.code))

  return NextResponse.json(
    {
      pulse,
      // Told to the client rather than duplicated there: WorldMap is a client
      // component and importing this module for one number would drag the
      // whole news engine into the browser bundle.
      batchSize: PULSE_BATCH,
      fetchedAt: new Date().toISOString(),
      refreshSeconds: REVALIDATE_SECONDS,
    },
    { headers: { 'Cache-Control': `s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=60` } },
  )
}
