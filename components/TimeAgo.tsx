'use client'
import { useEffect, useState } from 'react'

function format(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/**
 * Renders relative time on the client and re-ticks every minute.
 *
 * Previously the API baked a "5h ago" string into the cached payload, so a page
 * served from a 20-minute-old cache could report a timestamp 20 minutes wrong.
 * Only the absolute ISO value is cached now; the label is derived live.
 */
export default function TimeAgo({ iso }: { iso: string }) {
  // Tick counter only — the label itself is derived during render, so the
  // server-rendered markup and the first client render stay in step.
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const label = format(iso)
  if (!label) return null

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  )
}
