'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FEATURED_CODES, getCountryByCode } from '@/lib/countries'

/**
 * The opening sequence's component, loaded out of band and held in state.
 *
 * It was a `lazy` inside a `Suspense`, which is the obvious shape and was the
 * wrong one here. The click starts two things at once: this boundary, and a
 * route render inside a transition that builds a hundred-odd cards. React
 * reveals suspended content at transition priority, so the map sat behind that
 * render and did not commit until it finished — measured at 3,024ms into a
 * 3,200ms screen, with the chunk itself in cache since 151ms. The sequence was
 * starved by the page it was covering.
 *
 * Imported up front instead and kept in ordinary state, it is already a
 * component reference by the time anyone clicks, and it mounts in the same
 * urgent update that puts the screen up.
 */
type OutlineComponent = React.ComponentType<{ code: string }>

/**
 * Cross-fades navigation, but only where the destination is already built.
 *
 * The unscoped version of this — React's `ViewTransition` via Next's
 * `experimental.viewTransition` — was tried and taken out. A view transition
 * freezes the old page until the new route commits, and 195 of the 200 country
 * pages render on demand, so it hid the loading skeletons on exactly the routes
 * that need them and aborted with `TimeoutError: Transition was aborted because
 * of timeout in DOM update` after holding the page still for four seconds.
 *
 * Two things make this version safe where that one wasn't:
 *
 * 1. **It only runs toward prerendered routes.** Everything else navigates
 *    normally and gets its skeleton immediately.
 * 2. **The freeze is capped.** The browser waits on the callback's promise, so
 *    the promise resolves either when the route commits or after `FREEZE_CAP`,
 *    whichever comes first. A misprediction costs a fifth of a second, not four
 *    seconds and an uncaught error.
 *
 * It also uses `document.startViewTransition` directly, so the app stays on
 * stable React rather than moving to the experimental channel for a cross-fade.
 */

/** Built at build time, so they commit in a frame or two. */
const INSTANT = new Set<string>([
  '/',
  '/dashboard',
  ...FEATURED_CODES.map(code => `/country/${code}`),
])

export function isInstantRoute(href: string): boolean {
  return INSTANT.has(href.split(/[?#]/)[0].replace(/\/$/, '') || '/')
}

/**
 * Longest the page may sit frozen. Prerendered routes commit far inside this;
 * the cap exists so that being wrong about that is cheap.
 */
const FREEZE_CAP = 220

/**
 * How long the country opening sequence is held, whatever the feeds do.
 *
 * It used to be shown for exactly as long as the fetch took, which meant that
 * the better the site got the less of it you saw: a cached country commits in
 * a couple of hundred milliseconds, so the camera had barely started moving
 * before the screen was pulled and all you registered was a flinch. Matching
 * the sequence's own length instead makes it the transition rather than a
 * cover for one — the page renders underneath while it plays, so nothing is
 * actually waiting on this by the end.
 *
 * Matches the timeline in globals.css, which ends at 2.65s, plus enough slack
 * to absorb the lazy chunk mounting — measured at 150-450ms warm, and the
 * animations only start once it is on screen. Without the slack the last
 * fraction of the border draw was being cut off.
 *
 * Change this, change the timeline.
 */
const INTRO_MS = 3200

const NavContext = createContext<(href: string) => void>(() => {})

export function useSoftNav() {
  return useContext(NavContext)
}

/** `/country/DZ` -> the country, so the screen can say which one it is. */
function countryFromHref(href: string) {
  return codeFromHref(href) ? getCountryByCode(codeFromHref(href)!) : undefined
}

function codeFromHref(href: string) {
  const code = href.match(/^\/country\/([A-Za-z]{2})(?:\/[a-z]+)?$/)?.[1]
  return code ? code.toUpperCase() : undefined
}

export default function NavTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const pending = useRef<{ href: string; done: () => void } | null>(null)

  // Next keeps the OLD page on screen until the new route is ready, and its
  // loading.tsx boundary does not show on these navigations — measured: on a
  // search-to-country jump the URL and the content both appeared at 636ms and
  // no skeleton rendered in between. On a country whose feeds are slow that is
  // several seconds of a page that looks like it ignored the click. So the
  // pending state is tracked here and answered immediately.
  const [waiting, startNavigation] = useTransition()
  const [headingTo, setHeadingTo] = useState<string | null>(null)
  // False while the opening sequence still has time to run. Set from a timer
  // rather than an effect, so there is no cascading render to lint around.
  const [introDone, setIntroDone] = useState(true)
  const introTimer = useRef(0)
  const [Outline, setOutline] = useState<OutlineComponent | null>(null)

  // Resolves the transition once React has committed the new route. Runs after
  // the commit and before paint, which is where the browser wants to take its
  // "after" snapshot.
  useEffect(() => {
    const held = pending.current
    if (held && held.href === pathname) {
      pending.current = null
      held.done()
    }
  }, [pathname])

  // Warm the opening sequence while nothing is happening — both halves of it,
  // the satellite image and the chunk that draws it.
  //
  // The chunk matters more than it looks. The sequence is held for a fixed
  // three seconds, and those seconds start when the click lands, not when the
  // code to animate arrives; measured cold, the chunk turned up two seconds in
  // and the camera had a third of a second to cross the world before the
  // screen was pulled. Warmed, it mounts on the first frame.
  //
  // The one moment either is needed is the one moment there is no spare
  // bandwidth — the country's feeds are being fetched — so both are pulled in
  // beforehand, and if neither has arrived the screen still names the country
  // and nothing breaks.
  useEffect(() => {
    let live = true
    // The code goes first and without waiting for idle: it is small, and it
    // has to be resolved before a click, not during one.
    import('./CountryOutline').then(m => {
      if (live) setOutline(() => m.default)
    })

    // The image can wait for a gap — it is half a megabyte, and hydration has
    // better uses for the moment after load.
    const warm = () => { new Image().src = '/world-terrain.webp' }
    const hasIdle = typeof window.requestIdleCallback === 'function'
    const id = hasIdle
      ? window.requestIdleCallback(warm, { timeout: 4000 })
      : window.setTimeout(warm, 2500)
    return () => {
      live = false
      if (hasIdle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [])

  const navigate = useCallback((href: string) => {
    // Only entering a country opens with the sequence. Moving between a
    // country's own sections is navigation inside something you have already
    // arrived at, and flying the globe in again to land in the same place
    // would be three seconds of saying nothing.
    const opening =
      !!codeFromHref(href) && codeFromHref(href) !== codeFromHref(pathname)

    // Inside a transition so `waiting` is true for exactly as long as the new
    // route takes, with no timer to guess at.
    const plain = () => {
      setHeadingTo(href)
      window.clearTimeout(introTimer.current)
      setIntroDone(!opening)
      if (opening) {
        introTimer.current = window.setTimeout(() => setIntroDone(true), INTRO_MS)
      }
      startNavigation(() => router.push(href))
    }

    if (
      typeof document === 'undefined' ||
      !document.startViewTransition ||
      !isInstantRoute(href) ||
      // A country has its own opening; freezing the page for a cross-fade
      // first would only delay it.
      opening ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      plain()
      return
    }

    document.startViewTransition(
      () =>
        new Promise<void>(resolve => {
          let settled = false
          const done = () => {
            if (settled) return
            settled = true
            resolve()
          }
          pending.current = { href, done }
          plain()
          // The cap. Without it a slow commit holds the whole page still.
          window.setTimeout(done, FREEZE_CAP)
        }),
    )
  }, [router, pathname])

  useEffect(() => () => window.clearTimeout(introTimer.current), [])

  // Held until the route has committed AND the sequence has run its length.
  // Both are plain values, so this needs no effect and no clearing: the next
  // navigation sets them again.
  const showing = (waiting || !introDone) && headingTo
  const destination = showing ? countryFromHref(headingTo) : undefined

  return (
    <NavContext.Provider value={navigate}>
      {children}
      {destination && (
        <RouteWait
          code={destination.code}
          flag={destination.flag}
          name={destination.name}
          Outline={Outline}
        />
      )}
    </NavContext.Provider>
  )
}

/**
 * The country opening sequence.
 *
 * The map is the screen; the caption sits along the bottom rather than in the
 * middle, because the middle is where the country lands. It names the country
 * from the first frame — the one thing someone wants confirmed after clicking
 * is that the click landed where they meant, and that answer should not wait
 * for a camera move.
 */
function RouteWait({ code, flag, name, Outline }: {
  code: string
  flag: string
  name: string
  Outline: OutlineComponent | null
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="route-wait"
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: 'clamp(56px, 13vh, 128px)',
      }}
    >
      {/* Nothing until the chunk has been loaded, which in practice is long
          before the first click. A placeholder for a map would be worse than
          no map, and the caption already carries the screen. */}
      {Outline && <Outline code={code} />}

      <span className="wait-caption">
        <span style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <span style={{ fontSize: '31px', lineHeight: 1 }} aria-hidden>{flag}</span>
          <span className="display-lg" style={{ fontSize: 'clamp(26px, 3.4vw, 38px)' }}>{name}</span>
        </span>
        <span className="mono-label" style={{ color: 'var(--text-4)' }}>
          Gathering the latest
        </span>
      </span>
    </div>
  )
}
