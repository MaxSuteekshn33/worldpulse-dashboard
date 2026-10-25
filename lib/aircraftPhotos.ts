/**
 * Photographs of aircraft, from Planespotters.
 *
 * The sibling of `lib/shipPhotos.ts`, and a far easier problem, for one
 * reason: an aircraft has a registration. `G-EZWR` is one airframe and
 * nothing else, so a lookup by registration is an identity lookup — where a
 * ship's name is shared by tugs, frigates, river cruisers and the occasional
 * seventeenth-century painting, and had to be graded and hedged.
 *
 * That is why this uses Planespotters rather than Wikimedia Commons, which
 * is what the ships use. Commons is the only free source with ship
 * photographs at all; for aircraft, Planespotters publishes a keyless public
 * API keyed by exactly the identifier we already hold, and the measured
 * coverage is not close: ten out of ten civil aircraft over London returned
 * their own airframe, against about half the fleet for ships and most of
 * those only a name match.
 *
 * Their terms are specific and this code and its panel meet all of them:
 *
 *   - free, no key, and no paywalling — this dashboard is public
 *   - the photographer is credited beside every photograph
 *   - the image links back to its page on Planespotters, using the `link`
 *     the API itself returns, and that link does not carry `nofollow`
 *   - lookups are cached per airframe, including misses, and happen only
 *     when a panel is opened, so nothing here is bursty
 *
 * Military airframes are hit and miss — serials are catalogued less
 * consistently than civil registrations, measured at two of five — and a
 * miss shows nothing rather than a placeholder.
 */

const API = 'https://api.planespotters.net/pub/photos'

/** Who is asking, as every open feed in this project is told. */
const USER_AGENT = 'WorldPulse/1.0 (+https://worldpulse-dashboard-gov9.vercel.app)'

/** How long a lookup — including a miss — is remembered, in seconds. */
export const AIR_PHOTO_TTL = 24 * 60 * 60

export interface AircraftPhoto {
  url: string
  width: number
  height: number
  /** The photo's page on Planespotters. Required to be linked. */
  link: string
  /** Required to be shown beside the image. */
  photographer: string | null
}

interface RawPhoto {
  thumbnail_large?: { src?: string; size?: { width?: number; height?: number } }
  thumbnail?: { src?: string; size?: { width?: number; height?: number } }
  link?: string
  photographer?: string
}

function toPhoto(raw: RawPhoto | undefined): AircraftPhoto | null {
  // `thumbnail_large` is the size the API offers for display — the plain
  // `thumbnail` is 200px and meant for lists.
  const thumb = raw?.thumbnail_large ?? raw?.thumbnail
  if (!thumb?.src || !raw?.link) return null

  return {
    url: thumb.src,
    width: thumb.size?.width ?? 420,
    height: thumb.size?.height ?? 280,
    link: raw.link,
    photographer: raw.photographer?.trim() || null,
  }
}

async function lookup(path: string): Promise<AircraftPhoto | null> {
  const res = await fetch(`${API}/${path}`, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null

  const body = await res.json()
  const photos: RawPhoto[] = Array.isArray(body?.photos) ? body.photos : []
  return toPhoto(photos[0])
}

/**
 * Finds a photograph of one airframe.
 *
 * Registration first because it is the identifier a photographer files
 * under; the ICAO hex second, for the aircraft that broadcast no
 * registration at all — which is most military traffic and a fair share of
 * private aviation.
 */
export async function findAircraftPhoto(
  registration: string | null,
  hex: string,
): Promise<AircraftPhoto | null> {
  const reg = registration?.trim()
  // Registrations are letters, digits and hyphens. Anything else is not one,
  // and putting it in a URL path is how a lookup becomes a request for
  // something else entirely.
  if (reg && /^[A-Za-z0-9-]{2,10}$/.test(reg)) {
    const found = await lookup(`reg/${encodeURIComponent(reg)}`)
    if (found) return found
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return lookup(`hex/${encodeURIComponent(hex)}`)
  }

  return null
}

/**
 * One lookup per airframe, remembered.
 *
 * Keyed on the hex rather than the registration, because the hex is what
 * every aircraft reports and what the rest of the layer identifies them by.
 * Misses are remembered too — that is most of the value, since a military
 * airframe with no photograph would otherwise be looked up again every time
 * its panel was opened.
 */
const held = new Map<string, { at: number; photo: AircraftPhoto | null }>()

export async function aircraftPhoto(
  registration: string | null,
  hex: string,
): Promise<AircraftPhoto | null> {
  const key = hex.toLowerCase()
  const have = held.get(key)
  if (have && Date.now() - have.at < AIR_PHOTO_TTL * 1000) return have.photo

  try {
    const photo = await findAircraftPhoto(registration, hex)
    held.set(key, { at: Date.now(), photo })
    return photo
  } catch {
    // A failed lookup is not a miss, so it is not remembered as one.
    return null
  }
}
