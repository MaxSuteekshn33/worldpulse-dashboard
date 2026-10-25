import { NextResponse } from 'next/server'
import { AIR_PHOTO_TTL, aircraftPhoto } from '@/lib/aircraftPhotos'

export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * A photograph of one airframe, if Planespotters has one.
 *
 * Server-side rather than called from the page, for two reasons: their API
 * refuses browser requests that arrive without an Origin or Referer, and
 * going through here means one lookup per airframe is shared by everyone
 * who opens that aircraft rather than repeated per visitor.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const hex = (params.get('hex') ?? '').trim().toLowerCase()
  const registration = params.get('registration')

  if (!/^[0-9a-f]{6}$/.test(hex)) {
    return NextResponse.json({ photo: null }, { status: 400 })
  }

  const photo = await aircraftPhoto(registration, hex)

  return NextResponse.json(
    { photo },
    {
      // An airframe does not get repainted mid-session and a miss stays a
      // miss, so both are worth holding at the edge for a day. Their terms
      // ask callers not to be bursty; this is how that is kept to.
      headers: { 'Cache-Control': `s-maxage=${AIR_PHOTO_TTL}, stale-while-revalidate=3600` },
    },
  )
}
