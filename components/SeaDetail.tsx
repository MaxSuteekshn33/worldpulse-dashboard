'use client'
import { X } from 'lucide-react'
import type { Chokepoint } from '@/lib/chokepoints'
import type { ChokepointReading } from '@/lib/shipping'
import { changeRatio } from '@/lib/shippingLayer'
import type { Vessel } from '@/lib/vessels'

/**
 * What you get for clicking something at sea.
 *
 * The layer was readable only as a picture before this: lines, diamonds and
 * arrowheads, none of which answered the question the map exists to answer —
 * is this chokepoint working, and what is that ship. Both answers were in the
 * data already; nothing surfaced them.
 */

/** Thirty days of transits, drawn small enough to sit under a number. */
function Spark({ series, color }: { series: number[]; color: string }) {
  if (series.length < 2) return null
  const w = 240
  const h = 44
  const max = Math.max(...series, 1)
  const step = w / (series.length - 1)
  const line = series.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden style={{ display: 'block' }}>
      <polyline
        points={`0,${h} ${line} ${w},${h}`}
        fill={color} fillOpacity="0.12" stroke="none"
      />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

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

export function ChokepointDetail({ point, reading, nearby, onClose }: {
  point: Chokepoint
  reading: ChokepointReading | null
  /** Ships currently inside this chokepoint's watch box. */
  nearby: number
  onClose: () => void
}) {
  const change = reading ? changeRatio(reading) : null
  const pct = change === null ? null : Math.round(change * 100)
  const color = pct === null ? '#6B7389'
    : pct <= -45 ? '#C7553F' : pct <= -15 ? '#D18A4E' : pct >= 15 ? '#4EA3C2' : '#6B7389'

  return (
    <Shell
      title={point.name}
      sub={reading ? `Transits · reading for ${reading.date}` : 'Transit figures unavailable'}
      onClose={onClose}
    >
      {reading ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '2px' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '30px',
              color, letterSpacing: '-.02em', lineHeight: 1,
            }}>
              {Math.round(reading.recent)}
            </span>
            <span className="mono-label" style={{ color: 'var(--text-3)' }}>ships a day</span>
          </div>

          <div className="mono-label" style={{ color, marginBottom: '10px' }}>
            {pct === null ? 'no figure for last year'
              : Math.abs(pct) < 5 ? 'in line with last year'
              : `${Math.abs(pct)}% ${pct < 0 ? 'below' : 'above'} last year`}
          </div>

          <Spark series={reading.series} color={color} />
          <div className="mono-label" style={{ color: 'var(--text-4)', marginTop: '2px' }}>
            Last {reading.series.length} days
          </div>

          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
            <Row label="A year ago" value={reading.lastYear ? `${Math.round(reading.lastYear)} a day` : '—'} />
            <Row label="Tankers" value={reading.tanker} />
            <Row label="Containers" value={reading.container} />
            <Row label="Dry bulk" value={reading.dryBulk} />
            {/* The live half, against the published half: a strait with no
                transits reported and no ships on it now is a different story
                from one with ships queueing. */}
            <Row label="Ships here now" value={nearby} />
          </div>
        </>
      ) : (
        <Row label="Ships here now" value={nearby} />
      )}

      {point.carries.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '9px' }}>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginBottom: '5px' }}>
            Mostly carries
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-3)', lineHeight: 1.5 }}>
            {point.carries.join(' · ')}
          </div>
        </div>
      )}
    </Shell>
  )
}

export function ShipDetail({ vessel, nearest, onClose }: {
  vessel: Vessel
  /** The chokepoint it is closest to, and how far in nautical miles. */
  nearest: { name: string; miles: number } | null
  onClose: () => void
}) {
  const bearing = (c: number) => {
    const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return names[Math.round(c / 22.5) % 16]
  }

  return (
    <Shell
      title={vessel.name}
      sub={[vessel.kind, vessel.length ? `${vessel.length}m` : null, `MMSI ${vessel.mmsi}`]
        .filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <Row
        label="Speed"
        value={vessel.speed >= 0 ? `${vessel.speed} knots` : 'not reported'}
      />
      <Row
        label="Heading"
        value={vessel.course >= 0 ? `${vessel.course}° ${bearing(vessel.course)}` : 'not reported'}
      />
      <Row label="Position" value={`${vessel.lat.toFixed(3)}, ${vessel.lon.toFixed(3)}`} />
      {vessel.destination && <Row label="Bound for" value={vessel.destination} />}
      {nearest && (
        <Row label="Nearest chokepoint" value={`${nearest.name} · ${Math.round(nearest.miles)} nm`} />
      )}
      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        {vessel.speed > 0.5
          ? 'Track shows recent fixes; the hull is carried forward on its own reported course between them.'
          : 'Stopped — holding position at a chokepoint.'}
      </div>
    </Shell>
  )
}
