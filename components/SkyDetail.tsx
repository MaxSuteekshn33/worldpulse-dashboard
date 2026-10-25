'use client'
import { X } from 'lucide-react'
import type { Aircraft } from '@/lib/flights'
import { type AirHub, type Corridor, arcMiles, corridorName } from '@/lib/airways'
import { HUB_RADIUS_NM, type HubReading } from '@/lib/airspace'

/**
 * What you clicked on the flights layer.
 *
 * Three things are clickable here and each answers a different question: an
 * aircraft is "what is that", a hub is "is this airport moving traffic", and
 * a corridor is "what route is that and how far".
 *
 * The shell and row helpers are the sea panel's, copied rather than shared:
 * they are a dozen lines of presentation, and exporting them from a file
 * called `SeaDetail` so the sky could import them would be the wrong kind of
 * reuse. The three panels below do share them, because they are in the same
 * file and about the same layer.
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

/** How a hub's verdict reads in a sentence, and the colour that carries it. */
const VERDICT: Record<HubReading['verdict'], { say: string; color: string }> = {
  flowing: { say: 'Arrivals and departures in balance', color: '#4EA3C2' },
  'arrivals-held': { say: 'Arrivals stacking up, little leaving', color: '#C7553F' },
  'departures-held': { say: 'Departures running, few arrivals', color: '#D18A4E' },
  quiet: { say: 'Too little movement to read', color: 'var(--text-4)' },
  unknown: { say: 'Not read yet', color: 'var(--text-4)' },
}

/**
 * An airport's airspace, as the aircraft currently on screen describe it.
 *
 * The honest cases come first on purpose. Most of the time the map is not
 * zoomed onto this hub, and the panel has to say that plainly rather than
 * showing a row of zeroes that look like a dead airport — the figures here
 * are counted from the sky the viewport fetched, not from a query of their
 * own, because the feed allows five hundred requests a day in total and a
 * sweep of every hub would spend forty times that.
 */
export function HubDetail({ hub, reading, onClose }: {
  hub: AirHub
  reading: HubReading | null
  onClose: () => void
}) {
  const r = reading
  const cover = r?.cover ?? 'none'
  const shell = (children: React.ReactNode) => (
    <Shell
      title={`${hub.id} — ${hub.name}`}
      sub={`${hub.city} · ${hub.country} · ${hub.role}`}
      onClose={onClose}
    >
      {children}
    </Shell>
  )

  if (cover !== 'full') {
    return shell(
      <>
        <div style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-3)' }}>
          {cover === 'none'
            ? `Zoom the map onto ${hub.city} to read this airspace.`
            : `Only part of this airspace is on screen. Pan to centre ${hub.city} for a full count.`}
        </div>
        <Row label="Position" value={`${hub.lat.toFixed(3)}, ${hub.lon.toFixed(3)}`} />
        <div className="mono-label" style={{
          color: 'var(--text-4)', marginTop: '10px',
          borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
        }}>
          Hub figures are counted from the aircraft already on screen, within
          {` ${HUB_RADIUS_NM} nm`} of the field. Nothing is fetched for them, so
          they only exist where you are looking.
        </div>
      </>,
    )
  }

  const v = VERDICT[r!.verdict]

  return shell(
    <>
      <div style={{
        fontSize: '14px', fontWeight: 650, lineHeight: 1.4,
        color: v.color, marginBottom: '8px',
      }}>
        {v.say}
      </div>
      <Row label={`Aircraft within ${HUB_RADIUS_NM} nm`} value={r!.total.toLocaleString()} />
      <Row label="Airborne" value={r!.airborne.toLocaleString()} />
      <Row label="On the ground" value={r!.onGround.toLocaleString()} />
      <Row label="Inbound" value={r!.inbound.toLocaleString()} />
      <Row label="Outbound" value={r!.outbound.toLocaleString()} />
      {/* Separated out because it is the figure most likely to be misread as
          traffic for the airport: at cruise over the top, it is traffic for
          somewhere else entirely. */}
      <Row label="Crossing overhead" value={r!.overflying.toLocaleString()} />
      {r!.military > 0 && <Row label="Military" value={r!.military.toLocaleString()} />}
      {r!.types.length > 0 && (
        <Row
          label="Commonest airframes"
          value={r!.types.map(t => `${t.code} ×${t.count}`).join(' · ')}
        />
      )}

      {r!.arrivals.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginBottom: '6px' }}>
            Closest inbound
          </div>
          {r!.arrivals.map(a => (
            <div key={a.hex} style={{
              display: 'flex', justifyContent: 'space-between', gap: '12px',
              padding: '3px 0', fontSize: '12.5px', color: 'var(--text-2)',
            }}>
              <span style={{ fontWeight: 600 }}>
                {a.callsign ?? a.hex.toUpperCase()}
                {a.type ? <span style={{ opacity: 0.5 }}>{` ${a.type}`}</span> : null}
              </span>
              <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {Math.round(a.distance)} nm
                {a.altitude !== null ? ` · ${a.altitude.toLocaleString()} ft` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        A snapshot, not a trend. Inbound and outbound are aircraft below
        24,000 ft pointed at the field or away from it; there is no schedule in
        ADS-B to check them against.
      </div>
    </>,
  )
}

/**
 * A corridor between two hubs.
 *
 * The distance is the great circle, which is also what is drawn — and worth
 * saying plainly, because it is not the distance anyone's route actually
 * flies. Filed routes bend around weather, around closed airspace and around
 * whatever the day's winds make cheapest, and none of that is in a public
 * feed.
 */
export function CorridorDetail({ corridor, hubs, onClose }: {
  corridor: Corridor
  hubs: { a: AirHub | null; b: AirHub | null }
  onClose: () => void
}) {
  const { a, b } = hubs
  const miles = a && b ? arcMiles(a.lat, a.lon, b.lat, b.lon) : null
  const tier = corridor.tier === 'major'
    ? 'Trunk route'
    : corridor.tier === 'middle' ? 'Main route' : 'Secondary route'

  return (
    <Shell
      title={corridorName(corridor)}
      sub={`${corridor.a} — ${corridor.b} · ${tier}`}
      onClose={onClose}
    >
      {miles !== null && (
        <Row
          label="Great-circle distance"
          value={`${Math.round(miles).toLocaleString()} nm`}
        />
      )}
      {a && <Row label={a.id} value={`${a.name} · ${a.city}, ${a.country}`} />}
      {b && <Row label={b.id} value={`${b.name} · ${b.city}, ${b.country}`} />}
      {miles !== null && (
        <Row
          label="Typical block time"
          // Roughly 460 knots over the ground for a long-haul jet, plus the
          // half hour that taxi and climb cost at each end. An estimate, and
          // labelled as one.
          value={`≈ ${Math.round((miles / 460 + 1) * 10) / 10} hours`}
        />
      )}
      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        The arc drawn is the great circle between the two airports — the
        shortest path over the sphere, which is why it bows north on a flat
        map. Filed routes bend around weather, winds and closed airspace, and
        are not public.
      </div>
    </Shell>
  )
}
