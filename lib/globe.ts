/**
 * The dashboard's opening: a turning globe that unwraps into the flat map.
 *
 * This is a reprojection, not a picture of one. Every destination pixel is
 * given two source positions — where it falls on a sphere seen head on, and
 * where it falls on the flat equirectangular map — and a frame is drawn by
 * walking between them. At 0 it is a globe, at 1 it is the world map the
 * dashboard uses, and in between it is genuinely unwrapping rather than
 * cross-fading between two images.
 *
 * The expensive half is done once. Both projections are *inverse* maps,
 * destination to source, so the per-frame work is two lerps and a sample —
 * about four milliseconds over a third of a million pixels. Doing it the
 * forward way, as a warped mesh of the source, would have meant a thousand
 * clipped draws a frame and seams between every one of them.
 *
 * Kept out of React so the whole thing can be driven a frame at a time from a
 * harness and looked at as stills. That matters more than usual here: the
 * browser I can automate does not run CSS animations, so an animation I cannot
 * step through is an animation I cannot check.
 */

/** Where the flat state lands, matching the live map's own home view. */
export const CENTER_LAT = 25
export const CENTER_LON = 12
/** The live map's home zoom, which sets how many pixels a degree is worth. */
export const HOME_ZOOM = 2.4

/**
 * How the flat end of the morph is projected.
 *
 * Mercator, not the equirectangular the image is stored in, because the flat
 * end has to hand over to a Google map — and Google is Mercator. Unwrapping to
 * equirectangular put every continent at the wrong height for the map it was
 * dissolving into, so the handover was a visible shift rather than a dissolve.
 * Matching the projection is what makes the two interchangeable.
 */
export interface FlatView {
  centerLat: number
  centerLon: number
  /** Canvas pixels per degree of longitude. */
  perLon: number
}

/** Google's own scale at a zoom level, in CSS pixels per degree of longitude. */
export function perLonAtZoom(zoom: number): number {
  return (256 * Math.pow(2, zoom)) / 360
}

/** Mercator's y, in radians, for a latitude in degrees. */
function mercatorY(latDeg: number): number {
  const phi = (Math.max(-85, Math.min(85, latDeg)) * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + phi / 2))
}

/** How much of the frame's smaller side the globe takes up. */
export const GLOBE_FILL = 0.34
/** Tilt of the camera, degrees north — the globe is seen slightly from above. */
export const TILT = 20
/** Direction the sun comes from, in view space. */
const LIGHT: [number, number, number] = [-0.42, 0.44, 0.79]
/** How far past the rim is still mapped, in globe radii. */
const BEYOND_CAP = 2.4

export interface GlobeMaps {
  w: number
  h: number
  /** Degrees, per destination pixel, under each projection. */
  latGlobe: Float32Array
  lonGlobe: Float32Array
  latFlat: Float32Array
  lonFlat: Float32Array
  /** 0 on the globe itself, rising with distance past the rim. */
  beyond: Float32Array
  /** Sphere shading, 0-255. */
  shade: Uint8ClampedArray
}

/**
 * Works out, once, where every pixel of the frame comes from under both
 * projections.
 *
 * Pixels past the globe's rim are recorded with how far past they are, which
 * is what staggers their arrival during the unwrap so the map opens outward
 * from the globe instead of appearing all at once. Their sphere position is
 * projected onto the rim, which keeps the arrays defined everywhere, but
 * `drawFrame` does not sample through it — see the note there.
 */
export function buildMaps(w: number, h: number, flat: FlatView): GlobeMaps {
  const n = w * h
  const latGlobe = new Float32Array(n)
  const lonGlobe = new Float32Array(n)
  const latFlat = new Float32Array(n)
  const lonFlat = new Float32Array(n)
  const beyond = new Float32Array(n)
  const shade = new Uint8ClampedArray(n)

  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * GLOBE_FILL
  const tilt = (TILT * Math.PI) / 180
  const sinTilt = Math.sin(tilt)
  const cosTilt = Math.cos(tilt)

  // Mercator y runs in radians; a degree of longitude is `perLon` pixels, so a
  // radian of mercator y is that times 180/pi.
  const perMercRad = (flat.perLon * 180) / Math.PI
  const mercCentre = mercatorY(flat.centerLat)

  const [lx, ly, lz] = LIGHT
  const toDeg = 180 / Math.PI

  for (let y = 0; y < h; y++) {
    const py = y + 0.5
    // Screen y runs down and latitude runs up.
    const up = (cy - py) / radius

    // Inverse Mercator for this row. Latitude is not linear in y here, which
    // is the whole point — it is what the live map does with it.
    const merc = mercCentre + (cy - py) / perMercRad
    const flatLat = (2 * Math.atan(Math.exp(merc)) - Math.PI / 2) * toDeg

    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const px = x + 0.5
      const nx = (px - cx) / radius

      latFlat[i] = flatLat < -89.9 ? -89.9 : flatLat > 89.9 ? 89.9 : flatLat
      lonFlat[i] = flat.centerLon + (px - cx) / flat.perLon

      let ax = nx
      let ay = up
      let rho = Math.hypot(ax, ay)

      if (rho > 1) {
        beyond[i] = Math.min(rho - 1, BEYOND_CAP)
        // Flattened onto the rim, so the blend has somewhere to start.
        ax /= rho
        ay /= rho
        rho = 1
      }

      const nz = Math.sqrt(Math.max(0, 1 - rho * rho))

      if (rho < 1e-9) {
        latGlobe[i] = TILT
        lonGlobe[i] = 0
      } else {
        const c = Math.asin(rho)
        const sinC = Math.sin(c)
        const cosC = Math.cos(c)
        const lat = Math.asin(cosC * sinTilt + (ay * sinC * cosTilt) / rho)
        const lon = Math.atan2(ax * sinC, rho * cosC * cosTilt - ay * sinC * sinTilt)
        latGlobe[i] = lat * toDeg
        lonGlobe[i] = lon * toDeg
      }

      // Lambert, lifted off black so the night side still reads as a sphere
      // rather than a bite out of one, and softened so the terminator is not a
      // hard line across the middle of the picture.
      const lambert = ax * lx + ay * ly + nz * lz
      const lit = lambert > 0 ? Math.pow(lambert, 0.75) : 0
      shade[i] = (0.2 + 0.8 * lit) * 255
    }
  }

  return { w, h, latGlobe, lonGlobe, latFlat, lonFlat, beyond, shade }
}

/**
 * Draws one frame into `out`.
 *
 * `t` walks from globe to flat map; `spin` turns the globe, in degrees, and
 * stops mattering as `t` reaches 1 because the flat position wins outright by
 * then — which is why the two can be eased on different curves without the
 * texture tearing.
 */
export function drawFrame(
  out: ImageData,
  src: ImageData,
  srcW: number,
  srcH: number,
  maps: GlobeMaps,
  t: number,
  spin: number,
): void {
  const { latGlobe, lonGlobe, latFlat, lonFlat, beyond, shade } = maps
  const dst = out.data
  const s = src.data
  const n = maps.w * maps.h
  const colPerDeg = srcW / 360
  const rowPerDeg = srcH / 180

  for (let i = 0; i < n; i++) {
    const d = i * 4
    const past = beyond[i]

    let lat: number
    let lon: number
    let m: number

    if (past > 0) {
      // Past the rim there is no sphere, so these pixels are simply the flat
      // map arriving around the globe as it opens.
      //
      // They used to borrow the rim's position and be dragged outward from
      // it, which was prettier in principle and wrong in practice for two
      // reasons: at the top and bottom it smeared polar ice across the frame,
      // and interpolating each pixel's longitude the short way round meant
      // neighbouring pixels could take opposite ways round the globe, which
      // put a hard rectangular seam through the middle of the unwrap wherever
      // that flipped. Inside the disc the two projections are never more than
      // about 150 degrees apart, so the short way is unambiguous there and
      // the seam cannot arise.
      let alpha = t * 3.1 - past * 1.45
      if (alpha <= 0) { dst[d + 3] = 0; continue }
      if (alpha > 1) alpha = 1
      dst[d + 3] = alpha * 255

      lat = latFlat[i]
      lon = lonFlat[i]
      m = 1
    } else {
      dst[d + 3] = 255

      lat = latGlobe[i] + (latFlat[i] - latGlobe[i]) * t

      // Longitudes are angles, so the short way round is the only correct way:
      // lerping 170 to -170 the long way swings the texture right across the
      // Pacific on the way to a neighbouring meridian.
      const from = lonGlobe[i] + spin
      let delta = lonFlat[i] - from
      delta -= 360 * Math.floor((delta + 180) / 360)
      lon = from + delta * t

      // The sphere's shading has to leave with the sphere.
      const sh = shade[i] / 255
      m = sh + (1 - sh) * t
    }

    lon -= 360 * Math.floor((lon + 180) / 360)

    let col = ((lon + 180) * colPerDeg) | 0
    if (col < 0) col = 0
    else if (col >= srcW) col = srcW - 1

    let row = ((90 - lat) * rowPerDeg) | 0
    if (row < 0) row = 0
    else if (row >= srcH) row = srcH - 1

    const sp = (row * srcW + col) * 4
    dst[d] = s[sp] * m
    dst[d + 1] = s[sp + 1] * m
    dst[d + 2] = s[sp + 2] * m
  }
}

/**
 * Reads the terrain image back as pixels, at a size worth sampling.
 *
 * The file is 4608px wide, which as ImageData would be 42MB for a picture that
 * is never shown at more than a third of that. A thousand columns is about
 * what the globe resolves across its own width.
 */
export async function loadTerrain(url: string, width = 1024): Promise<{
  data: ImageData
  w: number
  h: number
}> {
  const img = new Image()
  img.decoding = 'async'

  // `load`, not `decode()`. The decode promise is the tidier API and it does
  // not always settle: measured on the dashboard, the image was fully loaded —
  // naturalWidth 4608 — while `decode()` sat pending indefinitely, so the
  // opening never started and the canvas stayed at its default 300x150. `load`
  // is the signal that is actually guaranteed, and `drawImage` will decode
  // synchronously if it has to.
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`terrain image failed: ${url}`))
    img.src = url
    // A cached image can be complete before the handlers are even attached.
    if (img.complete && img.naturalWidth > 0) resolve()
  })

  if (!img.naturalWidth) throw new Error('terrain image decoded to nothing')

  const h = Math.round(width / 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(img, 0, 0, width, h)
  return { data: ctx.getImageData(0, 0, width, h), w: width, h }
}


/**
 * Where a point on the Earth lands on screen, for anything drawn over the
 * globe rather than into it.
 *
 * The forward of the inverse `buildMaps` uses, and it has to stay the forward
 * of it: the bubbles sit on top of the sphere as DOM, so if these two ever
 * disagree the markers drift off their own countries. `front` is false for the
 * far side, which is the only reason the near side reads as near.
 *
 * Works in CSS pixels, because that is what the markers are positioned in,
 * while `buildMaps` works in canvas pixels. The canvas is scaled uniformly, so
 * the only difference is `radius`.
 */
export function globeProject(
  latDeg: number,
  lonDeg: number,
  spinDeg: number,
  w: number,
  h: number,
): { x: number; y: number; front: boolean } {
  const rad = Math.PI / 180
  const phi = latDeg * rad
  // Longitudes are measured from whichever meridian the spin has brought round.
  const lambda = (lonDeg - spinDeg) * rad
  const tilt = TILT * rad

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosL = Math.cos(lambda)
  const sinL = Math.sin(lambda)
  const cosT = Math.cos(tilt)
  const sinT = Math.sin(tilt)

  const x = cosPhi * sinL
  const y = cosT * sinPhi - sinT * cosPhi * cosL
  const z = sinT * sinPhi + cosT * cosPhi * cosL

  const radius = Math.min(w, h) * GLOBE_FILL
  return {
    x: w / 2 + radius * x,
    y: h / 2 - radius * y,
    front: z > 0,
  }
}

/** Where the same point lands once the map is flat, in the flat projection. */
export function flatProject(
  latDeg: number,
  lonDeg: number,
  w: number,
  h: number,
  flat: FlatView,
): { x: number; y: number } {
  const perMercRad = (flat.perLon * 180) / Math.PI
  let delta = lonDeg - flat.centerLon
  delta -= 360 * Math.floor((delta + 180) / 360)
  return {
    x: w / 2 + delta * flat.perLon,
    y: h / 2 - (mercatorY(latDeg) - mercatorY(flat.centerLat)) * perMercRad,
  }
}
