import { XMLParser } from 'fast-xml-parser'
import { SEGMENT_IDS, type Segment } from './segments'
import { matchesCountry } from './aliases'
import { getCountryByCode } from './countries'

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
  /**
   * Google News aggregates many publishers into a single feed, so the real
   * outlet comes from each item's <source> element rather than the feed itself.
   */
  dynamicSource?: boolean
}

/**
 * Live, verified RSS endpoints.
 * All free, no API key, no quota.
 *
 * NOTE: every CNN RSS endpoint (rss.cnn.com/*) is dead — it refuses connections
 * outright, which previously left whole segments empty or stuck on old items.
 * Do not re-add it without testing.
 *
 * Sky News Australia has no working public feed either (every documented path
 * returns 0 items or 404), so Australian coverage comes from ABC News, the
 * national broadcaster.
 *
 * Business Standard's topic feeds (world-news, international, current-affairs)
 * are frozen in 2023; only latest.rss / economy-102 / markets-106 are live.
 */
export const RSS_FEEDS: Record<Segment, Feed[]> = {
  headline: [
    { url: 'https://feeds.bbci.co.uk/news/rss.xml',                      source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss',                      source: 'The Guardian' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                  source: 'Al Jazeera' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',  source: 'New York Times' },
    { url: 'https://www.euronews.com/rss',                               source: 'Euronews' },
    { url: 'https://rss.dw.com/rdf/rss-en-all',                          source: 'Deutsche Welle' },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel News Asia' },
    { url: 'https://en.mercopress.com/rss/',                             source: 'MercoPress' },
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml',             source: 'ABC News',       implies: 'AU' },
    { url: 'https://indianexpress.com/section/india/feed/',              source: 'Indian Express', implies: 'IN' },
    { url: 'https://www.business-standard.com/rss/latest.rss',           source: 'Business Standard', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/home.xml',               source: 'Sky News' },
  ],
  politics: [
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',             source: 'BBC',            implies: 'GB' },
    { url: 'https://www.theguardian.com/politics/rss',                   source: 'The Guardian',   implies: 'GB' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',  source: 'New York Times', implies: 'US' },
    { url: 'https://www.euronews.com/rss?level=theme&name=news',         source: 'Euronews' },
    { url: 'https://rss.dw.com/rdf/rss-en-world',                        source: 'Deutsche Welle' },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://en.mercopress.com/rss/',                             source: 'MercoPress' },
    { url: 'https://indianexpress.com/section/political-pulse/feed/',    source: 'Indian Express', implies: 'IN' },
    { url: 'https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/1052732854.cms', source: 'Economic Times', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/politics.xml',           source: 'Sky News',       implies: 'GB' },
  ],
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss',                      source: 'The Guardian' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                  source: 'Al Jazeera' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',     source: 'New York Times' },
    { url: 'https://www.euronews.com/rss',                               source: 'Euronews' },
    { url: 'https://rss.dw.com/rdf/rss-en-world',                        source: 'Deutsche Welle' },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel News Asia' },
    { url: 'https://en.mercopress.com/rss/',                             source: 'MercoPress' },
    { url: 'https://www.abc.net.au/news/feed/45910/rss.xml',             source: 'ABC News' },
    { url: 'https://indianexpress.com/section/world/feed/',              source: 'Indian Express' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml',              source: 'Sky News' },
  ],
  // Macro: growth, policy, trade, industry.
  economy: [
    { url: 'https://feeds.bbci.co.uk/news/business/economy/rss.xml',     source: 'BBC' },
    { url: 'https://www.theguardian.com/business/economics/rss',         source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',   source: 'New York Times' },
    { url: 'https://rss.dw.com/rdf/rss-en-bus',                          source: 'Deutsche Welle' },
    { url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel News Asia' },
    { url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms', source: 'Economic Times', implies: 'IN' },
    { url: 'https://www.business-standard.com/rss/economy-102.rss',      source: 'Business Standard', implies: 'IN' },
    { url: 'https://indianexpress.com/section/business/economy/feed/',   source: 'Indian Express', implies: 'IN' },
    { url: 'https://indianexpress.com/section/business/feed/',           source: 'Indian Express', implies: 'IN' },
  ],
  // Markets, companies and money.
  finance: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',             source: 'BBC' },
    { url: 'https://www.theguardian.com/uk/business/rss',                source: 'The Guardian',   implies: 'GB' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',  source: 'New York Times' },
    { url: 'https://rss.dw.com/rdf/rss-en-bus',                          source: 'Deutsche Welle' },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times', implies: 'IN' },
    { url: 'https://www.business-standard.com/rss/markets-106.rss',      source: 'Business Standard', implies: 'IN' },
    { url: 'https://indianexpress.com/section/business/feed/',           source: 'Indian Express', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/business.xml',           source: 'Sky News',       implies: 'GB' },
  ],
}

export { matchesCountry }

/**
 * Extra query terms that steer a Google News search toward each segment.
 * Empty for headlines — the country name alone is the broadest, freshest net.
 */
const SEGMENT_QUERY: Record<Segment, string> = {
  headline: '',
  politics: 'politics OR government OR election',
  world:    'foreign policy OR diplomacy OR international',
  economy:  'economy OR inflation OR trade OR GDP',
  finance:  'markets OR stocks OR banking OR currency',
}

/**
 * Per-country Google News search feed.
 *
 * The ten curated newsrooms skew UK/US/India/Australia, so most of the smaller
 * countries came back empty — Ireland and Lebanon both returned nothing. This
 * fills the gap for any country.
 *
 * Deliberately uses the SEARCH endpoint, not the localised edition: Google only
 * publishes English editions for some countries, and the rest silently fall
 * back to the US edition, which would have injected US stories into, say,
 * Lebanon's page.
 */
export function googleNewsFeed(countryName: string, segment: Segment): Feed {
  const extra = SEGMENT_QUERY[segment]
  const query = `"${countryName}"${extra ? ' ' + extra : ''} when:${MAX_AGE_DAYS}d`
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=en-US&gl=US&ceid=US:en'
  return { url, source: 'Google News', dynamicSource: true }
}

export { SOURCE_COUNT } from './sources'

/**
 * Wires and national outlets whose Google News results we trust.
 * Without this, recency alone floated things like a rugby streaming guide
 * above a Reuters piece on Lebanon's power grid.
 */
const REPUTABLE = new Set([
  'reuters', 'associated press', 'ap news', 'afp', 'agence france-presse',
  'bloomberg', 'cnbc', 'financial times', 'the economist', 'wall street journal',
  'bbc', 'bbc news', 'the guardian', 'al jazeera', 'the new york times',
  'new york times', 'the washington post', 'washington post', 'npr', 'cnn',
  'deutsche welle', 'dw', 'france 24', 'euronews', 'sky news', 'abc news',
  'politico', 'axios', 'the independent', 'the telegraph', 'time', 'newsweek',
  'nikkei asia', 'south china morning post', 'the straits times', 'kyodo news',
  'the times of india', 'the indian express', 'indian express', 'economic times',
  'business standard', 'hindustan times', 'the hindu', 'mint', 'ndtv',
  'the irish times', 'rte', 'the japan times', 'the moscow times', 'haaretz',
  'the jerusalem post', 'arab news', 'the national', 'middle east eye',
  'anadolu agency', 'the korea herald', 'yonhap', 'abc.net.au',
  'the sydney morning herald', 'stuff', 'nz herald', 'the age', 'scmp',
  'deutsche welle', 'dw.com', 'arab news', 'allafrica', 'allafrica.com',
  'channel news asia', 'cna', 'mercopress', 'the africa report',
])

/**
 * Share of letters that are Latin. Google News search returns foreign-language
 * items (a Mongolia query surfaced a Chinese-language government page); this is
 * an English-language product, so those get dropped.
 */
function latinRatio(text: string): number {
  const letters = text.match(/\p{L}/gu)
  if (!letters || letters.length === 0) return 1
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0
  return latin / letters.length
}

/**
 * Higher scores surface first, with publish time breaking ties. Pure recency
 * ranked trivia above substantive reporting once Google News widened the net.
 */
function relevanceScore(a: Article, countryCode: string): number {
  let score = 0
  if (a.source !== 'Google News' && !a.viaSearch) score += 4
  if (REPUTABLE.has(a.source.trim().toLowerCase())) score += 3
  if (matchesCountry(a.headline, countryCode)) score += 2
  return score
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
  /** True when the item came from the Google News search rather than a curated feed. */
  viaSearch?: boolean
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
  source?: unknown
}

/** Google News appends " - Publisher" to every title; strip it once known. */
function stripSourceSuffix(title: string, source: string): string {
  if (!source) return title
  const suffix = ` - ${source}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title
}

function itemSource(item: RSSItem): string {
  const s = item.source
  if (typeof s === 'string') return cleanText(s)
  if (s && typeof s === 'object') {
    const v = s as Record<string, unknown>
    return cleanText(v['#text'] ?? v['@_url'] ?? '')
  }
  return ''
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
    // RSS 2.0, Atom, then RSS 1.0 / RDF — Deutsche Welle and Nikkei publish RDF,
    // where items sit at the document root rather than under a <channel>.
    const raw =
      parsed?.rss?.channel?.item ??
      parsed?.feed?.entry ??
      parsed?.['rdf:RDF']?.item ??
      parsed?.RDF?.item ??
      []
    const items: RSSItem[] = Array.isArray(raw) ? raw : [raw]

    return items.map((item, i): Article => {
      const source = feed.dynamicSource ? (itemSource(item) || feed.source) : feed.source
      const rawTitle = cleanText(item.title)
      return {
        id: `${source}-${segment}-${i}`,
        headline: feed.dynamicSource ? stripSourceSuffix(rawTitle, source) : rawTitle,
        description: cleanText(item.description ?? item.summary).slice(0, 180),
        source,
        url: pickLink(item) || '#',
        publishedAt: pickDate(item),
        imageUrl: extractImage(item),
        segment,
        impliedCountry: feed.implies,
        viaSearch: feed.dynamicSource === true,
      }
    }).filter(a => a.headline && a.url !== '#')
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
  const curated = RSS_FEEDS[segment] ?? RSS_FEEDS.headline
  const country = getCountryByCode(countryCode.toUpperCase())

  // Curated newsrooms give depth for the big markets; the Google News search
  // gives any country a floor of coverage. Both go through the same filter.
  const feeds: Feed[] = country
    ? [...curated, googleNewsFeed(country.name, segment)]
    : curated

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

  // Drop non-English items the search surfaces for smaller countries — both
  // foreign-language headlines and publishers we can't render legibly.
  const english = deduped.filter(
    a => latinRatio(a.headline) >= 0.6 && latinRatio(a.source) >= 0.6,
  )

  const ranked = [...english].sort((a, b) => {
    const diff = relevanceScore(b, code) - relevanceScore(a, code)
    if (diff !== 0) return diff
    return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)
  })

  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000
  const fresh = ranked.filter(a => {
    const t = Date.parse(a.publishedAt)
    return Number.isNaN(t) ? false : t >= cutoff
  })

  // Prefer fresh items; fall back to best-available so a quiet country isn't blank.
  const chosen = fresh.length > 0 ? fresh : ranked

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
