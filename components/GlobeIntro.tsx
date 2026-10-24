'use client'
import { useEffect, useRef, useState } from 'react'
import { CENTER_LAT, CENTER_LON, HOME_ZOOM, buildMaps, drawFrame, loadTerrain, perLonAtZoom } from '@/lib/globe'

/**
 * The dashboard's opening: the world turning, then unwrapping into the map.
 *
 * It exists because arriving at the dashboard is not instant and never can be.
 * Google's tiles take a second or two cold, and the bubbles cannot be coloured
 * until the pulse endpoint has answered for two hundred countries — which it
 * does in batches, so the map visibly fills in. Watching that happen is
 * watching the machinery. This covers the same seconds with the thing the
 * dashboard is actually about.
 *
 * The live map initialises underneath the whole time, so this is spending a
 * wait that was already there rather than adding one.
 *
 * Everything per-frame is written straight to a canvas from refs. There is one
 * piece of React state here and it fires once, at the end, to unmount — a
 * component that re-rendered sixty times a second to animate would be paying
 * React for work the compositor is already doing.
 */

/** The world turns. */
const SPIN_MS = 2600
/** It opens out flat. */
const OPEN_MS = 1500
/** The flat map holds while it hands over to the live one. */
const SETTLE_MS = 900
const TOTAL_MS = SPIN_MS + OPEN_MS + SETTLE_MS

/** Degrees a second. Enough that a face of the world visibly goes by. */
const SPIN_RATE = 36
/** Where the frame is pixel-for-pixel; above this the canvas is upscaled. */
const PIXEL_BUDGET = 420_000

/**
 * Remembers, for this tab only, that the world has already turned once.
 *
 * Coming back to the map from a country remounts all of this, and the cold
 * start it covers is real every time — so returning does not skip the opening,
 * it joins it late, at the unwrap. The turn is the part that would wear out on
 * the fifth viewing; the unwrap is over in two seconds and still covers the
 * tiles. Per tab rather than stored, because a new visit should get the whole
 * thing again.
 */
const SEEN_KEY = 'worldpulse:globe-seen'

function alreadySeen(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return true
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch { /* blocked storage: every arrival gets the full opening */ }
  return false
}

/** Smooth at both ends, so neither the unwrap nor the landing snaps. */
function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export default function GlobeIntro({ onDone }: { onDone?: () => void }) {
  const [gone, setGone] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const skipRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let raf = 0
    let backstop = 0
    let cancelled = false
    const finish = () => {
      if (cancelled) return
      cancelled = true
      setGone(true)
      onDone?.()
    }

    // Nothing here is worth doing without motion: a still frame of a globe
    // over the map is just something in the way.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    const skip = () => { skipRef.current = true }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)

    ;(async () => {
      let terrain
      try {
        terrain = await loadTerrain('/world-terrain.webp')
      } catch {
        // No image, no opening. The map behind is already on its way.
        finish()
        return
      }
      if (cancelled) return

      const rect = canvas.getBoundingClientRect()
      // Deliberately not devicePixelRatio: every pixel here costs a trip
      // through the reprojection, and the frame is stretched back up by CSS,
      // where the softness is invisible against something this dark and this
      // fast.
      const fit = Math.min(1, Math.sqrt(PIXEL_BUDGET / Math.max(1, rect.width * rect.height)))
      const w = Math.max(320, Math.round(rect.width * fit))
      const h = Math.max(240, Math.round(rect.height * fit))
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) { finish(); return }

      // The flat end is the live map's home view, in the live map's own
      // projection, so the dissolve at the end lands on top of it rather than
      // beside it. `fit` is folded in because the canvas is stretched back up
      // by CSS and the scale has to be in canvas pixels.
      const maps = buildMaps(w, h, {
        centerLat: CENTER_LAT,
        centerLon: CENTER_LON,
        perLon: perLonAtZoom(HOME_ZOOM) * fit,
      })
      const frame = ctx.createImageData(w, h)
      if (cancelled) return

      // The last meridian to come round is the one the live map is centred on,
      // so the handover is not also a jump sideways.
      const startSpin = CENTER_LON - (SPIN_RATE * SPIN_MS) / 1000
      const started = performance.now()
      const from = alreadySeen() ? SPIN_MS : 0

      const tick = (now: number) => {
        if (cancelled) return
        const elapsed = skipRef.current ? TOTAL_MS : now - started + from

        const openRaw = (elapsed - SPIN_MS) / OPEN_MS
        const t = openRaw <= 0 ? 0 : openRaw >= 1 ? 1 : easeInOut(openRaw)

        // Keeps turning into the unwrap, easing off as the sphere goes, so it
        // settles rather than stopping dead.
        const turning = Math.min(elapsed, SPIN_MS) + Math.max(0, elapsed - SPIN_MS) * (1 - t)
        const spin = startSpin + (SPIN_RATE * turning) / 1000

        drawFrame(frame, terrain.data, terrain.w, terrain.h, maps, t, spin)
        ctx.putImageData(frame, 0, 0)

        // Handing over: the flat frame dissolves into the live map under it,
        // which by now has had five seconds to get its tiles.
        if (elapsed > SPIN_MS + OPEN_MS) {
          const out = (elapsed - SPIN_MS - OPEN_MS) / SETTLE_MS
          canvas.style.opacity = String(Math.max(0, 1 - out))
        }

        if (elapsed >= TOTAL_MS) { finish(); return }
        raf = requestAnimationFrame(tick)
      }

      raf = requestAnimationFrame(tick)

      // A wall clock behind the frame clock. Animation frames stop entirely
      // in a background tab, and this sits on top of the map — so without a
      // timer that does not depend on being painted, a dashboard opened in a
      // tab nobody is looking at would come back to a globe over the map and
      // no way past it. Measured here: ten seconds of a stalled loop and the
      // canvas never left.
      backstop = window.setTimeout(finish, TOTAL_MS - from + 1200)
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(backstop)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [onDone])

  if (gone) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, zIndex: 140,
        background: 'var(--bg)',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
