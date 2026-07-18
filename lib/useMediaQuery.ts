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
