import Landing, { type Highlight } from '@/components/Landing'
import { FEATURED_CODES, getCountryByCode } from '@/lib/countries'
import { getSegmentNews } from '@/lib/news'

/** Same 20-minute cycle as every other page that carries news. */
export const revalidate = 1200

/**
 * The landing page used to be a client component end to end, and said "The
 * world is happening" over a decorative map with nothing to back it up. It is
 * a server component now purely so it can fetch a few real stories; the page
 * itself still renders in `components/Landing.tsx`, which needs the viewport
 * hook and so has to stay on the client.
 *
 * Only the featured countries, and only their top story each — those five
 * pages are prerendered anyway, so their feeds are already being fetched and
 * Next's cache means this costs close to nothing.
 */
export default async function Page() {
  const settled = await Promise.all(
    FEATURED_CODES.map(async (code): Promise<Highlight | null> => {
      const country = getCountryByCode(code)
      if (!country) return null

      const { articles } = await getSegmentNews(code, 'headline', 1)
      const top = articles[0]
      if (!top) return null

      return {
        code,
        flag: country.flag,
        name: country.name,
        headline: top.headline,
        source: top.source,
        publishedAt: top.publishedAt,
      }
    }),
  )

  return <Landing highlights={settled.filter((h): h is Highlight => h !== null)} />
}
