import type { MetadataRoute } from 'next'

/**
 * What the app is when it is installed.
 *
 * Served by Next at `/manifest.webmanifest`. This is also the file a Trusted
 * Web Activity wrapper reads when the same build is put on Play, so the name,
 * the colours and the icons here are what appear on a phone's home screen and
 * in the Play listing — not just in a browser's install prompt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WorldPulse — Live News Intelligence',
    short_name: 'WorldPulse',
    description:
      'Headlines, politics, world affairs, economy and finance across 200 countries, '
      + 'with live shipping and flight layers over the same map.',

    /**
     * Opens on the map rather than the landing page.
     *
     * Someone who has installed this has already been sold on it; the landing
     * page exists to explain the thing to a stranger. The dashboard is what
     * they installed it for.
     */
    start_url: '/dashboard',
    scope: '/',

    /** No browser chrome — this is the whole point of installing it. */
    display: 'standalone',

    /**
     * Both orientations. The layout follows a rotation now, and on a tablet
     * landscape is the better way to read a world map; locking it would be
     * taking that away for no reason.
     */
    orientation: 'any',

    /** The page's own dark, so there is no white flash on launch. */
    background_color: '#08080C',
    theme_color: '#08080C',

    categories: ['news', 'navigation', 'travel'],

    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Maskable is a separate file rather than the same one relabelled: the
      // launcher crops to a circle on most Android devices, so the artwork is
      // drawn smaller inside the frame to survive it.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
