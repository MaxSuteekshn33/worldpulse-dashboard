import { NextResponse } from 'next/server'
import { getPulseMap, REVALIDATE_SECONDS } from '@/lib/news'
import { COUNTRIES } from '@/lib/countries'

export async function GET() {
  const pulse = await getPulseMap(COUNTRIES.map(c => c.code))

  return NextResponse.json(
    { pulse, fetchedAt: new Date().toISOString(), refreshSeconds: REVALIDATE_SECONDS },
    { headers: { 'Cache-Control': `s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=60` } },
  )
}
