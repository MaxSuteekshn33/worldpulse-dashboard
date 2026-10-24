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
 * Geometry that works at one scale need not work at the other. Monaco is a
 * real shape in the middle of the screen and nothing at all on a 360-degree
 * map, so the countries flagged `small` are marked there with a dot instead:
 * at world scale that is the honest rendering, and for a microstate "where is
 * this" is exactly the question the backdrop should answer.
 *
 * A country with no entry at all — the Vatican, whose source geometry is a
 * placeholder too small to draw — keeps the map behind it and leaves the flag
 * and the name to carry the screen.
 */
export default function CountryOutline({ code }: { code: string }) {
  const outline = OUTLINES[code]
  if (!outline) {
    return (
      <span className="wait-stage" aria-hidden>
        <svg
          className="wait-world"
          viewBox="-180 -90 360 180"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <path d={WORLD_PATH} />
        </svg>
      </span>
    )
  }

  const [x, y, w, h] = outline.box
  // Square window centred on the country, so the aspect ratio is the
  // country's own rather than the box's, and a long thin country (Chile)
  // isn't stretched to fill a square.
  // Purely proportional. An absolute term here (it was +0.4 degrees, which
  // looks like nothing next to Algeria's 21) swamps a microstate: it left
  // Monaco filling 8% of its own frame.
  const pad = Math.max(w, h) * 0.14
  const side = Math.max(w, h) + pad * 2
  const view = `${x + w / 2 - side / 2} ${y + h / 2 - side / 2} ${side} ${side}`
  // A constant fraction of the frame, so every country's line lands at the
  // same couple of pixels on screen.
  const weight = side / 155

  // A country whose path is unusable on the world map gets a dot at its
  // position instead — either because it is too small to see there, or
  // because its path deliberately runs past 180 and would be drawn off the
  // edge. Fiji's centre comes back inside the map here.
  const asDot = outline.small || outline.wrap
  const dotX = (((x + w / 2 + 180) % 360) + 360) % 360 - 180

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
          {/* The same country again, at its real size and place, so the big
              outline reads as a zoom rather than as a second, unrelated
              drawing. */}
          {asDot
            ? <circle className="wait-locate" cx={dotX} cy={y + h / 2} r={1.3} />
            : <path className="wait-locate" d={outline.d} />}
        </svg>
      </span>

      <svg className="wait-figure" viewBox={view} focusable="false" aria-hidden>
        {/* Under the stroke, so the trace reads as drawing an edge rather than
            as a shape appearing. */}
        <path className="outline-fill" d={outline.d} pathLength={1} />
        <path className="outline-trace" d={outline.d} pathLength={1} strokeWidth={weight} />
      </svg>
    </>
  )
}
