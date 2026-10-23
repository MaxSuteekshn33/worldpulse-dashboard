/**
 * The newsrooms WorldPulse pulls from.
 *
 * Kept separate from lib/news.ts so the UI can show the count without pulling
 * the XML parser and the whole fetch pipeline into the client bundle. It also
 * removes a staleness bug: the dashboard used to read this over /api/meta,
 * which was cached for an hour, so the figure lagged behind a deploy.
 */
export const SOURCE_NAMES = [
  'BBC',
  'The Guardian',
  'Al Jazeera',
  'New York Times',
  'Euronews',
  'Deutsche Welle',
  'Arab News',
  'AllAfrica',
  'Channel News Asia',
  'MercoPress',
  'ABC News',
  'Indian Express',
  'Economic Times',
  'Business Standard',
  'Sky News',
] as const

export const SOURCE_COUNT = SOURCE_NAMES.length

/**
 * How much of a publisher's journalism a reader can reach without paying.
 *
 * - `free`        — open to read.
 * - `metered`     — a few articles free, then a wall.
 * - `subscription`— paywalled in the general case.
 *
 * Deliberately a hand-maintained list and deliberately incomplete. A sample of
 * 473 articles across 40 country sections came from 136 publishers, 86 of which
 * appeared exactly once — but the top ~22 accounted for two thirds of
 * everything shown. So classifying a few dozen covers most of what a reader
 * meets, and the long tail is left unlabelled rather than guessed at.
 *
 * Unlabelled is a real answer here. A stale `free` badge is worse than no
 * badge: Reuters is the fourth most common publisher in our data and has been
 * metered since 2021, which is exactly the kind of drift this list has to stay
 * humble about. Nothing goes in without reasonable confidence, and a wrong
 * entry is a bug worth fixing.
 */
export type Access = 'free' | 'metered' | 'subscription'

const ACCESS: Record<string, Access> = {
  // Open
  'bbc': 'free',
  'bbc news': 'free',
  'the guardian': 'free',
  'al jazeera': 'free',
  'euronews': 'free',
  'deutsche welle': 'free',
  'dw': 'free',
  'dw.com': 'free',
  'arab news': 'free',
  'allafrica': 'free',
  'allafrica.com': 'free',
  'channel news asia': 'free',
  'cna': 'free',
  'mercopress': 'free',
  'abc news': 'free',
  'abc.net.au': 'free',
  'sky news': 'free',
  'france 24': 'free',
  'ndtv': 'free',
  'ap news': 'free',
  'associated press': 'free',
  'anadolu agency': 'free',
  'yonhap': 'free',
  'al arabiya': 'free',
  'the moscow times': 'free',
  'rte': 'free',
  'press trust of india': 'free',
  'pti': 'free',
  'premium times nigeria': 'free',
  'punch newspapers': 'free',
  'the citizen': 'free',

  // Some free reading, then a wall
  'reuters': 'metered',
  'the washington post': 'metered',
  'washington post': 'metered',
  'south china morning post': 'metered',
  'scmp': 'metered',
  'the japan times': 'metered',
  'nikkei asia': 'metered',
  'the straits times': 'metered',
  'the korea herald': 'metered',
  'economic times': 'metered',
  'business standard': 'metered',
  'indian express': 'metered',
  'the indian express': 'metered',
  'the hindu': 'metered',
  'hindustan times': 'metered',
  'mint': 'metered',
  'the jerusalem post': 'metered',
  'the africa report': 'metered',
  'the irish times': 'metered',
  'the independent': 'metered',

  // Paywalled in the general case
  'new york times': 'subscription',
  'the new york times': 'subscription',
  'financial times': 'subscription',
  'the economist': 'subscription',
  'wall street journal': 'subscription',
  'the wall street journal': 'subscription',
  'bloomberg': 'subscription',
  'bloomberg.com': 'subscription',
  'the telegraph': 'subscription',
  'haaretz': 'subscription',
}

/** Undefined means "we don't know", which the UI shows as nothing at all. */
export function accessFor(source: string): Access | undefined {
  return ACCESS[source.trim().toLowerCase()]
}

/** Labels are about the PUBLISHER, never a promise about one article. */
export const ACCESS_LABEL: Record<Access, string> = {
  free: 'Free to read',
  metered: 'Limited free reads',
  subscription: 'Subscription',
}
