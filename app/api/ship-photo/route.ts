import { NextResponse } from 'next/server'
import { PHOTO_TTL, shipPhoto } from '@/lib/shipPhotos'

export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * A photograph of one ship, if Wikimedia Commons has one.
 *
 * Asked for per ship, when a panel opens, rather than attached to the fleet:
 * there are several hundred ships on screen and nobody looks at more than a
 * handful of them, so looking all of them up would be hundreds of requests to
 * Commons to fill in pictures nobody opens.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const mmsi = Number(params.get('mmsi'))
  const name = params.get('name') ?? ''
  const imoRaw = Number(params.get('imo'))
  const imo = Number.isFinite(imoRaw) && imoRaw > 0 ? imoRaw : undefined

  if (!Number.isFinite(mmsi) || mmsi <= 0) {
    return NextResponse.json({ photo: null }, { status: 400 })
  }

  const photo = await shipPhoto(name, mmsi, imo)

  return NextResponse.json(
    { photo },
    {
      // A ship does not get repainted during a session, and a miss stays a
      // miss, so both are worth holding at the edge for a day.
      headers: { 'Cache-Control': `s-maxage=${PHOTO_TTL}, stale-while-revalidate=3600` },
    },
  )
}
