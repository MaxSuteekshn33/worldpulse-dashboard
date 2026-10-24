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
): void {
  const size = 3.6 * scale

  for (const v of vessels) {
    const at = project(v.lat, v.lon)
    if (!at) continue

    ctx.globalAlpha = v.speed > 0.5 ? MOVING : IDLE
    ctx.fillStyle = HULL

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

    drawVessels(ctx, (lat, lon) => {
      const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lon))
      if (!p) return null
      const x = p.x - left
      const y = p.y - top
      // Off the visible canvas is not worth a draw call.
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null
      return { x, y }
    }, getVessels())
  }

  overlay.redraw = () => overlay.draw()
  overlay.setMap(map)
  return overlay
}
