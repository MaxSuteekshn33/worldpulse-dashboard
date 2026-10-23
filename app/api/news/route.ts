import { NextRequest, NextResponse } from 'next/server'
import { getSegmentNews, REVALIDATE_SECONDS } from '@/lib/news'
import { SEGMENT_IDS, type Segment } from '@/lib/segments'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || 'US').toUpperCase()
  const raw = searchParams.get('segment') || 'headline'
  const segment = (SEGMENT_IDS.includes(raw as Segment) ? raw : 'headline') as Segment

  const { articles, fetchedAt } = await getSegmentNews(country, segment)

  return NextResponse.json(
    {
      country,
      segment,
      articles,
      total: articles.length,
      fetchedAt,
      refreshSeconds: REVALIDATE_SECONDS,
    },
    { headers: { 'Cache-Control': `s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=60` } },
  )
}
