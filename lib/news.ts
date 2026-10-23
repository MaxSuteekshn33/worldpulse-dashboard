import { XMLParser } from 'fast-xml-parser'
import { SEGMENT_IDS, type Segment } from './segments'

/** How long a cached feed response stays warm (seconds). 20 minutes. */
export const REVALIDATE_SECONDS = 1200

/** Articles older than this are dropped so the deck never shows stale news. */
const MAX_AGE_DAYS = 7

export interface Feed {
  url: string
  source: string
  /**
   * Set when a feed is inherently about one country (a national politics or
   * business desk). Those articles rarely name the country in the headline —
   * "Parliament passes bill" never says "India" — so alias matching alone threw
   * most of them away. Articles from such a feed count as a match for that code.
   */
  implies?: string
}

/**
 * Live, verified RSS endpoints.
 * NOTE: every CNN RSS endpoint (rss.cnn.com/*) is dead — it refuses connections
 * outright, which previously left whole segments empty or stuck on old items.
 * Replaced with BBC / Guardian / Al Jazeera, which are free and need no key.
 */
export const RSS_FEEDS: Record<Segment, Feed[]> = {
  headline: [
    { url: 'https://feeds.bbci.co.uk/news/rss.xml',                      source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss',                      source: 'The Guardian' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                  source: 'Al Jazeera' },
    { url: 'https://indianexpress.com/section/india/feed/',              source: 'Indian Express', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/home.xml',               source: 'Sky News' },
  ],
  politics: [
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',             source: 'BBC',            implies: 'GB' },
    { url: 'https://www.theguardian.com/politics/rss',                   source: 'The Guardian',   implies: 'GB' },
    { url: 'https://indianexpress.com/section/political-pulse/feed/',    source: 'Indian Express', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/politics.xml',           source: 'Sky News',       implies: 'GB' },
  ],
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss',                      source: 'The Guardian' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                  source: 'Al Jazeera' },
    { url: 'https://indianexpress.com/section/world/feed/',              source: 'Indian Express' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml',              source: 'Sky News' },
  ],
  // Macro: growth, policy, trade, industry.
  economy: [
    { url: 'https://feeds.bbci.co.uk/news/business/economy/rss.xml',     source: 'BBC' },
    { url: 'https://www.theguardian.com/business/economics/rss',         source: 'The Guardian' },
    { url: 'https://indianexpress.com/section/business/economy/feed/',   source: 'Indian Express', implies: 'IN' },
    { url: 'https://indianexpress.com/section/business/feed/',           source: 'Indian Express', implies: 'IN' },
  ],
  // Markets, companies and money.
  finance: [
    { url: 'https://feeds.skynews.com/feeds/rss/business.xml',           source: 'Sky News',       implies: 'GB' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',             source: 'BBC' },
    { url: 'https://www.theguardian.com/uk/business/rss',                source: 'The Guardian',   implies: 'GB' },
    { url: 'https://indianexpress.com/section/business/feed/',           source: 'Indian Express', implies: 'IN' },
  ],
}

/** Distinct newsroom count, for the dashboard stats strip. */
export const SOURCE_COUNT = Array.from(
  new Set(Object.values(RSS_FEEDS).flat().map(f => f.source))
).length

export const COUNTRY_ALIASES: Record<string, string[]> = {
  IN: ['India', 'Indian', 'New Delhi', 'Mumbai', 'Modi', 'Bengaluru', 'Kolkata'],
  US: ['United States', 'America', 'American', 'Washington', 'Biden', 'Trump', 'U.S.', 'US '],
  GB: ['Britain', 'British', 'UK', 'United Kingdom', 'London', 'England', 'Starmer'],
  AU: ['Australia', 'Australian', 'Sydney', 'Melbourne', 'Canberra'],
  CN: ['China', 'Chinese', 'Beijing', 'Xi Jinping', 'Shanghai'],
  RU: ['Russia', 'Russian', 'Moscow', 'Putin', 'Kremlin'],
  DE: ['Germany', 'German', 'Berlin', 'Scholz', 'Merz'],
  FR: ['France', 'French', 'Paris', 'Macron'],
  JP: ['Japan', 'Japanese', 'Tokyo'],
  BR: ['Brazil', 'Brazilian', 'Brasilia', 'Lula'],
  CA: ['Canada', 'Canadian', 'Ottawa', 'Toronto', 'Carney'],
  ZA: ['South Africa', 'South African', 'Johannesburg', 'Cape Town'],
  NG: ['Nigeria', 'Nigerian', 'Lagos', 'Abuja'],
  MX: ['Mexico', 'Mexican', 'Sheinbaum'],
  AR: ['Argentina', 'Argentine', 'Buenos Aires', 'Milei'],
  EG: ['Egypt', 'Egyptian', 'Cairo'],
  IL: ['Israel', 'Israeli', 'Gaza', 'Tel Aviv', 'Jerusalem', 'Netanyahu'],
  SA: ['Saudi Arabia', 'Saudi', 'Riyadh'],
  PK: ['Pakistan', 'Pakistani', 'Islamabad', 'Karachi', 'Lahore'],
  KR: ['South Korea', 'Korean', 'Seoul'],
  IT: ['Italy', 'Italian', 'Rome', 'Meloni'],
  UA: ['Ukraine', 'Ukrainian', 'Kyiv', 'Zelensky'],
  TR: ['Turkey', 'Turkish', 'Ankara', 'Erdogan', 'Türkiye', 'Istanbul'],
  ID: ['Indonesia', 'Indonesian', 'Jakarta'],
  NL: ['Netherlands', 'Dutch', 'Amsterdam', 'Hague'],
  ES: ['Spain', 'Spanish', 'Madrid', 'Barcelona'],
  SE: ['Sweden', 'Swedish', 'Stockholm'],
  NO: ['Norway', 'Norwegian', 'Oslo'],
  PL: ['Poland', 'Polish', 'Warsaw'],
  CH: ['Switzerland', 'Swiss', 'Zurich', 'Geneva', 'Davos'],
  BE: ['Belgium', 'Belgian', 'Brussels'],
  PT: ['Portugal', 'Portuguese', 'Lisbon'],
  GR: ['Greece', 'Greek', 'Athens'],
  AE: ['UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi', 'Emirati'],
  IR: ['Iran', 'Iranian', 'Tehran'],
  IQ: ['Iraq', 'Iraqi', 'Baghdad'],
  SG: ['Singapore', 'Singaporean'],
  MY: ['Malaysia', 'Malaysian', 'Kuala Lumpur'],
  TH: ['Thailand', 'Thai', 'Bangkok'],
  PH: ['Philippines', 'Filipino', 'Manila'],
  VN: ['Vietnam', 'Vietnamese', 'Hanoi', 'Ho Chi Minh'],
  BD: ['Bangladesh', 'Bangladeshi', 'Dhaka'],
  KE: ['Kenya', 'Kenyan', 'Nairobi'],
  ET: ['Ethiopia', 'Ethiopian', 'Addis Ababa'],
  GH: ['Ghana', 'Ghanaian', 'Accra'],
  CO: ['Colombia', 'Colombian', 'Bogota'],
  CL: ['Chile', 'Chilean', 'Santiago'],
  AT: ['Austria', 'Austrian', 'Vienna'],
  CZ: ['Czech', 'Czechia', 'Prague'],
  HU: ['Hungary', 'Hungarian', 'Budapest', 'Orban'],
}

export interface Article {
  id: string
  headline: string
  description: string
  source: string
  url: string
  /** ISO timestamp — the client renders relative time so it never goes stale in cache. */
  publishedAt: string
  imageUrl?: string
  segment: Segment
  /** Country code this article's source desk inherently covers, if any. */
  impliedCountry?: string
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  '&ldquo;': '"', '&rdquo;': '"', '&lsquo;': "'", '&rsquo;': "'",
  '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
}

/** Strips markup then decodes entities — RSS titles sometimes carry raw <a href> tags. */
export function cleanText(input: unknown): string {
  let str = String(input ?? '')
  str = str.replace(/<[^>]*>/g, ' ')
  str = str.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  str = str.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  for (const [ent, ch] of Object.entries(NAMED_ENTITIES)) str = str.split(ent).join(ch)
  str = str.replace(/&[a-z]+;/gi, '')
  return str.replace(/\s+/g, ' ').trim()
}

export function matchesCountry(text: string, countryCode: string): boolean {
  const aliases = COUNTRY_ALIASES[countryCode.toUpperCase()] || []
  const lower = text.toLowerCase()
  return aliases.some(a => lower.includes(a.toLowerCase()))
}

interface RSSItem {
  title?: unknown
  description?: unknown
  summary?: unknown
  link?: unknown
  pubDate?: string
  published?: string
  updated?: string
  'dc:date'?: string
  enclosure?: { '@_url'?: string; '@_type'?: string }
  'media:content'?: { '@_url'?: string } | { '@_url'?: string }[]
  'media:thumbnail'?: { '@_url'?: string } | { '@_url'?: string }[]
  'content:encoded'?: string
}

function pickDate(item: RSSItem): string {
  const raw = item.pubDate || item.published || item.updated || item['dc:date'] || ''
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? '' : new Date(t).toISOString()
}

function pickLink(item: RSSItem): string {
  const l = item.link as unknown
  if (typeof l === 'string') return l
  if (Array.isArray(l)) {
    const alt = (l as Record<string, string>[]).find(x => x['@_href'])
    if (alt?.['@_href']) return alt['@_href']
  }
  if (l && typeof l === 'object') {
    const href = (l as Record<string, string>)['@_href']
    if (href) return href
  }
  return ''
}

function extractImage(item: RSSItem): string | undefined {
  const pick = (v: { '@_url'?: string } | { '@_url'?: string }[] | undefined) => {
    if (!v) return undefined
    if (Array.isArray(v)) return v.find(m => m['@_url'])?.['@_url']
    return v['@_url']
  }
  const mc = pick(item['media:content'])
  if (mc) return mc
  const mt = pick(item['media:thumbnail'])
  if (mt) return mt
  if (item.enclosure?.['@_url'] && String(item.enclosure['@_type'] || '').startsWith('image')) {
    return item.enclosure['@_url']
  }
  const m = String(item['content:encoded'] || '').match(/<img[^>]+src=["']([^"']+)["']/i)
  return m?.[1]
}

async function fetchFeed(feed: Feed, segment: Segment): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorldPulse/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(await res.text())
    const raw = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? []
    const items: RSSItem[] = Array.isArray(raw) ? raw : [raw]

    return items.map((item, i): Article => ({
      id: `${feed.source}-${segment}-${i}`,
      headline: cleanText(item.title),
      description: cleanText(item.description ?? item.summary).slice(0, 180),
      source: feed.source,
      url: pickLink(item) || '#',
      publishedAt: pickDate(item),
      imageUrl: extractImage(item),
      segment,
      impliedCountry: feed.implies,
    })).filter(a => a.headline && a.url !== '#')
  } catch {
    return []
  }
}

export interface SegmentResult {
  articles: Article[]
  fetchedAt: string
}

/**
 * Country-filtered, de-duplicated, newest-first articles for one segment.
 *
 * Fixes the "news from days ago" bug: results used to be concatenated per source
 * in feed order and sliced, so an old item from the first source outranked a
 * fresh one from the second. Everything is now sorted by real publish time and
 * anything older than MAX_AGE_DAYS is dropped.
 */
export async function getSegmentNews(
  countryCode: string,
  segment: Segment,
  limit = 12,
): Promise<SegmentResult> {
  const feeds = RSS_FEEDS[segment] ?? RSS_FEEDS.headline
  const all = (await Promise.all(feeds.map(f => fetchFeed(f, segment)))).flat()

  const code = countryCode.toUpperCase()
  const matched = all.filter(a =>
    a.impliedCountry === code || matchesCountry(`${a.headline} ${a.description}`, code),
  )

  const seen = new Set<string>()
  const deduped = matched.filter(a => {
    const key = a.headline.toLowerCase().slice(0, 70)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const newestFirst = [...deduped].sort(
    (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)
  )

  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000
  const fresh = newestFirst.filter(a => {
    const t = Date.parse(a.publishedAt)
    return Number.isNaN(t) ? false : t >= cutoff
  })

  // Prefer fresh items; fall back to newest-available so a quiet country isn't blank.
  const chosen = fresh.length > 0 ? fresh : newestFirst

  return { articles: chosen.slice(0, limit), fetchedAt: new Date().toISOString() }
}

export interface PulseEntry {
  /** Segment with the most coverage for this country right now. */
  segment: Segment
  /** Matching articles in that segment. */
  count: number
  /** Matching articles across all segments. */
  total: number
}

/**
 * Dominant segment per country, computed in a single pass.
 *
 * The map used to call /api/news once per country per segment — 49 × 5 = 245
 * round trips on every dashboard load. Here the feeds are pulled once (and are
 * cache-warm anyway) and every country is scored in memory.
 */
export async function getPulseMap(
  codes: string[],
): Promise<Record<string, PulseEntry | null>> {
  const bySegment = await Promise.all(
    SEGMENT_IDS.map(async segment => ({
      segment,
      items: (await Promise.all((RSS_FEEDS[segment] ?? []).map(f => fetchFeed(f, segment)))).flat(),
    })),
  )

  const out: Record<string, PulseEntry | null> = {}

  for (const code of codes) {
    let best: { segment: Segment; count: number } | null = null
    let total = 0

    for (const { segment, items } of bySegment) {
      const count = items.filter(a =>
        a.impliedCountry === code || matchesCountry(`${a.headline} ${a.description}`, code),
      ).length
      total += count
      if (!best || count > best.count) best = { segment, count }
    }

    out[code] = best && best.count > 0
      ? { segment: best.segment, count: best.count, total }
      : null
  }

  return out
}
