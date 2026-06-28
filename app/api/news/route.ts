import { NextRequest, NextResponse } from 'next/server'

const NEWSAPI_KEY = process.env.NEWSAPI_KEY || ''

const SEGMENT_CATEGORY: Record<string, string> = {
  headline:    'general',
  geopolitics: 'general',
  finance:     'business',
}

const SEGMENT_KEYWORDS: Record<string, string> = {
  geopolitics: 'politics OR diplomacy OR war OR conflict OR sanctions OR election',
  finance:     '',
  headline:    '',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country')?.toLowerCase() || 'us'
  const segment = (searchParams.get('segment') || 'headline') as string

  if (!NEWSAPI_KEY) {
    // Return mock data when no API key is set
    return NextResponse.json({
      country,
      segment,
      articles: MOCK_ARTICLES.map((a, i) => ({ ...a, id: `mock-${i}`, segment, country })),
      total: MOCK_ARTICLES.length,
      fetchedAt: new Date().toISOString(),
    })
  }

  const category = SEGMENT_CATEGORY[segment] || 'general'
  const keywords = SEGMENT_KEYWORDS[segment] || ''

  const params = new URLSearchParams({
    country,
    category,
    pageSize: '8',
    apiKey: NEWSAPI_KEY,
  })
  if (keywords) params.set('q', keywords)

  try {
    const res = await fetch(`https://newsapi.org/v2/top-headlines?${params}`, {
      next: { revalidate: 300 }, // cache 5 min
    })
    const data = await res.json()

    if (data.status !== 'ok') {
      return NextResponse.json({ error: data.message }, { status: 502 })
    }

    const articles = (data.articles || []).map((a: Record<string, string>, i: number) => ({
      id: `${country}-${segment}-${i}`,
      headline: a.title || '',
      description: a.description || '',
      source: a.source?.name || 'Unknown',
      url: a.url || '',
      publishedAt: a.publishedAt || '',
      timeAgo: timeAgo(a.publishedAt || ''),
      segment,
      country,
    }))

    return NextResponse.json({ country, segment, articles, total: articles.length, fetchedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 500 })
  }
}

const MOCK_ARTICLES = [
  { headline: 'Global leaders meet for emergency climate summit', description: 'Representatives from 50 nations gather to discuss binding emissions targets.', source: 'CNN', url: '#', publishedAt: new Date(Date.now() - 3600000).toISOString(), timeAgo: '1h ago' },
  { headline: 'Markets react as central banks signal rate cuts', description: 'Stock indices rose sharply following signals from the Fed and ECB.', source: 'Sky News', url: '#', publishedAt: new Date(Date.now() - 7200000).toISOString(), timeAgo: '2h ago' },
  { headline: 'Diplomatic tensions rise over trade negotiations', description: 'Officials warn that trade talks have stalled as both sides dig in.', source: 'Indian Express', url: '#', publishedAt: new Date(Date.now() - 10800000).toISOString(), timeAgo: '3h ago' },
  { headline: 'Tech sector sees record investment in Q2', description: 'Venture capital poured $180 billion into startups globally this quarter.', source: 'CNN', url: '#', publishedAt: new Date(Date.now() - 14400000).toISOString(), timeAgo: '4h ago' },
]
