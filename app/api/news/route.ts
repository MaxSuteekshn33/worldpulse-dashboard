import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

// ── RSS Feed URLs ──────────────────────────────────────────────
const RSS_FEEDS = {
  headline: [
    { url: 'https://rss.cnn.com/rss/edition.rss',                   source: 'CNN' },
    { url: 'https://feeds.skynews.com/feeds/rss/home.xml',           source: 'Sky News' },
    { url: 'https://indianexpress.com/feed/',                        source: 'Indian Express' },
  ],
  politics: [
    { url: 'https://rss.cnn.com/rss/cnn_allpolitics.rss',           source: 'CNN' },
    { url: 'https://feeds.skynews.com/feeds/rss/politics.xml',      source: 'Sky News' },
    { url: 'https://indianexpress.com/section/politics/feed/',      source: 'Indian Express' },
  ],
  geopolitics: [
    { url: 'https://rss.cnn.com/rss/edition_world.rss',             source: 'CNN' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml',         source: 'Sky News' },
    { url: 'https://indianexpress.com/section/world/feed/',         source: 'Indian Express' },
  ],
  finance: [
    { url: 'https://rss.cnn.com/rss/money_news_international.rss',  source: 'CNN' },
    { url: 'https://feeds.skynews.com/feeds/rss/money.xml',         source: 'Sky News' },
    { url: 'https://indianexpress.com/section/business/feed/',      source: 'Indian Express' },
  ],
}

// ── Country name aliases for filtering ────────────────────────
const COUNTRY_ALIASES: Record<string, string[]> = {
  IN: ['India', 'Indian', 'New Delhi', 'Mumbai', 'Modi'],
  US: ['United States', 'America', 'American', 'Washington', 'Biden', 'Trump', 'U.S.'],
  GB: ['Britain', 'British', 'UK', 'United Kingdom', 'London', 'England'],
  AU: ['Australia', 'Australian', 'Sydney', 'Melbourne', 'Canberra'],
  CN: ['China', 'Chinese', 'Beijing', 'Xi Jinping'],
  RU: ['Russia', 'Russian', 'Moscow', 'Putin', 'Kremlin'],
  DE: ['Germany', 'German', 'Berlin'],
  FR: ['France', 'French', 'Paris'],
  JP: ['Japan', 'Japanese', 'Tokyo'],
  BR: ['Brazil', 'Brazilian', 'Brasilia'],
  CA: ['Canada', 'Canadian', 'Ottawa', 'Toronto'],
  ZA: ['South Africa', 'South African', 'Johannesburg'],
  NG: ['Nigeria', 'Nigerian', 'Lagos', 'Abuja'],
  MX: ['Mexico', 'Mexican'],
  AR: ['Argentina', 'Argentine', 'Buenos Aires'],
  EG: ['Egypt', 'Egyptian', 'Cairo'],
  IL: ['Israel', 'Israeli', 'Gaza', 'Tel Aviv', 'Jerusalem'],
  SA: ['Saudi Arabia', 'Saudi', 'Riyadh'],
  PK: ['Pakistan', 'Pakistani', 'Islamabad', 'Karachi'],
  KR: ['South Korea', 'Korean', 'Seoul'],
  IT: ['Italy', 'Italian', 'Rome'],
  UA: ['Ukraine', 'Ukrainian', 'Kyiv', 'Zelensky'],
  TR: ['Turkey', 'Turkish', 'Ankara', 'Erdogan', 'Türkiye'],
  ID: ['Indonesia', 'Indonesian', 'Jakarta'],
  NL: ['Netherlands', 'Dutch', 'Amsterdam'],
}

// ── Helpers ────────────────────────────────────────────────────
function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&')
    .replace(/&#\d+;/g, '')   // strip any remaining numeric entities
    .replace(/&[a-z]+;/g, '') // strip any remaining named entities
    .trim()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function matchesCountry(text: string, countryCode: string): boolean {
  const aliases = COUNTRY_ALIASES[countryCode.toUpperCase()] || []
  const lower = text.toLowerCase()
  return aliases.some(alias => lower.includes(alias.toLowerCase()))
}

interface RSSItem {
  title?: string
  description?: string
  link?: string
  pubDate?: string
  'media:content'?: unknown
}

async function fetchRSS(url: string, source: string, countryCode: string) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
    })
    if (!res.ok) return []

    const xml = await res.text()
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(xml)
    const items: RSSItem[] = parsed?.rss?.channel?.item || parsed?.feed?.entry || []

    return items
      .filter((item: RSSItem) => {
        const text = `${item.title || ''} ${item.description || ''}`
        return matchesCountry(text, countryCode)
      })
      .slice(0, 5)
      .map((item: RSSItem, i: number) => ({
        id: `${source}-${i}-${Date.now()}`,
        headline: decodeHtml(item.title || ''),
        description: decodeHtml(String(item.description || '').replace(/<[^>]+>/g, '')).slice(0, 120),
        source,
        url: item.link || '#',
        publishedAt: item.pubDate || '',
        timeAgo: timeAgo(item.pubDate || ''),
      }))
  } catch {
    return []
  }
}

// ── Route handler ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country  = (searchParams.get('country') || 'US').toUpperCase()
  const segment  = (searchParams.get('segment') || 'headline') as keyof typeof RSS_FEEDS
  const feeds    = RSS_FEEDS[segment] || RSS_FEEDS.headline

  // Fetch all feeds in parallel
  const results = await Promise.all(
    feeds.map(f => fetchRSS(f.url, f.source, country))
  )
  const articles = results.flat().slice(0, 10)

  // If no country-specific results — return empty, don't show other countries' news
  if (articles.length === 0) {
    return NextResponse.json({
      country, segment,
      articles: [],
      note: 'no country-specific news found',
      total: 0,
      fetchedAt: new Date().toISOString(),
    })
  }

  return NextResponse.json({
    country, segment, articles,
    total: articles.length,
    fetchedAt: new Date().toISOString(),
  })
}
