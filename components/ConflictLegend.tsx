'use client'
import { SEVERITY_COLOUR } from '@/lib/conflictLayer'

/**
 * What the rings mean.
 *
 * Three colours and the one thing a reader will otherwise get wrong: the
 * size of a ring is how widely the event was reported, not how severe it
 * was. That belongs in the key rather than only in the panel, because the
 * sizes are visible before anything is clicked.
 */
function Ring({ colour, label }: { colour: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      <svg width="13" height="13" viewBox="-8 -8 16 16" aria-hidden>
        <circle r="5.2" fill="none" stroke={colour} strokeWidth="1.8" />
        <circle r="1.4" fill={colour} />
      </svg>
      <span className="mono-label" style={{ color: 'var(--text-3)' }}>{label}</span>
    </span>
  )
}

export default function ConflictLegend({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? '12px' : '18px',
      flexWrap: 'wrap',
    }}>
      <Ring colour={SEVERITY_COLOUR.mass} label="Mass violence" />
      <Ring colour={SEVERITY_COLOUR.armed} label="Armed violence" />
      <Ring colour={SEVERITY_COLOUR.unrest} label="Protest, arrests" />

      {!compact && (
        <>
          <span style={{ width: '1px', height: '14px', background: 'var(--border-mid)' }} />
          <span className="mono-label" style={{ color: 'var(--text-4)' }}>
            Ring size = how widely reported · GDELT
          </span>
        </>
      )}
    </div>
  )
}
