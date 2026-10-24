'use client'
import { OUTLINES, WORLD_PATH } from '@/lib/outlines'

/**
 * The opening sequence for a country: the globe pushing in until the country
 * fills the frame, lit up and drawn on the satellite map.
 *
 * This is the screen's subject, not a cover for the wait behind it. The feeds
 * are usually quicker than the sequence, so the caller holds it for the length
 * of the sequence rather than the length of the fetch, and the country page
 * renders underneath while it plays.
 *
 * **The country is drawn on the map, not over it.** An earlier version put a
 * big outline in the middle of the screen and flew the map in behind it, and
 * the two could never agree: once the camera arrives you can see the country
 * in the imagery, so a second copy of it at another scale reads as a
 * registration bug rather than as two layers. Here the path is inside the
 * group the camera moves, so it lands exactly on its own coastline — one
 * object, highlighted and traced.
 *
 * **The backdrop is a bundled satellite image**, not Google Earth and not a
 * second Maps instance. Photorealistic 3D tiles are tens of megabytes behind a
 * session charge; even a terrain raster map costs a map load and half a second
 * of initialisation before tiles start streaming. Either would mean an opening
 * sequence that takes longer to arrive than it lasts. This is 500KB, warmed on
 * idle, and already in the same equirectangular frame as the outlines, so
 * placing it needs no projection step.
 */

/** The share of the screen's tighter dimension the country comes to rest at. */
const FILL = .42
/**
 * How far the image may be magnified past its own pixels before it stops
 * looking like terrain. Seven is measured, not guessed: at that magnification
 * Qatar — the tightest zoom any country asks for — is indistinguishable from
 * the same frame cut from the full 5400px source.
 */
const MAX_UPSCALE = 7
/** Pixels across the image, which is what sets the ceiling above. */
const IMAGE_WIDTH = 4608
/**
 * Below this share of the screen the country is a speck on the map and cannot
 * be the subject of anything. Those get the other treatment — a marker where
 * they are, and their shape drawn large in the middle. It is 20 of 199, all
 * microstates.
 */
const MIN_SHARE = .05

/** Target on-screen size, in CSS pixels, for things that must not scale. */
const EDGE_PX = 2
const MARKER_PX = 7

/**
 * The camera, worked out against the viewport rather than the view box.
 *
 * `preserveAspectRatio="slice"` means the view box does not tell you what is
 * on screen: a 360x180 box over a tall viewport is cropped hard horizontally,
 * so sizing the zoom against 360 put Yemen at a third of the frame on a wide
 * monitor and well past its edges on a phone. What is visible is derived from
 * the viewport, and the zoom from that.
 *
 * This reads the viewport during render, which is safe only because this
 * component never renders on the server — it is lazy-loaded and mounts in
 * response to a click. It does not follow a resize, which for a screen that
 * lives three seconds is not worth an observer.
 */
function camera(w: number, h: number) {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  // CSS pixels per user unit, and from that the user units actually on screen.
  const pxPerUnit = Math.max(vw / 360, vh / 180)
  const unitsWide = vw / pxPerUnit
  const unitsHigh = vh / pxPerUnit

  // Whichever of the country's dimensions is tighter against the screen is
  // the one that decides the zoom, so nothing is ever cropped.
  const tight = Math.max(w / unitsWide, h / unitsHigh)
  const ceiling = (MAX_UPSCALE * IMAGE_WIDTH) / (360 * pxPerUnit)
  const k = Math.min(ceiling, Math.max(1, FILL / tight))

  return { k, pxPerUnit, unitsWide, unitsHigh, share: tight * k / FILL * FILL }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export default function CountryOutline({ code }: { code: string }) {
  const outline = OUTLINES[code]

  // No geometry at all — the Vatican, whose source is a placeholder too small
  // to draw. It still gets the map; the flag and the name carry the rest.
  if (!outline) return <Stage>{null}</Stage>

  const [x, y, w, h] = outline.box
  const span = Math.max(w, h)
  const { k, pxPerUnit, unitsWide, unitsHigh } = camera(w, h)

  // Fiji's path deliberately runs past 180 so the country stays one shape,
  // which is fine in its own frame and useless on a map that stops there.
  const registered = w / (unitsWide / k) >= MIN_SHARE && !outline.wrap

  const centreX = (((x + w / 2 + 180) % 360) + 360) % 360 - 180
  // Kept inside the image, or the poles and the dateline bring in bands of
  // empty black. Shifted into the backdrop's 0..360 by 0..180 frame.
  const halfW = unitsWide / (2 * k)
  const halfH = unitsHigh / (2 * k)
  const fx = clamp(centreX + 180, halfW, 360 - halfW)
  const fy = clamp(y + h / 2 + 90, halfH, 180 - halfH)

  // Constant on screen through the whole zoom, which is the one thing a
  // user-unit length cannot be — so it is divided back out here.
  const onScreen = (px: number) => px / (k * pxPerUnit)

  const pad = span * 0.14
  const side = span + pad * 2
  const inset = `${x + w / 2 - side / 2} ${y + h / 2 - side / 2} ${side} ${side}`

  return (
    <>
      <Stage fly={{ fx, fy, k }}>
        {registered
          ? (
            <>
              <path className="wait-claim" d={outline.d} />
              <path
                className="wait-edge"
                d={outline.d}
                pathLength={1}
                strokeWidth={onScreen(EDGE_PX)}
              />
            </>
          )
          : <circle className="wait-locate" cx={centreX} cy={y + h / 2} r={onScreen(MARKER_PX)} />}
      </Stage>

      {!registered && (
        <svg className="wait-figure" viewBox={inset} focusable="false" aria-hidden>
          {/* Under the stroke, so the trace reads as drawing an edge rather
              than as a shape appearing. */}
          <path className="outline-fill" d={outline.d} pathLength={1} />
          <path className="outline-trace" d={outline.d} pathLength={1} strokeWidth={side / 155} />
        </svg>
      )}
    </>
  )
}

/**
 * The map and the camera over it.
 *
 * The view box runs 0..360 by 0..180 rather than the -180..180 the outlines
 * are stored in, and the children are shifted into it. That is not tidiness.
 * Moving the camera means a CSS transform, which needs a transform-origin, and
 * Chrome resolves one against a view-box reference box without adding the box's
 * own min-x and min-y — so on a -180..180 box `50% 50%` comes out at user-space
 * (180, 90) rather than (0, 0), which measured as the terrain parked 10,110px
 * off screen. With the box starting at the origin both readings agree.
 */
function Stage({ fly, children }: {
  fly?: { fx: number; fy: number; k: number }
  children?: React.ReactNode
}) {
  return (
    <span className="wait-stage" aria-hidden>
      <svg
        className="wait-world"
        viewBox="0 0 360 180"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {/*
          * The move is split across two groups, and that is what makes it look
          * like a camera rather than a CSS transition.
          *
          * A zoom has to be geometric. Interpolating scale from 1 to 12 in a
          * straight line spends as long going from 11 to 12 as from 1 to 2, so
          * the world rushes away and then crawls. The outer group steps the
          * scale through powers instead — each quarter of the move multiplies
          * it by the same factor — which is a steady zoom to the eye.
          *
          * The pan underneath it stays linear. Keeping the two on separate
          * elements is the whole trick: one set of keyframes can be geometric
          * and the other linear without either having to know the other's
          * numbers, where a single transform would need every intermediate
          * position computed and handed over as its own custom property.
          */}
        <g className="wait-zoom" style={{
          '--fly-k': fly?.k ?? 1,
          '--fly-k1': Math.pow(fly?.k ?? 1, .25),
          '--fly-k2': Math.pow(fly?.k ?? 1, .5),
          '--fly-k3': Math.pow(fly?.k ?? 1, .75),
        } as React.CSSProperties}>
          <g className="wait-pan" style={fly
            ? ({
              '--pan-x': `${180 / fly.k - fly.fx}px`,
              '--pan-y': `${90 / fly.k - fly.fy}px`,
            } as React.CSSProperties)
            : undefined}
          >
            {/* `preserveAspectRatio="none"` is right here and nowhere else:
                the image IS the view box's extent, so stretching it to those
                bounds is what lines it up with everything drawn over it. */}
            <image
              className="wait-terrain"
              href="/world-terrain.webp"
              x={0} y={0} width={360} height={180}
              preserveAspectRatio="none"
            />
            <g transform="translate(180 90)">
              {/* Coastlines for as long as the picture is a map. They are 110m
                  data rounded to a tenth of a degree, which is honest at world
                  scale and eleven kilometres of wrong at twentyfold zoom, so
                  they leave as the camera arrives. */}
              <path className="wait-borders" d={WORLD_PATH} />
              {children}
            </g>
          </g>
        </g>
      </svg>
    </span>
  )
}
