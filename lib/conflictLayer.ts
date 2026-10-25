/**
 * Conflict events, drawn on whichever view is showing.
 *
 * The sibling of `lib/vesselLayer.ts` and `lib/flightLayer.ts`: canvas rather
 * than DOM, because several hundred marks replaced on every refresh is how a
 * map is made to stutter if each one is an element.
 *
 * What differs is the mark. A ship is an arrowhead because its heading is the
 * point of it, and an aircraft is a silhouette for the same reason. An event
 * has no heading — it happened somewhere and it is over — so it is a ring
 * around a point, sized by how widely it was reported and coloured by what
 * kind of event it was.
 *
 * The ring, rather than a filled dot, is deliberate on a map that already has
 * filled dots for countries and hollow ones for air hubs: an event is a place
 * something happened, not a thing sitting there.
 */
import type { ConflictEvent, Severity } from '@/lib/conflict'

/**
 * The three bands, and the one rule they follow: this is a dark map, and red
 * is spent only where it means something.
 *
 * `unrest` is deliberately cool. Protests and arrests are the bulk of the
 * feed, and giving them a warning colour would light the whole map up and
 * leave nothing to say about shelling.
 */
export const SEVERITY_COLOUR: Record<Severity, string> = {
  unrest: '#6E96BE',
  armed: '#D18A4E',
  mass: '#C7553F',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  unrest: 'Protest, arrests, coercion',
  armed: 'Armed violence',
  mass: 'Mass violence',
}

/** Ring radius in pixels at full scale, before coverage is taken in. */
const BASE_RADIUS = 3.2
const MAX_RADIUS = 11

/**
 * How big one event draws.
 *
 * On the square root of its article count, for the same reason the
 * chokepoints use one: coverage is wildly skewed, and a linear scale would
 * give one heavily-covered story a ring swallowing a continent while
 * everything else stayed a dot.
 */
export function radiusFor(articles: number, scale = 1): number {
  return Math.min(MAX_RADIUS, BASE_RADIUS + Math.sqrt(Math.max(1, articles)) * 1.15) * scale
}

/**
 * How solid an event looks, given how long ago it was reported.
 *
 * The same idea as the fleet's fade and for the same reason: the map holds
 * six hours, and something from five hours ago should not look like something
 * from five minutes ago.
 */
export function freshness(ageMs: number, memoryMs: number): number {
  if (!memoryMs || ageMs <= 0) return 1
  const used = ageMs / memoryMs
  if (used <= 0.15) return 1
  if (used >= 1) return 0.35
  return 1 - ((used - 0.15) / 0.85) * 0.65
}

/**
 * Draws the events, given something that can place a latitude and longitude.
 *
 * `project` returns null for anything not to be drawn — behind the globe, or
 * off the edge of the map.
 */
export function drawEvents(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number } | null,
  events: ConflictEvent[],
  scale = 1,
  clock = 0,
  memorySeconds = 0,
  selected?: string,
): void {
  const memoryMs = memorySeconds * 1000

  // Severest last, so a massacre is never painted over by a protest.
  const order = ['unrest', 'armed', 'mass']
  const sorted = [...events].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  )

  for (const e of sorted) {
    const at = project(e.lat, e.lon)
    if (!at) continue

    const colour = SEVERITY_COLOUR[e.severity]
    const r = radiusFor(e.articles, scale)
    const age = clock && e.at ? Math.max(0, clock - e.at) : 0

    ctx.globalAlpha = freshness(age, memoryMs)
    ctx.strokeStyle = colour
    ctx.fillStyle = colour
    ctx.lineWidth = Math.max(0.9, 1.3 * scale)
    ctx.shadowColor = colour
    // Squared, as the fleet's is: a halo that keeps its width while the ring
    // shrinks turns a busy region into one smear at world zoom.
    ctx.shadowBlur = 7 * scale * scale

    if (e.id === selected) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#9FD4EA'
      ctx.shadowColor = '#9FD4EA'
      ctx.lineWidth = 2 * scale
      ctx.beginPath()
      ctx.arc(at.x, at.y, r + 5 * scale, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2)
    ctx.stroke()

    // A small solid centre, so a large faint ring still has a point you can
    // aim at and the eye can find the location rather than its outline.
    ctx.globalAlpha *= 0.75
    ctx.beginPath()
    ctx.arc(at.x, at.y, Math.max(0.9, 1.3 * scale), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

/** How much of full size to draw at a given Google zoom level. */
export function zoomScale(zoom: number): number {
  return Math.max(0.6, Math.min(1.2, 0.5 + (zoom - 2) * 0.16))
}

/**
 * A canvas laid over the flat map that redraws the events as it moves.
 *
 * Positioned against the map's own corners each draw, so it stays registered
 * through panning and zooming without being told about either — and checks
 * `active` after clearing, so switching layers empties it rather than leaving
 * events painted over another layer.
 */
export function createConflictOverlay(
  map: google.maps.Map,
  getEvents: () => ConflictEvent[],
  getState: () => { active: boolean; clock: number; memory: number; selected?: string },
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
      if (x < -30 || y < -30 || x > width + 30 || y > height + 30) return null
      return { x, y }
    }

    drawEvents(
      ctx, place, getEvents(),
      zoomScale(map.getZoom() ?? 3),
      state.clock, state.memory, state.selected,
    )
  }

  overlay.redraw = () => overlay.draw()
  overlay.setMap(map)
  return overlay
}
