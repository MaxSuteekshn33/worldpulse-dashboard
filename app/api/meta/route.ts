import { NextResponse } from 'next/server'
import { SOURCE_COUNT, REVALIDATE_SECONDS } from '@/lib/news'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'

/** Static coverage numbers for the dashboard stats strip. */
export async function GET() {
  return NextResponse.json(
    {
      countries: COUNTRIES.length,
      sources: SOURCE_COUNT,
      categories: SEGMENTS.length,
      refreshSeconds: REVALIDATE_SECONDS,
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
