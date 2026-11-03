'use client'
import { useSyncExternalStore } from 'react'

/**
 * The dashboard's state, in the address bar.
 *
 * Until now the whole thing lived in React: which layer was open, whether
 * you were on the globe, and where you had panned to. All of it survived
 * exactly as long as the tab did. You could find the Strait of Hormuz with
 * the shipping layer open and have no way to send that to anyone — the URL
 * said `/dashboard` the entire time, and a reload put you back over the
 * Atlantic looking at the news.
 *
 * What goes in: the layer, the projection, and the camera. What stays out:
 * which ship or aircraft is selected. Those are identified by MMSI and ICAO
 * hex, both real identifiers — but the things they name have moved or aged
 * out of the window within the hour, so a link to one would be a link to an
 * empty map and a panel that cannot open. The chokepoints and air hubs are
 * fixed and could be linked; they are left out too, for now, so that the
 * rule is simple and there is no second class of link that works only
 * sometimes.
 */

export interface MapUrlState {
  layer: string | null
  view: 'map' | 'globe' | null
  lat: number | null
  lng: number | null
  zoom: number | null
}

const EMPTY: MapUrlState = { layer: null, view: null, lat: null, lng: null, zoom: null }

/** Fired after our own `replaceState`, which does not emit `popstate`. */
const CHANGED = 'worldpulse:urlchange'

function num(raw: string | null): number | null {
  if (raw === null) return null
  const v = Number(raw)
  return Number.isFinite(v) ? v : null
}

/**
 * A one-off read, for callers outside React's render — the map's own setup,
 * which needs the camera before there is anything to re-render.
 */
export function readMapUrl(): MapUrlState {
  return read()
}

function read(): MapUrlState {
  if (typeof window === 'undefined') return EMPTY
  const q = new URLSearchParams(window.location.search)
  const view = q.get('view')
  return {
    layer: q.get('layer'),
    view: view === 'globe' || view === 'map' ? view : null,
    lat: num(q.get('lat')),
    lng: num(q.get('lng')),
    zoom: num(q.get('z')),
  }
}

/**
 * The snapshot has to be referentially stable or `useSyncExternalStore`
 * re-renders forever: it compares with `Object.is`, and `read()` builds a
 * fresh object every call. So the parsed state is cached against the query
 * string it came from.
 */
let cachedSearch: string | null = null
let cached: MapUrlState = EMPTY

function snapshot(): MapUrlState {
  if (typeof window === 'undefined') return EMPTY
  const search = window.location.search
  if (search !== cachedSearch) {
    cachedSearch = search
    cached = read()
  }
  return cached
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(CHANGED, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(CHANGED, onChange)
  }
}

/** Reads the dashboard state out of the address bar, SSR-safe. */
export function useMapUrl(): MapUrlState {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY)
}

/**
 * Writes some of it back, without touching history.
 *
 * `replaceState` rather than `pushState` throughout: panning a map is not
 * navigation, and a back button that walks you through every frame of a drag
 * is worse than one that leaves the dashboard in one step. The trade is that
 * back does not undo a layer change either, which is the right way round —
 * the tabs are visible and one click away, and the browser's back button is
 * how you leave a page.
 */
export function writeMapUrl(next: Partial<Record<'layer' | 'view' | 'lat' | 'lng' | 'z', string | null>>): void {
  if (typeof window === 'undefined') return

  const q = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === '') q.delete(key)
    else q.set(key, value)
  }

  const search = q.toString()
  const url = `${window.location.pathname}${search ? `?${search}` : ''}`
  if (url === `${window.location.pathname}${window.location.search}`) return

  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(CHANGED))
}
