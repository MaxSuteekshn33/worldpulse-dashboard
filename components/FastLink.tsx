'use client'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useSoftNav } from './NavTransition'

/**
 * A `next/link` that cross-fades when the destination is prerendered.
 *
 * Anything else — the 195 on-demand country pages, every section page — falls
 * through to an ordinary navigation, so those keep showing their loading
 * skeleton the instant they're clicked. Modified and middle clicks are left
 * alone, as everywhere else in the app: the `href` is right there to do what
 * those gestures mean.
 */
export default function FastLink({ href, onClick, children, ...rest }: ComponentProps<typeof Link>) {
  const navigate = useSoftNav()
  const target = typeof href === 'string' ? href : null

  return (
    <Link
      href={href}
      {...rest}
      onClick={e => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        // Every in-app link goes through the helper, not just the instant
        // ones: it decides whether to cross-fade, and it is what knows a
        // navigation is in flight so the wait screen can appear.
        if (!target || !target.startsWith('/')) return
        e.preventDefault()
        navigate(target)
      }}
    >
      {children}
    </Link>
  )
}
