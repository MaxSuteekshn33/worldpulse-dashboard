let loadPromise: Promise<void> | null = null

/**
 * Loads the Maps JS API once per page.
 *
 * `loading=async` is the form Google asks for — without it the API logs a
 * performance warning on every load and bootstraps synchronously. The catch is
 * that under `loading=async` the script's `onload` fires before the `google.maps`
 * namespace is populated, so resolving there would hand callers a `google.maps`
 * without `Map` on it. `importLibrary` is the handshake that actually waits for
 * the libraries to land; everything downstream keeps using the classic
 * `new google.maps.Map(...)` namespace once it resolves.
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loadPromise) return loadPromise
  if (typeof window !== 'undefined' && window.google?.maps?.Map) {
    return Promise.resolve()
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
      '&libraries=marker&region=IN&language=en&loading=async&callback=__worldpulseMapsReady'
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Google Maps failed to load'))

    // The documented ready signal under loading=async. It fires once the core
    // namespace is usable, which is the point the callers below depend on.
    ;(window as unknown as Record<string, unknown>).__worldpulseMapsReady = () => resolve()

    document.head.appendChild(script)
  })

  return loadPromise
}
