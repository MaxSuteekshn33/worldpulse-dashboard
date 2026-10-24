'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FEATURED_CODES, getCountryByCode } from '@/lib/countries'

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

const NavContext = createContext<(href: string) => void>(() => {})

export function useSoftNav() {
  return useContext(NavContext)
}

/** `/country/DZ` -> the country, so the wait can say what it is waiting for. */
function countryFromHref(href: string) {
  const code = href.match(/^\/country\/([A-Za-z]{2})(?:\/[a-z]+)?$/)?.[1]
  return code ? getCountryByCode(code.toUpperCase()) : undefined
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

  const navigate = useCallback((href: string) => {
    // Inside a transition so `waiting` is true for exactly as long as the new
    // route takes, with no timer to guess at.
    const plain = () => {
      setHeadingTo(href)
      startNavigation(() => router.push(href))
    }

    if (
      typeof document === 'undefined' ||
      !document.startViewTransition ||
      !isInstantRoute(href) ||
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
  }, [router])

  // `headingTo` is only read while waiting, so it needs no clearing when the
  // navigation lands — which keeps this out of an effect.
  const destination = waiting && headingTo ? countryFromHref(headingTo) : undefined

  return (
    <NavContext.Provider value={navigate}>
      {children}
      {destination && <RouteWait flag={destination.flag} name={destination.name} />}
    </NavContext.Provider>
  )
}

/**
 * Covers the page while a country is being fetched.
 *
 * Deliberately names the country rather than showing a bare spinner: the one
 * thing someone wants confirmed after clicking is that the click landed on the
 * country they meant.
 */
function RouteWait({ flag, name }: { flag: string; name: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="route-wait"
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '18px',
      }}
    >
      <span style={{ fontSize: '46px', lineHeight: 1 }} aria-hidden>{flag}</span>
      <span className="display-lg" style={{ fontSize: 'clamp(24px, 3vw, 34px)' }}>{name}</span>
      <span
        className="skeleton"
        style={{ width: 'min(220px, 50vw)', height: '3px', borderRadius: '2px' }}
      />
      <span className="mono-label" style={{ color: 'var(--text-4)' }}>
        Gathering the latest
      </span>
    </div>
  )
}
