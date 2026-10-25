'use client'
import { X } from 'lucide-react'
import type { Aircraft } from '@/lib/flights'

/**
 * What you clicked on the flights layer.
 *
 * The shell and row helpers are the sea panel's, copied rather than shared:
 * they are a dozen lines of presentation, and exporting them from a file
 * called `SeaDetail` so the sky could import them would be the wrong kind of
 * reuse. If a third detail panel appears they belong in a `Detail` of their
 * own.
 */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '5px 0' }}>
      <span className="mono-label" style={{ color: 'var(--text-4)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

function Shell({ title, sub, onClose, children }: {
  title: string; sub: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="sea-detail">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-lg" style={{ fontSize: '20px', lineHeight: 1.15 }}>{title}</div>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginTop: '5px' }}>{sub}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="sea-detail-close">
          <X size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      <div style={{ marginTop: '14px' }}>{children}</div>
    </div>
  )
}

const POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

export function AircraftDetail({ aircraft, nearest, onClose }: {
  aircraft: Aircraft
  /** The country it is closest to, and how far in nautical miles. */
  nearest: { name: string; miles: number } | null
  onClose: () => void
}) {
  const a = aircraft

  return (
    <Shell
      // Callsign is what anyone reading about a flight recognises, but plenty
      // of aircraft send none — the hex is the only identity always present,
      // so it is the fallback rather than a blank heading.
      title={a.callsign ?? a.hex.toUpperCase()}
      sub={[
        a.military ? 'Military' : null,
        a.type,
        a.registration,
        `ICAO ${a.hex.toUpperCase()}`,
      ].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <Row
        label="Altitude"
        value={a.onGround
          ? 'on the ground'
          : a.altitude !== null ? `${a.altitude.toLocaleString()} ft` : 'not reported'}
      />
      <Row label="Speed" value={a.speed > 0 ? `${Math.round(a.speed)} knots` : 'not reported'} />
      <Row
        label="Track"
        value={a.track >= 0
          ? `${Math.round(a.track)}° ${POINTS[Math.round(a.track / 22.5) % 16]}`
          : 'not reported'}
      />
      <Row label="Position" value={`${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`} />
      {/* 7500 hijack, 7600 radio failure, 7700 general emergency. Worth
          surfacing on a dashboard whose subject is escalation. */}
      {a.squawk && (
        <Row
          label="Squawk"
          value={['7500', '7600', '7700'].includes(a.squawk)
            ? `${a.squawk} — emergency`
            : a.squawk}
        />
      )}
      {nearest && (
        <Row label="Nearest country" value={`${nearest.name} · ${Math.round(nearest.miles)} nm`} />
      )}
      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        {/* Said once, here, because it is the single most likely thing to be
            misread about this layer: ADS-B is a transponder reporting its own
            position, not a flight booking. There is no schedule in it. */}
        Live transponder position — ADS-B carries no departure or arrival
        times. The airframe is carried forward on its own reported track
        between fetches.
      </div>
    </Shell>
  )
}
