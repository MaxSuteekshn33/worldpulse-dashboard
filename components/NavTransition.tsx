'use client'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FEATURED_CODES } from '@/lib/countries'

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

export default function NavTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const pending = useRef<{ href: string; done: () => void } | null>(null)

  // Resolves the transition once React has committed the new route. Runs after
  // the commit and before paint, which is where the browser wants to take its
  // "after" snapshot.
  useEffect(() => {
    const waiting = pending.current
    if (waiting && waiting.href === pathname) {
      pending.current = null
      waiting.done()
    }
  }, [pathname])

  const navigate = useCallback((href: string) => {
    const plain = () => router.push(href)

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

  return <NavContext.Provider value={navigate}>{children}</NavContext.Provider>
}
