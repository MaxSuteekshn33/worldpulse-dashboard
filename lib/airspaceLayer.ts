/**
 * The air corridors and hubs, drawn into whichever view is showing.
 *
 * The sibling of `lib/shippingLayer.ts`, and written to match it closely
 * enough that the two tabs feel like one dashboard: corridors stroke the way
 * lanes do, hub markers follow the chokepoints' pattern, and the colours
 * mean the same things.
 *
 * One place it deliberately stops short of its sibling: there is nothing here
 * that draws onto the globe. The flights layer is flat-map only — a sphere
 * cannot be asked for the aircraft over the quarter of the world it is
 * showing — so the globe equivalents of these were written, found to be
 * drawing a corridor network with no traffic on it, and removed.
 *
 * What differs is where the colour comes from. A chokepoint is coloured by
 * how far off its own last year it is; a hub has no last year, so it is
 * coloured by whether its arrival and departure streams are in balance — and,
 * most of the time, by the fact that nothing can be said yet because the
 * viewport has not been zoomed in far enough to have read it. That third
 * state is the common one, so it has to look deliberate rather than broken.
 */
import { type AirHub, type Corridor, CORRIDORS, HUB_BY_ID, corridorPath } from '@/lib/airways'
import type { HubReading } from '@/lib/airspace'

/** Busier corridors are brighter and heavier, exactly as the lanes are. */
export const CORRIDOR_TIERS = [
  { key: 'minor' as const, color: '#6E96BE', opacity: 0.26, weight: 0.8 },
  { key: 'middle' as const, color: '#8CB9E1', opacity: 0.4, weight: 1.2 },
  { key: 'major' as const, color: '#D18A4E', opacity: 0.72, weight: 1.7 },
]

/** The states a hub can be in, and the one accent used for a selection. */
const UNKNOWN = '#6B7389'
const FLOWING = '#4EA3C2'
const QUIET = '#8A93A8'
const HELD = '#D18A4E'
const HELD_HARD = '#C7553F'
const PICKED = '#9FD4EA'

function colorFor(r: HubReading | null): string {
  if (!r || r.verdict === 'unknown') return UNKNOWN
  if (r.verdict === 'arrivals-held') return HELD_HARD
  if (r.verdict === 'departures-held') return HELD
  if (r.verdict === 'quiet') return QUIET
  return FLOWING
}

/**
 * Busy hubs draw bigger, on a square root so Heathrow does not dwarf
 * everything else the way a linear scale would — the same curve the
 * chokepoints use, for the same reason.
 */
function sizeFor(r: HubReading | null): number {
  if (!r || r.cover === 'none') return 5
  return Math.max(5, Math.min(14, 3 + Math.sqrt(r.total) * 0.85))
}

export interface HubMarker {
  box: HTMLElement
  dot: HTMLElement
  tip: HTMLElement
  id: string
  name: string
  lat: number
  lng: number
}

/**
 * The marker DOM, built once and reused by both views.
 *
 * A ring rather than the chokepoints' diamond. They share a map on the same
 * dashboard and at eight pixels the only thing that reliably separates two
 * marker families is silhouette, not colour — and a circle for an airport
 * against a diamond for a strait is the distinction every chart already makes.
 */
export function createHubMarkers(
  hubs: AirHub[],
  onPick?: (id: string) => void,
): Map<string, HubMarker> {
  const out = new Map<string, HubMarker>()

  for (const h of hubs) {
    const box = document.createElement('div')
    box.className = 'hub-marker'
    box.style.cssText = `
      width:24px;height:24px;position:absolute;
      display:grid;place-items:center;pointer-events:auto;
    `
    box.setAttribute('aria-label', `${h.city} ${h.id} — airspace`)

    const dot = document.createElement('div')
    dot.style.cssText = `
      border-radius:50%;box-sizing:border-box;
      transition:width .4s ease,height .4s ease,border-color .4s ease,box-shadow .4s ease;
    `

    const tip = document.createElement('div')
    tip.style.cssText = `
      position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
      background:rgba(10,10,16,.97);border:1px solid rgba(255,255,255,.14);
      border-radius:7px;padding:7px 11px;
      font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:600;
      letter-spacing:-.01em;color:#F4F6F8;white-space:nowrap;pointer-events:none;
      display:none;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.6);line-height:1.45;
    `

    box.append(dot, tip)
    box.addEventListener('mouseenter', () => { tip.style.display = 'block' })
    box.addEventListener('mouseleave', () => { tip.style.display = 'none' })
    if (onPick) {
      box.style.cursor = 'pointer'
      box.setAttribute('role', 'button')
      box.setAttribute('tabindex', '0')
      box.addEventListener('click', e => { e.stopPropagation(); onPick(h.id) })
      box.addEventListener('keydown', e => {
        const ev = e as KeyboardEvent
        if (ev.key === 'Enter' || ev.key === ' ') { e.preventDefault(); onPick(h.id) }
      })
    }

    const m: HubMarker = { box, dot, tip, id: h.id, name: h.name, lat: h.lat, lng: h.lon }
    paintHub(m, null, h)
    out.set(h.id, m)
  }

  return out
}

/** The one-line summary a hub's tooltip carries. */
function summarise(r: HubReading | null): string {
  if (!r || r.cover === 'none') {
    return '<span style="opacity:.6">zoom in to read this airspace</span>'
  }
  if (r.cover === 'partial') {
    return '<span style="opacity:.6">partly on screen — pan to centre it</span>'
  }
  const flow = `${r.inbound} in · ${r.outbound} out`
  if (r.verdict === 'arrivals-held') {
    return `<span style="color:${HELD_HARD}">arrivals stacking</span> · ${flow}`
  }
  if (r.verdict === 'departures-held') {
    return `<span style="color:${HELD}">departures running</span> · ${flow}`
  }
  if (r.verdict === 'quiet') return `<span style="opacity:.6">quiet</span> · ${flow}`
  return `<span style="color:${FLOWING}">flowing</span> · ${flow}`
}

/** Sets one marker to its current reading, or to "not read yet". */
export function paintHub(m: HubMarker, reading: HubReading | null, hub: AirHub): void {
  const color = colorFor(reading)
  const size = sizeFor(reading)
  const read = reading && reading.cover !== 'none'

  m.dot.style.width = `${size}px`
  m.dot.style.height = `${size}px`
  // Drawn as a ring rather than filled: an airport is a place traffic passes
  // through, and the hollow centre keeps it from reading as one more aircraft.
  m.dot.style.border = `${size > 9 ? 2 : 1.5}px solid ${color}`
  m.dot.style.background = read ? `${color}33` : 'transparent'
  // The dark outer edge is always there, whatever the state. These rings have
  // to read on two completely different backgrounds — the near-black flat map
  // and the globe's Blue Marble terrain — and against snow over Siberia a
  // grey ring on its own all but disappeared.
  m.dot.style.boxShadow = read
    ? `0 0 0 1px rgba(0,0,0,.55), 0 0 ${size}px ${color}, 0 0 ${size * 2.2}px ${color}44`
    : '0 0 0 1px rgba(0,0,0,.55)'

  const where = `<span style="opacity:.5">${hub.city} · ${hub.role}</span>`
  m.tip.innerHTML =
    `<b>${hub.id} — ${hub.name}</b><br>` +
    `${summarise(reading)}<br>${where}`
}

/** Which corridor, in a form that survives being put in React state. */
export interface CorridorRef { index: number }

export interface CorridorPolyline {
  line: google.maps.Polyline
  hit: google.maps.Polyline
  ref: CorridorRef
}

/**
 * The corridor arcs, computed once.
 *
 * Sixty-four points each over thirty-four corridors is a couple of thousand
 * trigonometric calls — cheap, but there is no reason to repeat them every
 * time the polylines are rebuilt.
 */
const PATHS: ({ lat: number; lon: number }[] | null)[] = CORRIDORS.map(corridorPath)

/** The drawn arc of one corridor, or null if either end is unknown. */
export function pathOf(index: number) {
  return PATHS[index] ?? null
}

/** How wide an invisible line takes the click, in pixels. */
const HIT_WEIGHT = 12

export function createCorridorPolylines(
  map: google.maps.Map,
  onPick?: (ref: CorridorRef) => void,
): CorridorPolyline[] {
  const lines: CorridorPolyline[] = []

  CORRIDORS.forEach((corridor, index) => {
    const arc = PATHS[index]
    if (!arc) return
    const tier = CORRIDOR_TIERS.find(t => t.key === corridor.tier)!
    const path = arc.map(p => ({ lat: p.lat, lng: p.lon }))

    const line = new google.maps.Polyline({
      path,
      map,
      // The drawn line never takes the click; the one below does.
      clickable: false,
      strokeColor: tier.color,
      strokeOpacity: tier.opacity,
      strokeWeight: tier.weight,
      zIndex: 1,
    })
    const hit = new google.maps.Polyline({
      path,
      map,
      clickable: Boolean(onPick),
      strokeOpacity: 0,
      strokeWeight: HIT_WEIGHT,
      zIndex: 2,
    })

    const ref: CorridorRef = { index }
    if (onPick) hit.addListener('click', () => onPick(ref))
    lines.push({ line, hit, ref })
  })

  return lines
}

/** Repaints the corridors so the chosen one stands out from the rest. */
export function highlightCorridor(
  lines: CorridorPolyline[],
  picked: CorridorRef | null,
): void {
  for (const { line, ref } of lines) {
    const corridor = CORRIDORS[ref.index]
    const tier = CORRIDOR_TIERS.find(t => t.key === corridor.tier)!
    const on = picked?.index === ref.index
    line.setOptions({
      strokeColor: on ? PICKED : tier.color,
      strokeOpacity: on ? 1 : tier.opacity,
      strokeWeight: on ? Math.max(3, tier.weight * 2.2) : tier.weight,
      zIndex: on ? 3 : 1,
    })
  }
}

/** What a corridor connects, for the panel heading. */
export function corridorEnds(c: Corridor) {
  return { a: HUB_BY_ID.get(c.a) ?? null, b: HUB_BY_ID.get(c.b) ?? null }
}
