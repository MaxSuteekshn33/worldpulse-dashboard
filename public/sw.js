/**
 * The service worker.
 *
 * Its job here is narrower than usual, and the narrowness is the point. This
 * dashboard is almost entirely live data: ships heard in the last quarter of
 * an hour, aircraft reported seconds ago, headlines refreshed every twenty
 * minutes. A cache that served any of that from yesterday would be telling
 * the reader something false — which is the one thing the whole app is built
 * not to do.
 *
 * So nothing from `/api` is ever cached, under any strategy. What is cached
 * is the shell: the hashed build output, the icons and the terrain image,
 * none of which can go stale because their names change when they do.
 *
 * The result is an app that opens instantly on a second visit and, offline,
 * loads properly and then tells you the feeds are unavailable — which the
 * layers already know how to say.
 */

const VERSION = 'worldpulse-v1'
const SHELL = `${VERSION}-shell`

/**
 * Worth having before anything else is requested.
 *
 * Deliberately short. Next's chunks are content-hashed and unknown at this
 * point, so they are picked up as they are used rather than listed here; a
 * precache list naming files that no longer exist fails the whole install.
 */
const PRECACHE = [
  '/icon-192.png',
  '/icon-512.png',
  '/world-terrain.webp',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      // Individually, so one missing file cannot fail the install and leave
      // the app with no worker at all.
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL).map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

/** Immutable by construction: content-hashed, or versioned with the deploy. */
function isShellAsset(url) {
  return url.pathname.startsWith('/_next/static/')
    || url.pathname === '/world-terrain.webp'
    || /^\/(icon|apple-icon)[\w-]*\.(png|svg)$/.test(url.pathname)
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Someone else's server — Google's tiles, the photo hosts. They have their
  // own caching and their own terms, and standing in the middle of that is
  // not this worker's business.
  if (url.origin !== self.location.origin) return

  // Live data. Never cached, never served stale, not even as a fallback: a
  // layer with no answer already says so plainly, which is the honest
  // outcome, and a day-old fleet shown as current is not.
  if (url.pathname.startsWith('/api/')) return

  if (isShellAsset(url)) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(SHELL).then(cache => cache.put(request, copy))
        }
        return res
      })),
    )
    return
  }

  // Pages. Network first, so a deploy is picked up immediately; the cached
  // copy exists for the offline case and is refreshed on every success.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(SHELL).then(cache => cache.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('/dashboard'))),
    )
  }
})
