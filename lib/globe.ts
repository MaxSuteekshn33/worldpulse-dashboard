/**
 * The globe: an orthographic rendering of the Earth you can turn and tilt.
 *
 * This used to also unwrap into a flat Mercator map, so that switching views
 * was a morph. The morph is gone — it looked worse than either of the two
 * views it joined — and losing it is what makes tilting affordable.
 *
 * With a flat state to reach, every pixel of the frame had to be projected,
 * because every pixel ended up as map. Now only the disc is ever drawn, which
 * on a typical dashboard is around a tenth of the frame. That leaves enough
 * budget to compute each pixel's position every frame instead of reading it
 * from a table — and a table was exactly what made the camera angle immovable,
 * since changing it meant rebuilding the whole thing.
 *
 * What is precomputed now is the part that genuinely never changes: the
 * direction each pixel looks in, and how lit it is. Both are fixed in view
 * space. Turning and tilting rotate that direction into Earth coordinates,
 * which is ten multiplies and two inverse trig calls per pixel.
 *
 * Kept free of React so a frame can be rendered and looked at on demand, which
 * is the only way any of this gets checked — the browser available here does
 * not run animations.
 */

/** How much of the frame's smaller side the globe fills, as a radius. */
export const GLOBE_FILL = 0.42
/** Where the camera starts, in degrees north. */
export const DEFAULT_TILT = 18
/** Past this the view tips over its own pole. */
export const MAX_TILT = 80

/** Direction the sun comes from, in view space. Fixed, so shading is too. */
const LIGHT: [number, number, number] = [-0.42, 0.44, 0.79]

export interface GlobeGeometry {
  cx: number
  cy: number
  radius: number
  /** How many pixels of the frame are on the globe. */
  count: number
  /** Where each of those lands in the frame's pixel array. */
  at: Int32Array
  /** The direction it looks in, in view space. */
  vx: Float32Array
  vy: Float32Array
  vz: Float32Array
  /** How lit it is, 0-255. */
  shade: Uint8ClampedArray
}

/**
 * Works out, once, which pixels are on the globe and where each one looks.
 *
 * Nothing here depends on the camera angle, which is the point: tilting used
 * to mean rebuilding a table of latitudes and longitudes, and now it means
 * rotating these vectors.
 */
export function buildGlobe(w: number, h: number): GlobeGeometry {
  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * GLOBE_FILL

  // Sized to the disc, not the frame: a circle of that radius is around a
  // tenth of the frame, and allocating for the frame would waste most of
  // several megabytes.
  const cap = Math.ceil(Math.PI * radius * radius) + 8
  const at = new Int32Array(cap)
  const vx = new Float32Array(cap)
  const vy = new Float32Array(cap)
  const vz = new Float32Array(cap)
  const shade = new Uint8ClampedArray(cap)

  const [lx, ly, lz] = LIGHT
  let n = 0

  const top = Math.max(0, Math.floor(cy - radius))
  const bottom = Math.min(h, Math.ceil(cy + radius))
  const left = Math.max(0, Math.floor(cx - radius))
  const right = Math.min(w, Math.ceil(cx + radius))

  for (let y = top; y < bottom; y++) {
    // Screen y runs down; the view's up axis runs up.
    const up = (cy - (y + 0.5)) / radius
    for (let x = left; x < right; x++) {
      const across = (x + 0.5 - cx) / radius
      const d = across * across + up * up
      if (d > 1) continue

      const toward = Math.sqrt(1 - d)

      at[n] = y * w + x
      vx[n] = across
      vy[n] = up
      vz[n] = toward

      // Lambert, lifted off black so the night side still reads as a sphere
      // rather than a bite out of one, and softened so the terminator is not
      // a hard line across the middle of the picture.
      const lambert = across * lx + up * ly + toward * lz
      shade[n] = (0.2 + 0.8 * (lambert > 0 ? Math.pow(lambert, 0.75) : 0)) * 255
      n++
    }
  }

  return { cx, cy, radius, count: n, at, vx, vy, vz, shade }
}

/**
 * Draws the globe as seen from `tilt` degrees north, with `spin` degrees of
 * longitude at the centre.
 *
 * Only the disc is touched. Everything outside it keeps whatever the frame was
 * created with, which is transparent — the disc never moves, so nothing stale
 * is ever left behind it.
 */
export function drawGlobe(
  out: ImageData,
  src: ImageData,
  srcW: number,
  srcH: number,
  g: GlobeGeometry,
  tilt: number,
  spin: number,
): void {
  const dst = out.data
  const s = src.data
  const { at, vx, vy, vz, shade, count } = g

  const rad = Math.PI / 180
  const ct = Math.cos(tilt * rad)
  const st = Math.sin(tilt * rad)
  const cs = Math.cos(spin * rad)
  const ss = Math.sin(spin * rad)

  const colPerDeg = srcW / 360
  const rowPerDeg = srcH / 180
  const toDeg = 180 / Math.PI

  for (let i = 0; i < count; i++) {
    const ax = vx[i]
    const ay = vy[i]
    const az = vz[i]

    // Out of the camera's frame and into the Earth's: tilt about the across
    // axis, then spin about the pole.
    const ty = ay * ct + az * st
    const tz = -ay * st + az * ct
    const ex = ax * cs + tz * ss
    const ez = -ax * ss + tz * cs

    const lat = Math.asin(ty > 1 ? 1 : ty < -1 ? -1 : ty) * toDeg
    const lon = Math.atan2(ex, ez) * toDeg

    let col = ((lon + 180) * colPerDeg) | 0
    if (col < 0) col = 0
    else if (col >= srcW) col = srcW - 1

    let row = ((90 - lat) * rowPerDeg) | 0
    if (row < 0) row = 0
    else if (row >= srcH) row = srcH - 1

    const sp = (row * srcW + col) * 4
    const d = at[i] * 4
    const m = shade[i] / 255

    dst[d] = s[sp] * m
    dst[d + 1] = s[sp + 1] * m
    dst[d + 2] = s[sp + 2] * m
    dst[d + 3] = 255
  }
}

/**
 * Where a point on the Earth lands on screen, for the bubbles drawn over the
 * globe as DOM rather than into it.
 *
 * Exactly the inverse of the rotation `drawGlobe` does, and it has to stay
 * exactly that: if the two ever disagree the markers drift off their own
 * countries, which is the one error on a map nobody will forgive.
 *
 * `front` is false for the far side, which is the only reason the near side
 * reads as near — and the only thing stopping a country you cannot see being
 * clickable through the planet.
 */
export function projectToScreen(
  latDeg: number,
  lonDeg: number,
  tilt: number,
  spin: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number; front: boolean } {
  const rad = Math.PI / 180
  const lat = latDeg * rad
  const lon = lonDeg * rad

  const ex = Math.cos(lat) * Math.sin(lon)
  const ey = Math.sin(lat)
  const ez = Math.cos(lat) * Math.cos(lon)

  const cs = Math.cos(spin * rad)
  const ss = Math.sin(spin * rad)
  const ct = Math.cos(tilt * rad)
  const st = Math.sin(tilt * rad)

  // Undo the spin, then undo the tilt.
  const ux = ex * cs - ez * ss
  const uz = ex * ss + ez * cs
  const uy = ey * ct - uz * st
  const vz = ey * st + uz * ct

  return { x: cx + radius * ux, y: cy - radius * uy, front: vz > 0 }
}

/**
 * Reads the terrain image back as pixels, at a size worth sampling.
 *
 * The file is 4608px wide, which as ImageData would be 42MB for a picture
 * never shown at more than a third of that.
 */
export async function loadTerrain(url: string, width = 1024): Promise<{
  data: ImageData
  w: number
  h: number
}> {
  const img = new Image()
  img.decoding = 'async'

  // `load`, not `decode()`. The decode promise is the tidier API and it does
  // not always settle: measured on this dashboard, the image was fully loaded
  // — naturalWidth 4608 — while `decode()` sat pending indefinitely.
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`terrain image failed: ${url}`))
    img.src = url
    // A cached image can be complete before the handlers are attached.
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
