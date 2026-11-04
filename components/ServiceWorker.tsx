'use client'
import { useEffect } from 'react'

/**
 * Registers the service worker, once, after the page has settled.
 *
 * Deliberately not on mount. Registration kicks off the install, which
 * fetches the terrain image and the icons, and doing that while the map is
 * still pulling tiles and the first feed is in flight puts the worker in
 * competition with the thing the reader is waiting for. The `load` event is
 * the point at which the page has what it needs and the worker can have the
 * rest.
 *
 * Only in production: a worker caching a development build serves yesterday's
 * chunks after a rebuild and produces bugs that are entirely its own.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // A refused registration — a private window, a locked-down browser —
        // costs nothing here. The app works without it; it just starts
        // slower on the second visit.
      })
    }

    if (document.readyState === 'complete') {
      // Already loaded by the time this ran; wait a beat rather than
      // registering inside the effect body.
      const id = window.setTimeout(register, 0)
      return () => window.clearTimeout(id)
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
