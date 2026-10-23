'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Counts a figure up on first paint.
 *
 * The stats strip states the size of the thing — 200 countries, 15 newsrooms —
 * and a number that lands by moving says "this was counted" in a way a static
 * one doesn't. The container already sets `tabular-nums`, so the digits don't
 * jitter the layout on the way up.
 */
export default function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  // Starts at the final value: that is what the server renders, what anyone
  // without JavaScript sees, and what a reader who asked for reduced motion
  // keeps.
  const [value, setValue] = useState(to)
  const frame = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1)
      // Ease out: most of the distance early, so it reads as settling rather
      // than as a progress bar.
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    // No reset to zero here: the first frame computes it. Setting state in the
    // effect body cascades a render, and the eased value at t≈0 is 0 anyway.
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [to, duration])

  return <>{value}</>
}
