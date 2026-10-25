/**
 * Aircraft, drawn on whichever view is showing.
 *
 * The sibling of `lib/vesselLayer.ts` and for the same reasons: canvas rather
 * than DOM, because a few hundred marks replaced every time the feed
 * refreshes is how you make a map stutter if each one is an element, and
 * nothing here needs to be hovered or focused.
 *
 * It is a deliberate parallel rather than a shared abstraction. The trail
 * machinery is nearly identical but keyed by ICAO hex rather than MMSI, and
 * generalising it would mean reaching into the shipping layer to make it
 * generic — more risk, for one less file, in code that is already written and
 * working. If a third moving layer ever arrives, that is the moment to pull
 * the common parts out.
 */
import type { Aircraft } from '@/lib/flights'

/**
 * Where an aircraft has got to since its last report.
 *
 * This matters far more here than it does for ships. A vessel at 15 knots
 * moves about 350 metres between 45-second fetches, which is invisible at any
 * sensible zoom; an airliner at 480 knots moves six nautical miles, which is
 * not. Drawn raw, the sky would freeze and then jump. Carrying each aircraft
 * forward along its own reported track and ground speed is the same honest
 * arithmetic every ADS-B display does between messages: the aircraft told us
 * its heading and how fast it was going.
 *
 * A minute of latitude is a nautical mile, which is what keeps this short.
 * Longitude converges toward the poles, hence the cosine.
 */
export function deadReckonAir(a: Aircraft, hours: number): { lat: number; lon: number } {
  if (a.track < 0 || a.speed <= 0 || hours <= 0 || a.onGround) {
    return { lat: a.lat, lon: a.lon }
  }
  const nm = a.speed * hours
  const rad = (a.track * Math.PI) / 180
  const lat = a.lat + (nm / 60) * Math.cos(rad)
  const cos = Math.cos((a.lat * Math.PI) / 180)
  const lon = a.lon + (Math.abs(cos) < 1e-6 ? 0 : (nm / 60) * Math.sin(rad) / cos)
  return { lat, lon }
}

/** Recent positions per aircraft, oldest first — the path actually flown. */
export type AirTrails = Map<string, { lat: number; lon: number }[]>

/** How many fetches of history a trail keeps. */
export const AIR_TRAIL_LENGTH = 10

/** Adds this fetch's positions to the running trails, dropping the rest. */
export function extendAirTrails(trails: AirTrails, aircraft: Aircraft[]): AirTrails {
  const next: AirTrails = new Map()
  for (const a of aircraft) {
    const prior = trails.get(a.hex) ?? []
    const last = prior[prior.length - 1]
    const moved = !last || Math.abs(last.lat - a.lat) > 1e-4 || Math.abs(last.lon - a.lon) > 1e-4
    const run = moved ? [...prior, { lat: a.lat, lon: a.lon }] : prior
    next.set(a.hex, run.slice(-AIR_TRAIL_LENGTH))
  }
  // Aircraft absent from this fetch are dropped rather than kept fading: the
  // scope changes as the map is panned, and holding trails for everything
  // ever seen would leave ghosts hanging over places no longer on screen.
  return next
}

/** Civil traffic. Warm and pale, so the sky never reads as the sea.
 *  Exported so the legend cannot drift from what is actually drawn. */
export const CIVIL = '#E6DCC3'
/**
 * Military traffic. The one thing on this layer that is an actual signal
 * rather than background, so it gets the only saturated colour — the same
 * register the chokepoint markers use for "something has changed".
 */
export const MILITARY = '#E0724A'

/** Airborne reads brighter than sitting on a taxiway. */
const AIRBORNE = 0.95
const GROUNDED = 0.4

/** Base airframe size in pixels, before the view's own scale. */
const PLANE_SIZE = 3.6
/** How far the airframe's light carries, scaled with it. */
const GLOW = 6

/** Draws where the traffic has been, fading with age. */
export function drawAirTrails(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number } | null,
  trails: AirTrails,
  military: Set<string>,
  scale = 1,
): void {
  ctx.lineWidth = Math.max(0.7, 1 * scale)
  ctx.lineCap = 'round'
  ctx.shadowBlur = 0
  for (const [hex, run] of trails) {
    if (run.length < 2) continue
    // Military trails keep their colour, because the track a military
    // aircraft has flown is most of what makes it worth noticing.
    const colour = military.has(hex) ? MILITARY : CIVIL
    for (let i = 1; i < run.length; i++) {
      const a = project(run[i - 1].lat, run[i - 1].lon)
      const b = project(run[i].lat, run[i].lon)
      if (!a || !b) continue
      ctx.globalAlpha = 0.06 + 0.28 * (i / run.length)
      ctx.strokeStyle = colour
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/**
 * A plane silhouette pointing up the negative Y axis, ready to be rotated.
 *
 * Swept wings and a tailplane rather than a triangle: at these sizes the
 * difference between "an aircraft" and "a speck" is almost entirely the wing
 * line, and which way it is pointing is the whole point of the layer — a
 * formation tracking north over the Baltic is a different picture from the
 * same formation going home.
 */
function airframe(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath()
  ctx.moveTo(0, -size * 1.5)
  ctx.lineTo(size * 0.26, -size * 0.2)
  ctx.lineTo(size * 1.5, size * 0.5)
  ctx.lineTo(size * 1.5, size * 0.78)
  ctx.lineTo(size * 0.26, size * 0.42)
  ctx.lineTo(size * 0.22, size * 1.05)
  ctx.lineTo(size * 0.68, size * 1.42)
  ctx.lineTo(size * 0.68, size * 1.6)
  ctx.lineTo(0, size * 1.3)
  ctx.lineTo(-size * 0.68, size * 1.6)
  ctx.lineTo(-size * 0.68, size * 1.42)
  ctx.lineTo(-size * 0.22, size * 1.05)
  ctx.lineTo(-size * 0.26, size * 0.42)
  ctx.lineTo(-size * 1.5, size * 0.78)
  ctx.lineTo(-size * 1.5, size * 0.5)
  ctx.lineTo(-size * 0.26, -size * 0.2)
  ctx.closePath()
}

/**
 * Draws one sky, given something that can place a latitude and longitude.
 *
 * `project` returns null for anything that should not be drawn — behind the
 * globe, or off the edge of the map — which keeps the two callers from having
 * to agree on anything else.
 */
export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number } | null,
  aircraft: Aircraft[],
  scale = 1,
  hours = 0,
  selected?: string,
): void {
  const base = PLANE_SIZE * scale

  // Military last, so a C-17 in a stack of airliners is never painted over by
  // one. On this layer it is the only mark anyone is looking for.
  const order = [...aircraft].sort((a, b) => Number(a.military) - Number(b.military))

  for (const a of order) {
    const now = deadReckonAir(a, hours)
    const at = project(now.lat, now.lon)
    if (!at) continue

    const colour = a.military ? MILITARY : CIVIL
    ctx.globalAlpha = a.onGround ? GROUNDED : AIRBORNE
    ctx.fillStyle = colour
    ctx.shadowColor = colour
    ctx.shadowBlur = (a.military ? GLOW * 1.6 : GLOW) * scale

    if (a.hex === selected) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#4EA3C2'
      ctx.lineWidth = 1.4 * scale
      ctx.shadowColor = '#4EA3C2'
      ctx.beginPath()
      ctx.arc(at.x, at.y, base * 3.4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#9FD4EA'
      ctx.shadowColor = '#9FD4EA'
    }

    if (a.track < 0) {
      // No track: something is up there, pointing nowhere in particular.
      ctx.beginPath()
      ctx.arc(at.x, at.y, base * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      continue
    }

    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate((a.track * Math.PI) / 180)
    // Military drawn a shade larger as well as hotter: at 4 pixels, colour
    // alone is not enough to pick one out of a busy airway.
    airframe(ctx, a.military ? base * 1.25 : base)
    ctx.fill()
    ctx.restore()
  }

  // Left on, every later stroke on this canvas would be glowing too.
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

/**
 * A canvas laid over the flat map that redraws the sky as it moves.
 *
 * Positioned against the map's own corners each draw, so it stays registered
 * through panning and zooming without ever being told about either.
 *
 * `getState().active` is checked before anything is drawn, so the overlay can
 * be created once and left attached: switching away from the flights layer
 * empties it on the next draw rather than needing the overlay torn down.
 */
export function createFlightOverlay(
  map: google.maps.Map,
  getAircraft: () => Aircraft[],
  getState: () => {
    active: boolean
    hours: number
    trails: AirTrails
    selected?: string
  },
): google.maps.OverlayView & { redraw: () => void } {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;pointer-events:none'

  const overlay = new google.maps.OverlayView() as google.maps.OverlayView & { redraw: () => void }

  overlay.onAdd = function () {
    this.getPanes()?.overlayLayer.appendChild(canvas)
  }

  overlay.onRemove = function () {
    canvas.parentNode?.removeChild(canvas)
  }

  overlay.draw = function () {
    const proj = this.getProjection()
    const bounds = map.getBounds()
    if (!proj || !bounds) return

    const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast())
    const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest())
    if (!ne || !sw) return

    const left = Math.min(sw.x, ne.x)
    const top = Math.min(ne.y, sw.y)
    const width = Math.abs(ne.x - sw.x)
    const height = Math.abs(sw.y - ne.y)
    if (width < 2 || height < 2) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.style.left = `${left}px`
    canvas.style.top = `${top}px`
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const state = getState()
    if (!state.active) return

    const place = (lat: number, lon: number) => {
      const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lon))
      if (!p) return null
      const x = p.x - left
      const y = p.y - top
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null
      return { x, y }
    }

    const sky = getAircraft()
    const military = new Set(sky.filter(a => a.military).map(a => a.hex))
    drawAirTrails(ctx, place, state.trails, military)
    drawAircraft(ctx, place, sky, 1, state.hours, state.selected)
  }

  overlay.redraw = () => overlay.draw()
  overlay.setMap(map)
  return overlay
}
