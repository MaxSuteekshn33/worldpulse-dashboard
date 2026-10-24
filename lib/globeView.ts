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
/**
 * How far the pointer has to move before it counts as a drag rather than a
 * click.
 *
 * This is not a nicety, it is what makes the bubbles work at all. Capturing
 * the pointer on pointerdown retargets the click to whatever captured it, so
 * capturing on the stage meant every click landed on the stage and no marker
 * ever received one — the globe showed two hundred countries and not one of
 * them could be opened. Capture is taken only once the hand has actually
 * moved, so a press that does not move stays the marker's own click.
 */
const DRAG_SLOP = 4

export interface GlobeMarker {
  box: HTMLElement
  lat: number
  lng: number
}

/** Draws on top of the sphere, in canvas pixels, after it has been painted. */
export type GlobeOverlay = (
  ctx: CanvasRenderingContext2D,
  project: (lat: number, lon: number) => { x: number; y: number; front: boolean },
  radius: number,
) => void

export interface GlobeViewHost {
  canvas: HTMLCanvasElement
  /** Where the markers live while this view owns them. */
  stage: HTMLElement
  markers: Map<string, GlobeMarker>
  terrain: { data: ImageData; w: number; h: number }
  /** Fraction of a CSS pixel each canvas pixel covers. */
  fit: number
  /**
   * Anything that belongs on the globe but is not the globe — shipping lanes,
   * and whatever the dashboard grows next.
   *
   * Drawn into the same canvas rather than layered over it as SVG, because it
   * has to move with the sphere: a separate element would need every one of
   * its points rewritten each frame, and would still be a frame behind.
   */
  drawOverlay?: GlobeOverlay
}

export interface GlobeView {
  /**
   * Where a point on the Earth is right now, in CSS pixels.
   *
   * Exposed so the page can work out what was clicked without having to know
   * the camera angle — which only this knows, and which changes every frame.
   */
  project(lat: number, lon: number): { x: number; y: number; front: boolean }
  /** Swaps which set of markers rides on the sphere, when the layer changes. */
  setMarkers(next: Map<string, GlobeMarker>): void
  /** Redraws once without waiting for the clock — after a layer change. */
  refresh(): void
  run(): void
  stop(): void
  showMarkers(on: boolean): void
  destroy(): void
}

export function createGlobeView(host: GlobeViewHost): GlobeView {
  const { canvas, stage, terrain, fit } = host
  let markers = host.markers
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

  let pressed = false
  let dragging = false
  let fromX = 0
  let fromY = 0
  let spinAt = 0
  let tiltAt = 0
  // It turns by itself until someone puts a hand on it, and then it is theirs.
  // Drifting on after a drag would walk the globe away from wherever they
  // just put it.
  let handled = false
  // And it holds still while the pointer is over it at all.
  //
  // Without this the bubbles are a moving target: at three and a half degrees
  // a second a country drifts most of its own width in the time it takes to
  // aim at it, so you end up chasing it, and a click that lands late opens the
  // country that has moved into the gap. Measured exactly that — aimed at
  // Oman, opened India.
  let hovering = false

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

    if (host.drawOverlay) {
      const g = geometry
      host.drawOverlay(
        ctx!,
        (lat, lon) => projectToScreen(lat, lon, tilt, spin, g.cx, g.cy, g.radius),
        g.radius,
      )
    }
  }

  function tick(now: number) {
    if (!running) return
    raf = requestAnimationFrame(tick)
    if (now - last < 1000 / FPS) return
    const dt = last ? (now - last) / 1000 : 0
    last = now

    if (!handled && !dragging && !hovering) spin += IDLE_SPIN * dt
    draw()
    placeMarkers()
  }

  function onPointerDown(e: PointerEvent) {
    // Deliberately no capture here — see DRAG_SLOP.
    pressed = true
    dragging = false
    fromX = e.clientX
    fromY = e.clientY
    spinAt = spin
    tiltAt = tilt
  }

  function onPointerMove(e: PointerEvent) {
    if (!pressed) return

    if (!dragging) {
      if (Math.hypot(e.clientX - fromX, e.clientY - fromY) < DRAG_SLOP) return
      // Now it is a drag: take the pointer, stop the idle turn, and let the
      // click that follows land on the stage rather than on whatever bubble
      // happened to be under the finger at the end of it.
      dragging = true
      handled = true
      stage.setPointerCapture?.(e.pointerId)
      stage.style.cursor = 'grabbing'
    }

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
    pressed = false
    if (!dragging) return
    dragging = false
    stage.releasePointerCapture?.(e.pointerId)
    stage.style.cursor = 'grab'
  }

  function onPointerEnter() { hovering = true }
  function onPointerLeave() { hovering = false }

  stage.addEventListener('pointerenter', onPointerEnter)
  stage.addEventListener('pointerleave', onPointerLeave)
  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerUp)

  return {
    project(lat, lon) {
      return projectToScreen(lat, lon, tilt, spin, cssCx, cssCy, cssRadius)
    },

    setMarkers(next) {
      // The set leaving the sphere keeps whatever it was last given; it is
      // hidden by the caller, not unpositioned here.
      markers = next
      placeMarkers()
    },

    refresh() {
      draw()
      placeMarkers()
    },

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
      stage.removeEventListener('pointerenter', onPointerEnter)
      stage.removeEventListener('pointerleave', onPointerLeave)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      geometry = null
      frame = null
    },
  }
}
