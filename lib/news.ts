import { XMLParser } from 'fast-xml-parser'
import { SEGMENT_IDS, type Segment } from './segments'
import { matchesCountry } from './aliases'
import { getCountryByCode } from './countries'

/** How long a cached feed response stays warm (seconds). 20 minutes. */
export const REVALIDATE_SECONDS = 1200

/** How long any one feed gets before the page gives up on it. */
const FEED_TIMEOUT_MS = 3000

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
  /**
   * True when the feed IS the segment's desk — BBC Politics only ever files
   * politics. Those items skip the topic check below; everything from a
   * site-wide feed (Arab News, AllAfrica, Channel News Asia) has to earn its
   * section on the text, because one such feed is wired into four of them.
   */
  desk?: boolean
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
  // Top stories, whatever the topic. This is the only section with no topic
  // gate, so it takes front-page feeds rather than desk feeds — the Guardian
  // entry used to be /world/rss, the same feed `world` uses, which is why the
  // two sections came back 10-of-12 identical for France.
  headline: [
    { url: 'https://feeds.bbci.co.uk/news/rss.xml',                      source: 'BBC' },
    { url: 'https://www.theguardian.com/international/rss',              source: 'The Guardian' },
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
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',             source: 'BBC',            implies: 'GB', desk: true },
    { url: 'https://www.theguardian.com/politics/rss',                   source: 'The Guardian',   implies: 'GB', desk: true },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',  source: 'New York Times', implies: 'US', desk: true },
    { url: 'https://www.euronews.com/rss?level=theme&name=news',         source: 'Euronews' },
    { url: 'https://rss.dw.com/rdf/rss-en-world',                        source: 'Deutsche Welle' },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://en.mercopress.com/rss/',                             source: 'MercoPress' },
    { url: 'https://indianexpress.com/section/political-pulse/feed/',    source: 'Indian Express', implies: 'IN', desk: true },
    { url: 'https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/1052732854.cms', source: 'Economic Times', implies: 'IN', desk: true },
    { url: 'https://feeds.skynews.com/feeds/rss/politics.xml',           source: 'Sky News',       implies: 'GB', desk: true },
  ],
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                source: 'BBC',            desk: true },
    { url: 'https://www.theguardian.com/world/rss',                      source: 'The Guardian',   desk: true },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                  source: 'Al Jazeera' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',     source: 'New York Times', desk: true },
    { url: 'https://www.euronews.com/rss',                               source: 'Euronews' },
    { url: 'https://rss.dw.com/rdf/rss-en-world',                        source: 'Deutsche Welle', desk: true },
    { url: 'https://www.arabnews.com/rss.xml',                           source: 'Arab News' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel News Asia' },
    { url: 'https://en.mercopress.com/rss/',                             source: 'MercoPress' },
    { url: 'https://www.abc.net.au/news/feed/45910/rss.xml',             source: 'ABC News',       desk: true },
    { url: 'https://indianexpress.com/section/world/feed/',              source: 'Indian Express', desk: true },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml',              source: 'Sky News',       desk: true },
  ],
  // Macro: growth, policy, trade, industry.
  economy: [
    { url: 'https://feeds.bbci.co.uk/news/business/economy/rss.xml',     source: 'BBC',            desk: true },
    { url: 'https://www.theguardian.com/business/economics/rss',         source: 'The Guardian',   desk: true },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',   source: 'New York Times', desk: true },
    { url: 'https://rss.dw.com/rdf/rss-en-bus',                          source: 'Deutsche Welle' },
    { url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel News Asia' },
    { url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms', source: 'Economic Times', implies: 'IN', desk: true },
    { url: 'https://www.business-standard.com/rss/economy-102.rss',      source: 'Business Standard', implies: 'IN', desk: true },
    { url: 'https://indianexpress.com/section/business/economy/feed/',   source: 'Indian Express', implies: 'IN', desk: true },
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
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times', implies: 'IN', desk: true },
    { url: 'https://www.business-standard.com/rss/markets-106.rss',      source: 'Business Standard', implies: 'IN', desk: true },
    { url: 'https://indianexpress.com/section/business/feed/',           source: 'Indian Express', implies: 'IN' },
    { url: 'https://feeds.skynews.com/feeds/rss/business.xml',           source: 'Sky News',       implies: 'GB' },
  ],
}

export { matchesCountry }

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
 *
 * **One query per country, not one per section.** Each section used to add its
 * own terms ("politics OR government OR election" and so on), which meant a
 * single country page made five separate requests to Google. Google rate-limits
 * this endpoint, and five requests per page is where a low-coverage country
 * gets hurt: those pages lean on the search almost entirely, so a throttled
 * request both slows the render and thins the page — and ISR then caches that
 * thin page for twenty minutes. The bare country name is the broadest net
 * anyway, every section requests the identical URL so Next's fetch cache
 * collapses them into one request, and the topic gate already sorts what comes
 * back into the right sections.
 */
export function googleNewsFeed(countryName: string): Feed {
  const query = `"${countryName}" when:${MAX_AGE_DAYS}d`
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=en-US&gl=US&ceid=US:en'
  return { url, source: 'Google News', dynamicSource: true }
}

export { SOURCE_COUNT } from './sources'
import { accessFor, SOURCE_NAMES } from './sources'

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
 * Topic vocabularies used to check an article really belongs in the section it
 * was filed under.
 *
 * Until now a section was decided purely by which feed an item arrived on, and
 * several feeds are wired into several sections at once — Arab News' site-wide
 * feed feeds headlines, politics, world AND finance; AllAfrica's does three.
 * So one story was filed four times and the tabs stopped meaning anything:
 * Headlines and World came back 9-of-12 identical for the US, 10-of-12 for
 * France. The Google News search made it worse, since its segment query is a
 * hint to a search engine, not a guarantee about what comes back.
 *
 * These are deliberately broad. The job is to throw out a markets story filed
 * under Politics, not to adjudicate borderline cases — a section that gates too
 * hard goes empty, which is worse than one that is merely loose.
 */
const TOPIC_TERMS: Record<Exclude<Segment, 'headline'>, string[]> = {
  politics: [
    'election', 'elections', 'electoral', 'vote', 'votes', 'voted', 'voting',
    'voter', 'voters', 'ballot', 'poll', 'polls', 'referendum', 'parliament',
    'parliamentary', 'congress', 'congressional', 'senate', 'senator',
    'senators', 'lawmaker', 'lawmakers', 'legislature', 'legislation',
    'legislative', 'minister', 'ministers', 'ministry', 'cabinet',
    'president', 'presidential', 'prime minister', 'premier', 'chancellor',
    'governor', 'mayor', 'party', 'parties', 'coalition', 'opposition',
    'government', 'governing', 'policy', 'impeachment', 'impeached',
    'campaign', 'candidate', 'candidates', 'constitution', 'constitutional',
    'supreme court', 'protest', 'protests', 'protesters', 'coup', 'junta',
    'regime', 'democracy', 'democratic', 'republican', 'authoritarian',
    'resign', 'resigns', 'resigned', 'resignation', 'no-confidence',
    'assembly', 'politician', 'politicians', 'political',
    'politics', 'shutdown', 'filibuster', 'white house',
  ],
  world: [
    'diplomat', 'diplomats', 'diplomacy', 'diplomatic', 'embassy', 'ambassador',
    'foreign minister', 'foreign ministry', 'foreign policy', 'treaty',
    'summit', 'united nations', 'nato', 'european union', 'bilateral',
    'negotiations', 'ceasefire', 'truce', 'war', 'warfare', 'conflict', 'military',
    'troops', 'soldiers', 'airstrike', 'airstrikes', 'missile', 'missiles',
    'drone', 'drones', 'border', 'borders', 'refugee', 'refugees',
    'migration', 'migrants', 'humanitarian', 'sanctions', 'alliance',
    'peace', 'invasion', 'invade', 'hostage', 'hostages', 'delegation',
    'accord', 'pact', 'geopolitical', 'security council', 'peacekeeping',
    'extradition', 'visa', 'deportation', 'deported', 'genocide', 'occupation',
    'nuclear', 'defence', 'defense', 'envoy', 'overseas', 'airspace',
    'warship', 'warplane', 'insurgent', 'insurgents', 'militia',
  ],
  economy: [
    'economy', 'economic', 'economist', 'economists', 'gdp', 'growth',
    'inflation', 'deflation', 'recession', 'slowdown', 'unemployment',
    'jobless', 'employment', 'trade', 'tariff', 'tariffs', 'export',
    'exports', 'import', 'imports', 'supply chain', 'manufacturing',
    'factory', 'factories', 'industry', 'industrial', 'infrastructure',
    'budget', 'deficit', 'surplus', 'debt', 'fiscal', 'subsidy', 'subsidies',
    'productivity', 'wages', 'wage', 'cost of living', 'consumer prices',
    'output', 'agriculture', 'farmers', 'labour market', 'labor market',
    'investment', 'imf', 'world bank', 'austerity', 'stimulus', 'gst',
    'taxes', 'taxation', 'spending', 'poverty', 'households',
  ],
  finance: [
    'market', 'markets', 'stock', 'stocks', 'share price', 'equities',
    'equity', 'index', 'indices', 'sensex', 'nifty', 'nasdaq', 'dow jones',
    'ftse', 'bourse', 'bond', 'bonds', 'yield', 'yields', 'currency',
    'currencies', 'rupee', 'dollar', 'euro', 'pound', 'yen', 'yuan', 'forex',
    'exchange rate', 'bank', 'banks', 'banking', 'lender', 'lenders',
    'interest rate', 'interest rates', 'rate cut', 'rate hike', 'central bank',
    'federal reserve', 'ipo', 'earnings', 'profit', 'profits', 'revenue',
    'shareholder', 'shareholders', 'dividend', 'crypto', 'cryptocurrency',
    'bitcoin', 'fund', 'funds', 'investor', 'investors', 'valuation',
    'merger', 'acquisition', 'takeover', 'trading', 'trader', 'traders',
    'crude', 'oil prices', 'bullion', 'commodity', 'commodities', 'fintech',
    'insurance', 'loan', 'loans', 'bankruptcy', 'payouts',
  ],
}

/** Word-bounded matchers, built once per segment. Global, so hits are counted. */
const TOPIC_RE = Object.fromEntries(
  Object.entries(TOPIC_TERMS).map(([seg, terms]) => [
    seg,
    new RegExp(
      `(?<!\\p{L})(?:${terms
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length)
        .join('|')})(?!\\p{L})`,
      'giu',
    ),
  ]),
) as Record<Exclude<Segment, 'headline'>, RegExp>

const TOPIC_SEGMENTS = Object.keys(TOPIC_RE) as Exclude<Segment, 'headline'>[]

export function topicScore(text: string, segment: Segment): number {
  const re = TOPIC_RE[segment as Exclude<Segment, 'headline'>]
  return re ? (text.match(re)?.length ?? 0) : 0
}

/**
 * Does this article belong in this section?
 *
 * Headlines is the catch-all top-stories view and is deliberately ungated.
 * Everywhere else the article has to score for the section AND score at least
 * as well there as in any other — a single shared word is not enough to claim
 * a story when another desk's vocabulary is all over it. That second half is
 * what keeps a cost-of-living piece out of World and a budget piece out of
 * Finance when Economy fits it better.
 *
 * A desk feed only skips the check when NO section claims the story: BBC
 * Politics filing something the vocabularies don't recognise should still run
 * under Politics, but the Guardian's world feed carrying "UK politics live"
 * should not run under World.
 */
export function onTopic(a: Article, segment: Segment): boolean {
  if (segment === 'headline') return true

  const text = `${a.headline} ${a.description}`
  const own = topicScore(text, segment)
  const best = Math.max(...TOPIC_SEGMENTS.map(s => topicScore(text, s)))

  if (own > 0) return own >= best
  return a.fromDesk === true && best === 0
}

/**
 * Below this, a gated section is treated as having been cut too thin and the
 * ungated pool is used instead. A loose section beats an empty one: most of the
 * 200 countries are covered by a handful of stories at any moment, and gating
 * those away would leave their Economy and Finance tabs blank.
 */
const MIN_GATED = 4

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

/**
 * Collapse key for near-identical stories.
 *
 * The old key — the first 70 characters, lowercased — only caught byte-exact
 * leads. Wire copy gets lightly reworded per outlet ("Denmark stocks higher at
 * close of trade" vs "Denmark shares higher at close of trade"), which differed
 * at character 9 and so shipped as two cards. Reducing to a sorted set of
 * significant words catches those while leaving genuinely different stories
 * apart.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it',
  'its', 'that', 'this', 'after', 'over', 'into', 'up', 'down', 'out', 'new',
  'says', 'say', 'said', 'will', 'has', 'have', 'had', 'amid',
])

function storyTokens(headline: string): Set<string> {
  // Percentages and index levels change between reruns of the same wire story,
  // so numbers are dropped and only the distinct significant words are kept.
  return new Set(
    headline
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  const union = a.size + b.size - shared
  return union === 0 ? 0 : shared / union
}

/**
 * Above this, two headlines are treated as the same story. Outlets reword wire
 * copy just enough to defeat an exact key — "Denmark stocks higher at close of
 * trade" and "Denmark shares higher at close of trade" differ by one word and
 * shipped as two cards. Distinct stories about the same subject land far below
 * this: two separate Denmark economy pieces scored 0.14.
 */
const SAME_STORY = 0.6

/**
 * Above this, two stories are *about* the same event without being the same
 * copy — enough to list one under the other as related coverage, not enough to
 * drop either from the deck.
 *
 * One threshold was doing two jobs and only doing the first well. At 0.6 the
 * clustering caught near-verbatim wire reprints and almost nothing else: a
 * sample of 357 stories had a sibling 7% of the time, and those siblings were
 * mostly the same syndicated copy under a different edition name. Two
 * newsrooms writing up the same event in their own words land well below it.
 *
 * The two jobs can afford different error rates, which is why they now get
 * different numbers. Merging two distinct stories removes one from the page
 * and is expensive, so that stays strict. Listing a loosely-related story
 * under "Also reported by" costs a reader one glance, so that can afford to be
 * generous. Distinct stories on unrelated subjects score around 0.14, well
 * clear of this.
 */
const RELATED_STORY = 0.42

/**
 * Normalised newsroom identity, used to cap how much of a section one outlet
 * takes. Syndication networks publish the same piece under per-edition names —
 * "Investing.com", "Investing.com UK", "Investing.com India" — which read as
 * three newsrooms and slipped past a cap keyed on the raw string. When the name
 * carries a domain, the domain is the identity.
 */
export function sourceKey(source: string): string {
  // A leading article is styling, not identity: feeds carry both "New York
  // Times" and "The New York Times", and treating them as two newsrooms put
  // the paper in its own "Also reported by" list.
  const s = source.trim().toLowerCase().replace(/^the\s+/, '')
  const domain = s.match(/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|vn|in|co|news|io|gov)\b/)
  return domain ? domain[0] : s
}

/**
 * Caps how much of a section any one newsroom can take.
 *
 * Ranking alone gave every curated item the same +4, leaving publish time to
 * order them — so India's Headlines came back 9-of-12 Business Standard and its
 * Politics 11-of-12 Economic Times, which reads as one outlet's wire rather
 * than a view of the country. Ranked order is otherwise preserved; anything
 * held back by the cap is appended afterwards, so a quiet country covered by a
 * single outlet still fills its section instead of going half empty.
 */
/**
 * The section an article reads as, regardless of which one it was filed under.
 * `general` covers everything the vocabularies don't recognise — sport,
 * culture, weather, crime — which is a legitimate front-page category, not a
 * failure to classify.
 */
export function topicKey(a: Article): string {
  const text = `${a.headline} ${a.description}`
  let bestSegment = 'general'
  let best = 0
  for (const segment of TOPIC_SEGMENTS) {
    const score = topicScore(text, segment)
    if (score > best) {
      best = score
      bestSegment = segment
    }
  }
  return bestSegment
}

/**
 * How far apart two stories on the same topic have to sit.
 *
 * The nth story of a topic may not appear before position n * STRIDE, so the
 * first five slots hold at most three of any one topic. Scales with the list
 * instead of being a fixed quota: a 40-item page still ends up mostly world
 * stories if that is all the country has, it just doesn't open with five.
 */
const SPREAD_STRIDE = 2

/**
 * Interleaves topics through a ranked list, for Headlines only.
 *
 * Headlines is the ungated catch-all, so for a country whose coverage is mostly
 * foreign-desk reporting it came back reading like a second copy of World —
 * the same stories, in the same order, one section higher. Gating it would be
 * wrong (a war IS the top story), so instead the ranking is preserved and
 * repeats of a topic are pushed down to make room for the next-best story on a
 * different one. When nothing else is left, the stride is ignored and ranked
 * order resumes, so a single-topic country still fills its page.
 */
export function spreadTopics(ranked: Article[]): Article[] {
  const remaining = [...ranked]
  const out: Article[] = []
  const used = new Map<string, number>()

  while (remaining.length > 0) {
    let i = remaining.findIndex(
      a => (used.get(topicKey(a)) ?? 0) * SPREAD_STRIDE <= out.length,
    )
    if (i < 0) i = 0
    const [next] = remaining.splice(i, 1)
    const key = topicKey(next)
    used.set(key, (used.get(key) ?? 0) + 1)
    out.push(next)
  }

  return out
}

function capPerSource(ranked: Article[], limit: number): Article[] {
  const cap = Math.max(2, Math.ceil(limit / 4))
  const used = new Map<string, number>()
  const picked: Article[] = []
  const overflow: Article[] = []

  for (const a of ranked) {
    const key = sourceKey(a.source)
    const n = used.get(key) ?? 0
    if (n < cap && picked.length < limit) {
      used.set(key, n + 1)
      picked.push(a)
    } else {
      overflow.push(a)
    }
  }

  return picked.concat(overflow).slice(0, limit)
}

/**
 * Which other newsrooms are worth a row, when there are only three.
 *
 * Syndication fans a single piece out across affiliates — an NPR story lands
 * on member stations, an AP story on local papers — and those are the same
 * copy under new mastheads, not another newsroom's account. They can't be
 * spotted by name, but they can be outranked: a reader who hit a paywall is
 * looking for somewhere they recognise, so known outlets take the rows first
 * and the rest fill what's left.
 */
export function relatedRank(source: string): number {
  const key = sourceKey(source)
  if (SOURCE_NAMES.some(n => sourceKey(n) === key)) return 0 // our own newsrooms
  if (REPUTABLE.has(source.trim().toLowerCase())) return 1
  if (accessFor(source)) return 2                            // one we can label
  return 3
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
  /** True when the feed is the segment's own desk, so the topic check is skipped. */
  fromDesk?: boolean
  /** Other newsrooms that filed the same story, folded in by the clustering below. */
  alsoReportedBy?: RelatedReport[]
}

/** One other newsroom's take on the same story. */
export interface RelatedReport {
  source: string
  url: string
  publishedAt: string
}

/**
 * How many other newsrooms to carry per story. Three is what the popup can
 * show without turning into a list, and the cluster is ranked, so these are
 * the three that outranked the rest.
 */
const MAX_RELATED = 3

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

/**
 * Drops a description that only repeats the headline.
 *
 * Google News sets each item's description to the title followed by the
 * publisher, so the card and the popup both showed the headline twice — once
 * as the headline and once as the blurb, the second copy trailing an outlet
 * name. Nothing is lost by saying nothing.
 */
function usefulDescription(description: string, headline: string): string {
  const flatten = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const d = flatten(description)
  const h = flatten(headline)
  if (!d || d === h || d.startsWith(h)) return ''
  return description
}

async function fetchFeed(feed: Feed, segment: Segment): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorldPulse/1.0)' },
      // Every feed is fetched in parallel, so a page waits for the SLOWEST
      // one — this number is the page's worst case, not one feed's budget.
      // At 8s a single hanging newsroom held a whole country page: measured,
      // most feeds answer in under 2s, Euronews took 3.9s and the Guardian
      // hung past 20. Dropping a straggler costs one source out of fifteen
      // and the section fills from the rest; waiting for it costs everyone.
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
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
      const headline = feed.dynamicSource ? stripSourceSuffix(rawTitle, source) : rawTitle
      return {
        id: `${source}-${segment}-${i}`,
        headline,
        description: usefulDescription(
          cleanText(item.description ?? item.summary).slice(0, 180),
          headline,
        ),
        source,
        url: pickLink(item) || '#',
        publishedAt: pickDate(item),
        imageUrl: extractImage(item),
        segment,
        impliedCountry: feed.implies,
        viaSearch: feed.dynamicSource === true,
        fromDesk: feed.desk === true,
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
    ? [...curated, googleNewsFeed(country.name)]
    : curated

  const all = (await Promise.all(feeds.map(f => fetchFeed(f, segment)))).flat()

  const code = countryCode.toUpperCase()
  const matched = all.filter(a =>
    a.impliedCountry === code || matchesCountry(`${a.headline} ${a.description}`, code),
  )

  // Non-English items and government press offices are dropped BEFORE
  // clustering, not after. Filtering afterwards could discard the one member
  // of a cluster that survived — its English twin having already been folded
  // in as a sibling — and take the whole story off the page with it.
  const english = matched.filter(
    a =>
      latinRatio(a.headline) >= 0.6 &&
      latinRatio(a.source) >= 0.6 &&
      !/\.gov(\.[a-z]{2})?$/i.test(a.source.trim()),
  )

  // Cluster the retellings instead of throwing them away.
  //
  // This loop used to be a filter that dropped near-identical headlines, which
  // is right for the deck — nobody wants the same wire story five times — but
  // it was discarding the answer to "who else covered this". The duplicates
  // now ride along on the story that outranked them, which is what powers
  // "Also reported by" and, when the outlet you landed on is paywalled, the
  // free way in.
  const seenUrl = new Set<string>()
  const kept: Article[] = []
  const keptTokens: Set<string>[] = []
  const related: RelatedReport[][] = []

  for (const a of english) {
    if (seenUrl.has(a.url)) continue
    seenUrl.add(a.url)

    // Very short headlines carry too little signal for a similarity test, so
    // they stand alone rather than risk being folded into the wrong story.
    const tokens = storyTokens(a.headline)
    const twin = tokens.size >= 4
      ? keptTokens.findIndex(t => jaccard(tokens, t) >= SAME_STORY)
      : -1

    if (twin === -1) {
      kept.push(a)
      keptTokens.push(tokens)
      related.push([])
      continue
    }

    // One row per newsroom, keyed the way the per-source cap keys it.
    // Syndication networks publish per-edition names — "Investing.com",
    // "Investing.com UK", "Investing.com India" — which are one newsroom
    // wearing three badges. Comparing the raw strings listed all three as
    // separate outlets, which is the opposite of what this list is for.
    const group = related[twin]
    const outlet = sourceKey(a.source)
    const duplicateOutlet =
      outlet === sourceKey(kept[twin].source) ||
      group.some(r => sourceKey(r.source) === outlet)
    // Gathered without a cap; which three survive is decided by rank below.
    if (!duplicateOutlet) {
      group.push({ source: a.source, url: a.url, publishedAt: a.publishedAt })
    }
  }

  // Second pass, for the other kind of sibling: stories distinct enough to
  // each keep their own place in the deck that are nonetheless the same event
  // from another newsroom. The first pass only ever sees reprints, because
  // anything that scored high enough to be folded in was by definition a copy.
  for (let i = 0; i < kept.length; i++) {
    if (keptTokens[i].size < 4) continue
    const ownOutlet = sourceKey(kept[i].source)

    for (let j = 0; j < kept.length; j++) {
      if (i === j || keptTokens[j].size < 4) continue
      if (jaccard(keptTokens[i], keptTokens[j]) < RELATED_STORY) continue

      const outlet = sourceKey(kept[j].source)
      if (outlet === ownOutlet) continue
      if (related[i].some(r => sourceKey(r.source) === outlet)) continue

      related[i].push({
        source: kept[j].source,
        url: kept[j].url,
        publishedAt: kept[j].publishedAt,
      })
    }
  }

  const deduped = kept.map((a, i) => {
    if (related[i].length === 0) return a
    const top = [...related[i]]
      .sort((x, y) => relatedRank(x.source) - relatedRank(y.source))
      .slice(0, MAX_RELATED)
    return { ...a, alsoReportedBy: top }
  })

  // Keep only items that actually belong in this section. When the gate leaves
  // too little to fill a page the rest of the pool is added back, but on-topic
  // items still rank above it — replacing the gated set outright, as this used
  // to, handed Brazil a World section that was nothing but election coverage.
  const gated = deduped.filter(a => onTopic(a, segment))
  const inGate = new Set(gated)
  const pool = gated.length >= MIN_GATED ? gated : deduped

  const ranked = [...pool].sort((a, b) => {
    const gate = Number(inGate.has(b)) - Number(inGate.has(a))
    if (gate !== 0) return gate
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

  const composed = segment === 'headline' ? spreadTopics(chosen) : chosen

  return { articles: capPerSource(composed, limit), fetchedAt: new Date().toISOString() }
}

export interface PulseEntry {
  /** Segment this country stands out in right now. */
  segment: Segment
  /** Matching articles in that segment. */
  count: number
  /** Matching articles across all segments. */
  total: number
  /**
   * True when this reading came from the per-country search rather than the
   * curated wires. The two are not on the same scale — a search returns around
   * a hundred items for any country that exists, while a curated count is a
   * share of a few hundred wire stories — so the map must not rank one against
   * the other. See `tierFor` in WorldMap.
   */
  viaSearch?: boolean
}

/**
 * How many countries one batched pulse request may cover.
 *
 * Each code costs one Google News search, so this is the knob that keeps the
 * map's long-tail fill under the rate limit. Google answers a burst of this
 * size happily and starts returning 302s to /sorry/ long before a request of
 * ten times it would finish.
 */
export const PULSE_BATCH = 12

/**
 * Pulse for countries the curated wires don't reach, read from the same
 * per-country search the country pages use.
 *
 * Without this the map contradicted the product: Luxembourg's page carried 24
 * stories while its bubble sat grey, and so did 98 others. The cause was that
 * getPulseMap below reads ONLY the 15 curated newsrooms, while a country page
 * reads those plus the per-country search — which is the very thing that gives
 * the long tail its coverage. Half the world was reported as quiet because the
 * map was looking at a narrower feed set than the pages it links to.
 *
 * One search per country, not one per section: the single unsegmented query is
 * the broadest net, and the returned stories are sorted into sections with
 * topicKey — the same vocabulary the pages file by, so the bubble's colour and
 * the page's sections now come from one classifier instead of two.
 */
export async function getSearchPulse(
  codes: string[],
): Promise<Record<string, PulseEntry | null>> {
  const entries = await Promise.all(
    codes.slice(0, PULSE_BATCH).map(async (code): Promise<[string, PulseEntry | null]> => {
      const country = getCountryByCode(code.toUpperCase())
      if (!country) return [code, null]

      const items = await fetchFeed(googleNewsFeed(country.name), 'headline')

      const matched = items.filter(
        a =>
          matchesCountry(`${a.headline} ${a.description}`, country.code) &&
          latinRatio(a.headline) >= 0.6 &&
          latinRatio(a.source) >= 0.6 &&
          !/\.gov(\.[a-z]{2})?$/i.test(a.source.trim()),
      )
      if (matched.length === 0) return [country.code, null]

      // Only the classified stories get a vote. Counting `general` alongside
      // them made it win almost every time — most headlines use none of the
      // section vocabularies — and every long-tail country came back
      // "headlines", which would have painted that whole half of the map one
      // colour. Falling back to headlines when NOTHING classifies is right;
      // letting the unclassified outvote the classified is not.
      const counts = new Map<Segment, number>()
      for (const a of matched) {
        const key = topicKey(a)
        if (key === 'general') continue
        counts.set(key as Segment, (counts.get(key as Segment) ?? 0) + 1)
      }

      let best: Segment = 'headline'
      let bestCount = 0
      for (const [segment, n] of counts) {
        if (n > bestCount) {
          best = segment
          bestCount = n
        }
      }

      return [
        country.code,
        {
          segment: best,
          count: bestCount || matched.length,
          total: matched.length,
          viaSearch: true,
        },
      ]
    }),
  )

  return Object.fromEntries(entries)
}

/**
 * Dominant segment per country, computed in a single pass.
 *
 * The map used to call /api/news once per country per segment — 49 × 5 = 245
 * round trips on every dashboard load. Here the feeds are pulled once (and are
 * cache-warm anyway) and every country is scored in memory.
 *
 * The winner is picked on SHARE of a segment's pool, not raw count. Headlines
 * draws on 14 feeds while finance draws on 10, so a raw-count comparison handed
 * headlines the win almost every time — half the live map came back the same
 * blue. Normalising by pool size asks the sharper question: which desk is this
 * country disproportionately showing up in?
 */
export async function getPulseMap(
  codes: string[],
): Promise<Record<string, PulseEntry | null>> {
  const bySegment = await Promise.all(
    SEGMENT_IDS.map(async segment => ({
      segment,
      // Gated the same way the country pages are, so a bubble's colour names a
      // section the page will actually show. Ungated, an Arab News markets
      // story counted towards Politics here and then wasn't there on the page.
      items: (await Promise.all((RSS_FEEDS[segment] ?? []).map(f => fetchFeed(f, segment))))
        .flat()
        .filter(a => onTopic(a, segment)),
    })),
  )

  const out: Record<string, PulseEntry | null> = {}

  for (const code of codes) {
    let best: { segment: Segment; count: number; share: number } | null = null
    let total = 0

    for (const { segment, items } of bySegment) {
      const count = items.filter(a =>
        a.impliedCountry === code || matchesCountry(`${a.headline} ${a.description}`, code),
      ).length
      total += count
      if (count === 0) continue

      const share = count / Math.max(items.length, 1)
      // Share decides; raw count breaks ties so a 1-of-40 blip can't outrank
      // a desk that genuinely filed more on this country.
      if (!best || share > best.share || (share === best.share && count > best.count)) {
        best = { segment, count, share }
      }
    }

    out[code] = best ? { segment: best.segment, count: best.count, total } : null
  }

  return out
}
