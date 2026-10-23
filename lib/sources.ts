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
