'use client'
import { OUTLINES, WORLD_PATH } from '@/lib/outlines'

/**
 * The country being opened, traced in orange over a faint world map.
 *
 * This is the loading screen's whole visual, and it is lazy-loaded, so the
 * ~21KB of geometry never reaches someone who only reads the dashboard.
 *
 * Two layers rather than one, because they want different things. The world
 * behind is the real equirectangular extent, so it reads as a map. The country
 * in front is scaled to its own bounding box, because at world scale the point
 * of the exercise is lost — Lesotho would be four pixels. So the backdrop says
 * "a map" and the figure says "this country", and they are deliberately not at
 * the same scale.
 *
 * The stroke width is derived from the viewBox rather than fixed, because the
 * geometry is in degrees and the zoom varies 100× between Russia and Qatar.
 * The obvious fix, `vector-effect: non-scaling-stroke`, is the wrong one here:
 * it switches `stroke-dasharray` to screen pixels, which silently defeats the
 * `pathLength="1"` normalisation the trace depends on and shatters the outline
 * into a scatter of 1px dashes. Scaling the width by hand keeps both.
 *
 * The 31 countries with no geometry at this scale still get the world behind
 * them — losing the backdrop as well as the outline would make a handful of
 * countries look like a different, emptier screen — and the caller's flag and
 * name carry those on their own.
 */
export default function CountryOutline({ code }: { code: string }) {
  const outline = OUTLINES[code]

  let view = ''
  let weight = 0
  if (outline) {
    const [x, y, w, h] = outline.box
    // Square window centred on the country, so the aspect ratio is the
    // country's own rather than the box's, and a long thin country (Chile)
    // isn't stretched to fill a square.
    const pad = Math.max(w, h) * 0.14 + 0.4
    const side = Math.max(w, h) + pad * 2
    view = `${x + w / 2 - side / 2} ${y + h / 2 - side / 2} ${side} ${side}`
    // A constant fraction of the frame, so every country's line lands at the
    // same couple of pixels on screen.
    weight = side / 155
  }

  // Two layers that want different places in the layout, so they are siblings
  // rather than nested: the world is a backdrop and takes itself out of flow,
  // while the outline is the first item in the caller's column and pushes the
  // flag and the name down below it. Nesting them cost the outline its space —
  // both ended up centred on the same point and the name sat across the middle
  // of the country.
  return (
    <>
      <span className="wait-stage" aria-hidden>
        <svg
          className="wait-world"
          viewBox="-180 -90 360 180"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <path d={WORLD_PATH} />
          {/* The same country again, at its real size and place. A plain dot
              was tried here and read as a smudge; its own shape says where it
              is and makes the big outline legible as a zoom rather than as a
              second, unrelated drawing. */}
          {outline && <path className="wait-locate" d={outline.d} />}
        </svg>
      </span>

      {outline && (
        <svg className="wait-figure" viewBox={view} focusable="false" aria-hidden>
          {/* Under the stroke, so the trace reads as drawing an edge rather
              than as a shape appearing. */}
          <path className="outline-fill" d={outline.d} pathLength={1} />
          <path className="outline-trace" d={outline.d} pathLength={1} strokeWidth={weight} />
        </svg>
      )}
    </>
  )
}
