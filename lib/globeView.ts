/**
 * The globe as a view you can sit in, rather than an animation that plays once.
 *
 * The dashboard has two renderings of the same thing: Google's flat map, and
 * this. They share the markers — literally the same DOM nodes, moved between
 * the map's overlay pane and this stage — so the pulse that colours a bubble
 * colours it in both, and there is no second copy of anything to keep in step.
 *
 * Switching between them is the morph in `lib/globe.ts` run on demand instead
 * of on arrival. That is the whole reason the flat end of that morph is
 * Mercator: it ends on exactly what Google is about to show, so the handover
 * is a dissolve rather than a jump.
 *
 * Plain module, no React. The positions this computes have to agree with the
 * reprojection to within a pixel or the bubbles sit off their own countries,
 * and that is far easier to check when it can be called directly.
 */
import {
  type FlatView,
  type GlobeMaps,
  buildMaps,
  drawFrame,
  flatProject,
  globeProject,
} from '@/lib/globe'

/** Degrees a second the globe turns when nobody is holding it. */
const IDLE_SPIN = 3.5
/** Redraws a second. The reprojection is per-pixel, and a slow turn does not
 *  need sixty of them — this halves the cost of simply sitting on the globe. */
const FPS = 30
/** How far a drag turns it: a full window's width is half a turn. */
const DRAG_DEGREES = 180

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
  flat: FlatView
  /** Fraction of a CSS pixel each canvas pixel covers. */
  fit: number
}

export interface GlobeView {
  /** 0 is the globe, 1 is the flat map. */
  readonly t: number
  /** Runs the morph and resolves when it lands. */
  morph(to: number, ms: number): Promise<void>
  /** Keeps turning, keeps the bubbles on their countries. */
  run(): void
  stop(): void
  showMarkers(on: boolean): void
  destroy(): void
}

export function createGlobeView(host: GlobeViewHost): GlobeView {
  const { canvas, stage, markers, terrain, flat, fit } = host
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  const cssW = canvas.width / fit
  const cssH = canvas.height / fit
  // The reprojection works in canvas pixels and the markers in CSS pixels, so
  // the flat view has to exist in both. Getting this wrong puts every bubble
  // at the wrong scale the moment the map is flat.
  const cssFlat: FlatView = { ...flat, perLon: flat.perLon / fit }

  let maps: GlobeMaps | null = buildMaps(canvas.width, canvas.height, flat)
  let frame: ImageData | null = ctx.createImageData(canvas.width, canvas.height)

  // Always entered from the flat map, so that is where it starts.
  let t = 1
  let spin = flat.centerLon
  let running = false
  let raf = 0
  let last = 0
  let dragging = false
  let dragFrom = 0
  let spinFrom = 0
  let markersOn = true

  function placeMarkers() {
    // Nothing on screen is worth positioning mid-morph: the bubbles are faded
    // out for it, because a marker interpolated between two projections is a
    // marker that is wrong in both.
    if (!markersOn) return

    for (const m of markers.values()) {
      const p = t < 0.5
        ? globeProject(m.lat, m.lng, spin, cssW, cssH)
        : { ...flatProject(m.lat, m.lng, cssW, cssH, cssFlat), front: true }

      if (!p.front) {
        // The far side of a sphere is not a thing you can click.
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
    if (!maps || !frame) return
    drawFrame(frame, terrain.data, terrain.w, terrain.h, maps, t, spin)
    ctx!.putImageData(frame, 0, 0)
  }

  function tick(now: number) {
    if (!running) return
    raf = requestAnimationFrame(tick)
    if (now - last < 1000 / FPS) return
    const dt = last ? (now - last) / 1000 : 0
    last = now

    if (!dragging && t < 0.5) spin += IDLE_SPIN * dt
    draw()
    placeMarkers()
  }

  function onPointerDown(e: PointerEvent) {
    if (t > 0.5) return
    dragging = true
    dragFrom = e.clientX
    spinFrom = spin
    stage.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    spin = spinFrom - ((e.clientX - dragFrom) / cssW) * DRAG_DEGREES
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    stage.releasePointerCapture?.(e.pointerId)
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerUp)

  return {
    get t() { return t },

    run() {
      if (running) return
      running = true
      last = 0
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

    morph(to: number, ms: number) {
      return new Promise<void>(resolve => {
        const from = t
        const started = performance.now()
        // Both ends of the turn carry on through the morph, so the globe is
        // still moving as it opens rather than freezing to be unwrapped.
        const step = (now: number) => {
          const p = Math.min(1, (now - started) / ms)
          // Ease out: most of the distance early, so it reads as settling.
          t = from + (to - from) * (1 - Math.pow(1 - p, 3))
          if (!dragging) spin += IDLE_SPIN / FPS
          draw()
          if (p < 1) { requestAnimationFrame(step); return }
          t = to
          draw()
          resolve()
        }
        requestAnimationFrame(step)
      })
    },

    destroy() {
      running = false
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      // Several megabytes of lookup tables; the view can be left and rejoined
      // many times in a session.
      maps = null
      frame = null
    },
  }
}
