'use client'
import { CIVIL, MILITARY } from '@/lib/flightLayer'

/**
 * What everything on the flights layer means.
 *
 * Two marks and a caveat. The caveat is the part that earns its place: past
 * the provider's 250 mile radius cap the layer is showing military traffic
 * only, and a legend that said "aircraft" at every zoom would be quietly
 * lying about an empty-looking sky over the Pacific.
 */
function Plane({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      {/* The drawn airframe is a canvas path; this is the same silhouette as
          an inline SVG so the key matches the map rather than approximating
          it with a triangle. */}
      <svg width="13" height="13" viewBox="-8 -8 16 16" aria-hidden>
        <path
          fill={color}
          d="M0 -7 L1.2 -0.9 L7 2.3 L7 3.6 L1.2 1.9 L1 4.9 L3.2 6.6 L3.2 7.4 L0 6 L-3.2 7.4 L-3.2 6.6 L-1 4.9 L-1.2 1.9 L-7 3.6 L-7 2.3 L-1.2 -0.9 Z"
        />
      </svg>
      <span className="mono-label" style={{ color: 'var(--text-3)' }}>{label}</span>
    </span>
  )
}

/**
 * The "military only at this zoom" caveat deliberately lives on the map's own
 * corner note rather than here: that state changes with every zoom, and
 * threading it up into the dashboard's stats strip would re-render the strip
 * on each one to say something the map can say in place.
 */
export default function FlightLegend({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? '12px' : '18px',
      flexWrap: 'wrap',
    }}>
      <Plane color={MILITARY} label="Military" />
      <Plane color={CIVIL} label="Civil" />

      {!compact && (
        <>
          <span style={{ width: '1px', height: '14px', background: 'var(--border-mid)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              width: '20px', height: '1px', background: CIVIL, opacity: 0.34,
              display: 'inline-block',
            }} />
            <span className="mono-label" style={{ color: 'var(--text-3)' }}>Recent track</span>
          </span>
        </>
      )}

    </div>
  )
}
