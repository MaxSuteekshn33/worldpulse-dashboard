/**
 * The shipping layer, drawn into whichever view is showing.
 *
 * Lanes and chokepoints have to appear on both the flat map and the globe,
 * which draw in completely different ways — Google takes polylines in
 * latitude and longitude, the globe takes pixels on a canvas. The geometry is
 * the same for both; only the stroking differs, so that is the only thing
 * split here.
 *
 * Chokepoint markers follow the countries' pattern exactly: one set of DOM
 * nodes, moved between the map's overlay pane and the globe's stage, never
 * rebuilt. Whatever the traffic has coloured them stays coloured across a
 * switch.
 */
import { LANES } from '@/lib/lanes'
import type { Chokepoint } from '@/lib/chokepoints'
import type { ChokepointReading } from '@/lib/shipping'

/** Busier lanes are brighter and heavier, so the trunk routes read first. */
export const LANE_TIERS = [
  { key: 'minor' as const, color: '#6E96BE', opacity: 0.3, weight: 0.9 },
  { key: 'middle' as const, color: '#8CB9E1', opacity: 0.46, weight: 1.3 },
  { key: 'major' as const, color: '#D18A4E', opacity: 0.85, weight: 1.9 },
]

/** Neutral, and the two directions a chokepoint can be unusual in. */
const QUIET = '#6B7389'
const BUSIER = '#4EA3C2'
const DOWN = '#D18A4E'
const DOWN_HARD = '#C7553F'

/**
 * How far from its own normal a chokepoint is, against the same month a year
 * ago.
 *
 * Year on year rather than against the recent weeks, because a shutdown that
 * has lasted months *is* the recent weeks — measure Hormuz against its own
 * last thirty days and a ninety-six percent collapse reads as perfectly
 * normal, which is the opposite of true.
 */
export function changeRatio(r: ChokepointReading): number | null {
  if (!r.lastYear) return null
  return (r.recent - r.lastYear) / r.lastYear
}

function colorFor(change: number | null): string {
  if (change === null) return QUIET
  if (change <= -0.45) return DOWN_HARD
  if (change <= -0.15) return DOWN
  if (change >= 0.15) return BUSIER
  return QUIET
}

/** Busy chokepoints draw bigger, on a square root so Malacca does not dwarf
 *  everything else the way a linear scale would. */
function sizeFor(recent: number): number {
  return Math.max(5, Math.min(13, 3 + Math.sqrt(recent) * 0.75))
}

export interface ChokeMarker {
  box: HTMLElement
  dot: HTMLElement
  tip: HTMLElement
  id: string
  name: string
  lat: number
  lng: number
}

/** The marker DOM, built once and reused by both views. */
export function createChokeMarkers(
  points: Chokepoint[],
  onPick?: (id: string) => void,
): Map<string, ChokeMarker> {
  const out = new Map<string, ChokeMarker>()

  for (const p of points) {
    const box = document.createElement('div')
    box.className = 'choke-marker'
    box.style.cssText = `
      width:24px;height:24px;position:absolute;
      display:grid;place-items:center;pointer-events:auto;
    `
    box.setAttribute('aria-label', `${p.name} — shipping traffic`)

    const dot = document.createElement('div')
    dot.style.cssText = `
      border-radius:3px;transform:rotate(45deg);
      transition:width .4s ease,height .4s ease,background .4s ease,box-shadow .4s ease;
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
      box.addEventListener('click', e => { e.stopPropagation(); onPick(p.id) })
      box.addEventListener('keydown', e => {
        const ev = e as KeyboardEvent
        if (ev.key === 'Enter' || ev.key === ' ') { e.preventDefault(); onPick(p.id) }
      })
    }

    const m: ChokeMarker = { box, dot, tip, id: p.id, name: p.name, lat: p.lat, lng: p.lon }
    paintChoke(m, null, p)
    out.set(p.id, m)
  }

  return out
}

/** Sets one marker to its current reading, or to "no figures yet". */
export function paintChoke(
  m: ChokeMarker,
  reading: ChokepointReading | null,
  point: Chokepoint,
): void {
  const change = reading ? changeRatio(reading) : null
  const color = colorFor(change)
  const size = reading ? sizeFor(reading.recent) : 6

  m.dot.style.width = `${size}px`
  m.dot.style.height = `${size}px`
  m.dot.style.background = color
  m.dot.style.boxShadow = reading
    ? `0 0 0 1px rgba(255,255,255,.22), 0 0 ${size}px ${color}, 0 0 ${size * 2.2}px ${color}55`
    : '0 0 0 1px rgba(255,255,255,.14)'

  const carries = point.carries.length ? `<br><span style="opacity:.5">${point.carries[0]}</span>` : ''

  if (!reading) {
    m.tip.innerHTML = `<b>${m.name}</b><br><span style="opacity:.6">traffic figures loading</span>${carries}`
    return
  }

  const pct = change === null ? null : Math.round(change * 100)
  const trend = pct === null
    ? '<span style="opacity:.55">no figure for last year</span>'
    : pct <= -5
      ? `<span style="color:${color}">${Math.abs(pct)}% below last year</span>`
      : pct >= 5
        ? `<span style="color:${color}">${pct}% above last year</span>`
        : '<span style="opacity:.6">in line with last year</span>'

  m.tip.innerHTML =
    `<b>${m.name}</b><br>` +
    `${Math.round(reading.recent)} ships a day · ${trend}${carries}`
}

/** Which lane, in a form that survives being put in React state. */
export interface LaneRef { tier: 'major' | 'middle' | 'minor'; index: number }

export interface LanePolyline {
  line: google.maps.Polyline
  /**
   * An invisible, much wider line following the same path, which is what
   * actually receives the click.
   *
   * Google hit-tests a polyline against its drawn stroke, and the minor lanes
   * are drawn a shade under a pixel — so without this they are visible and
   * effectively unclickable, which is the worst of both.
   */
  hit: google.maps.Polyline
  ref: LaneRef
}

/** How wide the invisible click target is, in pixels. */
const HIT_WEIGHT = 12

/** Builds the lanes for the flat map, where Google owns the projection. */
export function createLanePolylines(
  map: google.maps.Map,
  onPick?: (ref: LaneRef) => void,
): LanePolyline[] {
  const lines: LanePolyline[] = []
  for (const tier of LANE_TIERS) {
    LANES[tier.key].forEach((flat, index) => {
      const path: google.maps.LatLngLiteral[] = []
      for (let i = 0; i < flat.length; i += 2) path.push({ lng: flat[i], lat: flat[i + 1] })
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
      const ref: LaneRef = { tier: tier.key, index }
      if (onPick) hit.addListener('click', () => onPick(ref))
      lines.push({ line, hit, ref })
    })
  }
  return lines
}

/** Repaints the lanes so the chosen one stands out from the rest. */
export function highlightLane(lines: LanePolyline[], picked: LaneRef | null): void {
  for (const { line, ref } of lines) {
    const tier = LANE_TIERS.find(t => t.key === ref.tier)!
    const on = picked && picked.tier === ref.tier && picked.index === ref.index
    line.setOptions({
      strokeColor: on ? '#9FD4EA' : tier.color,
      strokeOpacity: on ? 1 : tier.opacity,
      strokeWeight: on ? Math.max(3, tier.weight * 2.2) : tier.weight,
      zIndex: on ? 3 : 1,
    })
  }
}

/** Distance from a point to a segment, in pixels. */
function toSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * The lane nearest a click on the globe, where there are no polylines to
 * listen to — the lanes are strokes on a canvas, so the hit test has to be
 * done against the geometry by hand.
 */
export function pickLaneAt(
  x: number, y: number,
  project: (lat: number, lon: number) => { x: number; y: number; front: boolean },
  within = 10,
): LaneRef | null {
  let best: LaneRef | null = null
  let bestD = within

  for (const tier of LANE_TIERS) {
    LANES[tier.key].forEach((flat, index) => {
      let prev: { x: number; y: number } | null = null
      for (let i = 0; i < flat.length; i += 2) {
        const p = project(flat[i + 1], flat[i])
        if (!p.front) { prev = null; continue }
        if (prev) {
          const d = toSegment(x, y, prev.x, prev.y, p.x, p.y)
          if (d < bestD) { bestD = d; best = { tier: tier.key, index } }
        }
        prev = p
      }
    })
  }

  return best
}

/**
 * Draws the lanes onto the globe.
 *
 * A segment is drawn only where both of its ends are on the near side, which
 * is what stops routes being painted straight across the planet from one limb
 * to the other.
 */
export function drawLanesOnGlobe(
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number; front: boolean },
  radius: number,
  picked?: LaneRef | null,
): void {
  // The globe is drawn smaller than the flat map, so the lanes thin with it.
  const scale = Math.max(0.5, radius / 240)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  for (const tier of LANE_TIERS) {
    ctx.strokeStyle = tier.color
    ctx.globalAlpha = tier.opacity
    ctx.lineWidth = tier.weight * scale

    LANES[tier.key].forEach((flat, index) => {
      const on = picked && picked.tier === tier.key && picked.index === index
      if (on) {
        ctx.strokeStyle = '#9FD4EA'
        ctx.globalAlpha = 1
        ctx.lineWidth = Math.max(2, tier.weight * 2.2 * scale)
      }
      ctx.beginPath()
      let drawing = false
      for (let i = 0; i < flat.length; i += 2) {
        const p = project(flat[i + 1], flat[i])
        if (!p.front) { drawing = false; continue }
        if (drawing) ctx.lineTo(p.x, p.y)
        else { ctx.moveTo(p.x, p.y); drawing = true }
      }
      ctx.stroke()
      if (on) {
        ctx.strokeStyle = tier.color
        ctx.globalAlpha = tier.opacity
        ctx.lineWidth = tier.weight * scale
      }
    })
  }

  ctx.globalAlpha = 1
}
