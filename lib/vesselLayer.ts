/**
 * Ships, drawn on whichever view is showing.
 *
 * Canvas rather than DOM, unlike the countries and the chokepoints. Those are
 * a fixed couple of hundred nodes that persist and get hovered; these are a
 * few hundred that are entirely replaced every time the capture refreshes, and
 * building and discarding that many elements on a timer is how you make a map
 * stutter. Nothing here needs to be hovered or focused, so nothing here needs
 * to be an element.
 */
import type { Vessel } from '@/lib/vessels'

/**
 * Where a ship has got to since its last fix.
 *
 * Captures are seconds of listening, forty-five seconds apart, so drawn raw
 * the fleet sits perfectly still and then teleports. Carrying each ship
 * forward along its own reported course and speed is what AIS displays have
 * always done between fixes, and it is honest arithmetic rather than
 * invention: the ship told us its heading and how fast it was going.
 *
 * A minute of nautical miles is a minute of latitude, which is what makes
 * this as short as it is. Longitude converges toward the poles, hence the
 * cosine.
 */
export function deadReckon(v: Vessel, hours: number): { lat: number; lon: number } {
  if (v.course < 0 || v.speed <= 0 || hours <= 0) return { lat: v.lat, lon: v.lon }
  const nm = v.speed * hours
  const rad = (v.course * Math.PI) / 180
  const lat = v.lat + (nm / 60) * Math.cos(rad)
  const cos = Math.cos((v.lat * Math.PI) / 180)
  const lon = v.lon + (Math.abs(cos) < 1e-6 ? 0 : (nm / 60) * Math.sin(rad) / cos)
  return { lat, lon }
}

/** Recent fixes per ship, oldest first — the path it has actually taken. */
export type Trails = Map<number, { lat: number; lon: number }[]>

/** How many captures of history a trail keeps. */
export const TRAIL_LENGTH = 8

/** Adds this capture's positions to the running trails, dropping the rest. */
export function extendTrails(trails: Trails, vessels: Vessel[]): Trails {
  const next: Trails = new Map()
  for (const v of vessels) {
    const prior = trails.get(v.mmsi) ?? []
    const last = prior[prior.length - 1]
    // A ship that has not moved does not need another identical point.
    const moved = !last || Math.abs(last.lat - v.lat) > 1e-4 || Math.abs(last.lon - v.lon) > 1e-4
    const run = moved ? [...prior, { lat: v.lat, lon: v.lon }] : prior
    next.set(v.mmsi, run.slice(-TRAIL_LENGTH))
  }
  return next
}

/** Draws where the fleet has been, fading with age. */
export function drawTrails(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number } | null,
  trails: Trails,
  scale = 1,
): void {
  ctx.lineWidth = Math.max(0.8, 1.1 * scale)
  ctx.lineCap = 'round'
  for (const run of trails.values()) {
    if (run.length < 2) continue
    for (let i = 1; i < run.length; i++) {
      const a = project(run[i - 1].lat, run[i - 1].lon)
      const b = project(run[i].lat, run[i].lon)
      if (!a || !b) continue
      // Older segments are fainter, so the direction of travel reads without
      // an arrowhead on every one.
      ctx.globalAlpha = 0.07 + 0.3 * (i / run.length)
      ctx.strokeStyle = HULL
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

const HULL = '#CFE6F2'
/** Moving ships read brighter than ones sitting at anchor. */
const MOVING = 0.92
const IDLE = 0.4

/**
 * Draws one fleet, given something that can place a latitude and longitude.
 *
 * `project` returns null for anything that should not be drawn — behind the
 * globe, or off the edge of the map — which keeps the two callers from having
 * to agree on anything beyond that.
 */
export function drawVessels(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number } | null,
  vessels: Vessel[],
  scale = 1,
  hours = 0,
  selected?: number,
): void {
  const size = 3.6 * scale

  for (const v of vessels) {
    const now = deadReckon(v, hours)
    const at = project(now.lat, now.lon)
    if (!at) continue

    ctx.globalAlpha = v.speed > 0.5 ? MOVING : IDLE
    ctx.fillStyle = HULL

    if (v.mmsi === selected) {
      // The one being read about, ringed so it can be found again among a
      // few hundred identical arrowheads.
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#4EA3C2'
      ctx.lineWidth = 1.4 * scale
      ctx.beginPath()
      ctx.arc(at.x, at.y, size * 2.4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#9FD4EA'
    }

    if (v.course < 0) {
      // No course: a ship that is somewhere, pointing nowhere in particular.
      ctx.beginPath()
      ctx.arc(at.x, at.y, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    // A hull shape rather than a dot, because which way a ship is pointing is
    // half of what makes a strait readable — traffic through Hormuz heading
    // out is a different picture from traffic heading in.
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate((v.course * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.62, size * 0.8)
    ctx.lineTo(0, size * 0.42)
    ctx.lineTo(-size * 0.62, size * 0.8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.globalAlpha = 1
}

/**
 * A canvas laid over the flat map that redraws the fleet as it moves.
 *
 * Positioned against the map's own corners each draw, so it stays registered
 * through panning and zooming without ever being told about either.
 */
export function createVesselOverlay(
  map: google.maps.Map,
  getVessels: () => Vessel[],
  getState: () => { hours: number; trails: Trails; selected?: number },
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

    const place = (lat: number, lon: number) => {
      const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lon))
      if (!p) return null
      const x = p.x - left
      const y = p.y - top
      // Off the visible canvas is not worth a draw call.
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null
      return { x, y }
    }

    const state = getState()
    drawTrails(ctx, place, state.trails)
    drawVessels(ctx, place, getVessels(), 1, state.hours, state.selected)
  }

  overlay.redraw = () => overlay.draw()
  overlay.setMap(map)
  return overlay
}
