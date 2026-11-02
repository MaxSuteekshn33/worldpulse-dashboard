'use client'
import { useSyncExternalStore } from 'react'

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** SSR-safe media query hook backed by useSyncExternalStore (no render-then-sync flicker). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false, // server snapshot: assume desktop until hydrated
  )
}

/** True for phone-sized viewports (≤ 640px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)')
}

/** True for phone + small tablet viewports (≤ 860px). */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 860px)')
}

/**
 * True where the layer tabs have to give up their labels (≤ 720px).
 *
 * Deliberately not `useIsCompact`. The tabs were dropping to icons at 860
 * along with everything else, but the two have different thresholds: the
 * labelled bar is 494px, and once the "Live News Intelligence" tagline has
 * gone — which happens at 860 — the row needs about 680px, not 860. So
 * between those two widths the labels were being thrown away while there
 * was still room for them, which on a part-width laptop window meant
 * four unlabelled icons for no reason.
 */
export function useIsNarrow(): boolean {
  return useMediaQuery('(max-width: 720px)')
}
