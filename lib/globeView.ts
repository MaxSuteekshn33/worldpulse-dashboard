/**
 * The globe as a view you can sit in and handle.
 *
 * The dashboard has two renderings of the same thing: Google's flat map, and
 * this. They share the markers — literally the same DOM nodes, moved between
 * the map's overlay pane and this stage — so the pulse that colours a bubble
 * colours it in both, and there is no second copy of anything to keep in step.
 *
 * Dragging turns it and tilts it, the way a globe behaves when you put a hand
 * on it: sideways spins it, up and down leans the pole toward you or away.
 * Both are just numbers handed to the renderer each frame, which is the whole
 * benefit of having dropped the lookup table the old morph needed.
 *
 * Plain module, no React. The positions this computes have to agree with the
 * renderer to within a pixel or the bubbles sit off their own countries, and
 * that is far easier to check when it can be called directly.
 */
import {
  DEFAULT_TILT,
  type GlobeGeometry,
  MAX_TILT,
  buildGlobe,
  drawGlobe,
  projectToScreen,
} from '@/lib/globe'

/** Degrees a second it turns on its own, until someone takes hold of it. */
const IDLE_SPIN = 3.5
/** Redraws a second. A slow turn does not need sixty, and every frame is a
 *  pass over every pixel of the disc. */
const FPS = 30
/** A drag across the full width is half a turn; down the full height, 110
 *  degrees of lean. Tuned so neither axis feels faster than the other. */
const SPIN_PER_WIDTH = 180
const TILT_PER_HEIGHT = 110

export interface GlobeMarker {
  box: HTMLElement
  lat: number
  lng: number
}

export interface GlobeViewHost {
  canvas: HTMLCanvasElement
  /** Where the markers live while this view owns them. */
  stage: HTMLElement
  markers: Map<string, GlobeMarker>
  terrain: { data: ImageData; w: number; h: number }
  /** Fraction of a CSS pixel each canvas pixel covers. */
  fit: number
}

export interface GlobeView {
  run(): void
  stop(): void
  showMarkers(on: boolean): void
  destroy(): void
}

export function createGlobeView(host: GlobeViewHost): GlobeView {
  const { canvas, stage, markers, terrain, fit } = host
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  let geometry: GlobeGeometry | null = buildGlobe(canvas.width, canvas.height)
  let frame: ImageData | null = ctx.createImageData(canvas.width, canvas.height)

  // The same circle in the units the markers are positioned in.
  const cssCx = geometry.cx / fit
  const cssCy = geometry.cy / fit
  const cssRadius = geometry.radius / fit
  const cssW = canvas.width / fit
  const cssH = canvas.height / fit

  let spin = 12
  let tilt = DEFAULT_TILT
  let running = false
  let raf = 0
  let last = 0
  let markersOn = true

  let dragging = false
  let fromX = 0
  let fromY = 0
  let spinAt = 0
  let tiltAt = 0
  // It turns by itself until someone puts a hand on it, and then it is theirs.
  // Drifting on after a drag would walk the globe away from wherever they
  // just put it.
  let handled = false

  function placeMarkers() {
    if (!markersOn || !geometry) return
    for (const m of markers.values()) {
      const p = projectToScreen(m.lat, m.lng, tilt, spin, cssCx, cssCy, cssRadius)
      if (!p.front) {
        // The far side of a sphere is not something you can click.
        if (m.box.style.visibility !== 'hidden') {
          m.box.style.visibility = 'hidden'
          m.box.setAttribute('aria-hidden', 'true')
        }
        continue
      }
      if (m.box.style.visibility === 'hidden') {
        m.box.style.visibility = 'visible'
        m.box.removeAttribute('aria-hidden')
      }
      // Only the transform changes per frame, which keeps two hundred bubbles
      // on the compositor rather than in layout.
      m.box.style.transform = `translate3d(${p.x - 12}px, ${p.y - 12}px, 0)`
    }
  }

  function draw() {
    if (!geometry || !frame) return
    drawGlobe(frame, terrain.data, terrain.w, terrain.h, geometry, tilt, spin)
    ctx!.putImageData(frame, 0, 0)
  }

  function tick(now: number) {
    if (!running) return
    raf = requestAnimationFrame(tick)
    if (now - last < 1000 / FPS) return
    const dt = last ? (now - last) / 1000 : 0
    last = now

    if (!handled && !dragging) spin += IDLE_SPIN * dt
    draw()
    placeMarkers()
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true
    handled = true
    fromX = e.clientX
    fromY = e.clientY
    spinAt = spin
    tiltAt = tilt
    stage.setPointerCapture?.(e.pointerId)
    stage.style.cursor = 'grabbing'
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    spin = spinAt - ((e.clientX - fromX) / cssW) * SPIN_PER_WIDTH
    // Dragging down leans the north pole toward the viewer, which is what the
    // hand expects: the surface under the finger follows the finger.
    const next = tiltAt + ((e.clientY - fromY) / cssH) * TILT_PER_HEIGHT
    tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, next))
    // Redrawn here as well as on the clock, so a drag tracks the hand instead
    // of lagging up to a frame behind it.
    draw()
    placeMarkers()
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    stage.releasePointerCapture?.(e.pointerId)
    stage.style.cursor = 'grab'
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerUp)

  return {
    run() {
      if (running) return
      running = true
      last = 0
      draw()
      placeMarkers()
      raf = requestAnimationFrame(tick)
    },

    stop() {
      running = false
      cancelAnimationFrame(raf)
    },

    showMarkers(on: boolean) {
      markersOn = on
      for (const m of markers.values()) {
        m.box.style.opacity = on ? '1' : '0'
        if (!on) m.box.style.visibility = 'hidden'
      }
      if (on) placeMarkers()
    },

    destroy() {
      running = false
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      geometry = null
      frame = null
    },
  }
}
