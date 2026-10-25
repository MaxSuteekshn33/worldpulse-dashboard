/**
 * Photographs of ships, from Wikimedia Commons.
 *
 * Commons is the only source of ship photographs that is actually free to
 * use. The sites with real coverage — MarineTraffic, VesselFinder,
 * ShipSpotting — hold user-submitted photographs under ordinary copyright and
 * put the useful queries behind paid APIs, so taking pictures from them would
 * be both a licence problem and a terms problem. Commons is openly licensed
 * by construction, and the licence and author it returns are displayed with
 * every picture because that is what those licences ask for.
 *
 * The price is coverage, and it is steep: Commons has photographs of famous
 * hulls, ferries and warships, not of the chemical tanker that happens to be
 * crossing the Dover Strait this afternoon.
 *
 * The real difficulty is not coverage but false matches, which were measured
 * before any of this was written. Searching Commons for the vessel names
 * actually in the feed returned a picture for half of them — and several were
 * the wrong ship entirely: "NEW HAMPSHIRE" returned a nineteenth-century US
 * Navy vessel, and "SPARTEL" returned a painting of a seventeenth-century
 * battle off Cape Spartel. A map that shows a painting of a sea battle as the
 * tanker you just clicked is worse than a map with no pictures on it.
 *
 * So matches are graded, and the grade is shown:
 *
 *   - `verified`: the file's own page carries this ship's IMO number or MMSI.
 *     That is the hull's identity, so the picture is this ship. Measured at
 *     about one ship in twenty, which is the honest ceiling for free imagery.
 *   - `name`: the file's title carries the vessel's name as whole words and
 *     the page is about a ship. Shown, and captioned as possibly another
 *     vessel of the same name, because that is exactly what it may be.
 *
 * Anything weaker is not shown at all.
 */

const API = 'https://commons.wikimedia.org/w/api.php'

/**
 * Wikimedia asks for a user agent that says who is calling and how to reach
 * them, and blocks ones that do not.
 */
const USER_AGENT = 'WorldPulse/1.0 (+https://worldpulse-dashboard-gov9.vercel.app)'

/** How long a lookup — including a miss — is remembered, in seconds. */
export const PHOTO_TTL = 24 * 60 * 60

export interface ShipPhoto {
  /** A thumbnail, already sized; Commons originals can be 20MB. */
  url: string
  width: number
  height: number
  /** The file's page on Commons, for the licence and the full-size image. */
  pageUrl: string
  title: string
  /** Who took it. Required by every licence Commons uses. */
  artist: string | null
  /** The licence it is offered under, e.g. 'CC BY-SA 4.0'. */
  licence: string | null
  /** How sure we are that this is the ship in question. */
  match: 'verified' | 'name'
}

interface CommonsPage {
  title?: string
  categories?: { title?: string }[]
  imageinfo?: {
    thumburl?: string
    thumbwidth?: number
    thumbheight?: number
    descriptionurl?: string
    extmetadata?: Record<string, { value?: string } | undefined>
  }[]
}

/**
 * Whether an identifier is the shape its standard says it is.
 *
 * Not pedantry — a guard against the search engine. `insource:"1"` matches
 * any page containing a 1, which is all of them, and the first result came
 * back as a photograph of a duck that this code was about to label a
 * confirmed match for the ship. An MMSI is nine digits and an IMO number is
 * seven; anything else never reaches the query.
 */
export function usableMmsi(mmsi: number): boolean {
  return Number.isInteger(mmsi) && mmsi >= 100_000_000 && mmsi <= 999_999_999
}

export function usableImo(imo: number | undefined): imo is number {
  return Number.isInteger(imo) && (imo as number) >= 1_000_000 && (imo as number) <= 9_999_999
}

/** Commons returns HTML in the metadata fields; this is a panel, not a page. */
function plain(html: string | undefined): string | null {
  if (!html) return null
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, 90) : null
}

async function search(query: string, limit: number): Promise<CommonsPage[]> {
  const url = `${API}?${new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    // Namespace 6 is File:, so this never returns articles.
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo|categories',
    iiprop: 'url|extmetadata',
    iiurlwidth: '480',
    // Categories come back in the same round trip and are what prove the
    // file is of a ship at all; see `looksMaritime`.
    cllimit: 'max',
  })}`

  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const body = await res.json()
  return Object.values(body?.query?.pages ?? {}) as CommonsPage[]
}

/**
 * Whether the identifier really is on the file, rather than merely matched.
 *
 * `insource` searches the whole wikitext, which carries dimensions, dates,
 * camera settings and file sizes, so a nine-digit run can be matched by
 * something that is not an identifier at all. The number has to be findable
 * in the file's own title or description before this is called confirmation
 * — "verified" is the one label on this panel that must never be wrong.
 */
function mentions(page: CommonsPage, id: number): boolean {
  const meta = page.imageinfo?.[0]?.extmetadata ?? {}
  const haystack = [
    page.title ?? '',
    plain(meta.ImageDescription?.value) ?? '',
    plain(meta.ObjectName?.value) ?? '',
  ].join(' ')
  return haystack.includes(String(id))
}

/**
 * Whether a file is actually about a ship.
 *
 * A name alone is not enough and the measurements said so plainly. Searching
 * the real vessel names in the feed returned, among the genuine ship
 * photographs, a tourist launch on Lake Titicaca for "TOURIST", a ceiling
 * painting for "APOTHEOSE", and — for "ROXANNA" — a press photograph of a
 * US congresswoman. The caption on a name match says the picture may be a
 * different vessel of the same name, which is a fair warning about the wrong
 * ship and a false one about a photograph with no ship in it.
 *
 * Commons categorises heavily, so the categories are the cheap, reliable
 * test, and they ride along in the same request as everything else.
 */
const MARITIME = /ship|vessel|boat|tanker|ferr(y|ies)|barge|tug|freighter|watercraft|imo \d|maritime|harbou?r|port of|shipping/i

function looksMaritime(page: CommonsPage): boolean {
  return (page.categories ?? []).some(c => MARITIME.test(c.title ?? ''))
}

/** Photographs only. Commons files include diagrams, flags and PDFs. */
function isPhoto(page: CommonsPage): boolean {
  return /\.(jpe?g|png|webp)$/i.test(page.title ?? '')
}

function toPhoto(page: CommonsPage, match: ShipPhoto['match']): ShipPhoto | null {
  const info = page.imageinfo?.[0]
  if (!info?.thumburl || !info.descriptionurl) return null
  const meta = info.extmetadata ?? {}
  return {
    url: info.thumburl,
    width: info.thumbwidth ?? 480,
    height: info.thumbheight ?? 320,
    pageUrl: info.descriptionurl,
    title: (page.title ?? '').replace(/^File:/, ''),
    artist: plain(meta.Artist?.value),
    licence: plain(meta.LicenseShortName?.value),
    match,
  }
}

/**
 * Whether a file's title carries this vessel's name as whole words.
 *
 * The reason this is not a substring test: Commons' own search treats a
 * quoted title as a prefix, so asking for "NEW HAMPSHIRE" returned
 * "Navire NEW HAMPSHIRE TRADER en mer" — a different ship whose name merely
 * begins the same way. Requiring a non-word character on each side rejects
 * that while still accepting "Car carrier NEPTUNE KALLOS au port".
 */
export function titleNames(title: string, name: string): boolean {
  const clean = name.trim().replace(/[^\w\s-]/g, '')
  if (clean.length < 4) return false
  const pattern = new RegExp(`(^|[^\\w])${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w]|$)`, 'i')
  return pattern.test(title)
}

/**
 * Finds a photograph of one ship, or nothing.
 *
 * Identity first: a file whose page quotes the IMO number or the MMSI is this
 * hull, whatever it is called today. Only if that fails does it fall back to
 * the name, and that result is labelled as the weaker thing it is.
 */
export async function findShipPhoto(
  name: string,
  mmsi: number,
  imo?: number,
): Promise<ShipPhoto | null> {
  const vesselName = name.trim()
  const unnamed = !vesselName || /^unknown/i.test(vesselName)

  // `insource` is an exact text search over the page itself, unlike the
  // default search, which is fuzzy enough to match a ship's name from a
  // number and return a photograph of an eagle. Both identifiers are checked
  // for shape first and then confirmed on the file that comes back, because
  // a match from the search engine is a candidate and not yet a fact.
  const identity: { id: number }[] = []
  if (usableImo(imo)) identity.push({ id: imo })
  if (usableMmsi(mmsi)) identity.push({ id: mmsi })

  for (const { id } of identity) {
    const pages = (await search(`insource:"${id}"`, 4)).filter(isPhoto)
    for (const page of pages) {
      if (!mentions(page, id)) continue
      const photo = toPhoto(page, 'verified')
      if (photo) return photo
    }
  }

  if (unnamed) return null

  const pages = (await search(`intitle:"${vesselName}" ship`, 8)).filter(isPhoto)
  for (const page of pages) {
    if (!titleNames(page.title ?? '', vesselName)) continue
    if (!looksMaritime(page)) continue
    const photo = toPhoto(page, 'name')
    if (photo) return photo
  }

  return null
}

/**
 * One lookup per ship, remembered.
 *
 * Misses are remembered too, and that is the point: most ships have no
 * photograph, so without this every pan that reopened a panel would be
 * another round trip to Commons to be told so again.
 */
const held = new Map<number, { at: number; photo: ShipPhoto | null }>()

export async function shipPhoto(
  name: string,
  mmsi: number,
  imo?: number,
): Promise<ShipPhoto | null> {
  const have = held.get(mmsi)
  if (have && Date.now() - have.at < PHOTO_TTL * 1000) return have.photo

  try {
    const photo = await findShipPhoto(name, mmsi, imo)
    held.set(mmsi, { at: Date.now(), photo })
    return photo
  } catch {
    // A failed lookup is not a miss: not remembered, so it is tried again.
    return null
  }
}
