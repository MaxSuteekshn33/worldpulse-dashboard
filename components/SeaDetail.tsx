'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { ShipPhoto } from '@/lib/shipPhotos'
import type { Chokepoint } from '@/lib/chokepoints'
import type { ChokepointReading } from '@/lib/shipping'
import { changeRatio } from '@/lib/shippingLayer'
import type { Vessel } from '@/lib/vessels'
import { type LaneRoute, type LaneTraffic, ON_LANE_NM, describeEnd } from '@/lib/laneInfo'

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

export function LaneDetail({ route, traffic, onClose }: {
  route: LaneRoute
  /** Which of the ships currently tracked are on this lane. */
  traffic: LaneTraffic | null
  onClose: () => void
}) {
  const tierName = route.tier === 'major' ? 'Major route'
    : route.tier === 'middle' ? 'Secondary route' : 'Minor route'

  return (
    <Shell
      title={tierName}
      sub={`${route.miles.toLocaleString()} nautical miles`}
      onClose={onClose}
    >
      <Row label="From" value={describeEnd(route.from)} />
      <Row label="To" value={describeEnd(route.to)} />
      {/* Roughly 14 knots loaded, which is what most of this tonnage makes
          once fuel is being paid for. An estimate, and said to be one. */}
      <Row label="Steaming time" value={`≈ ${Math.round(route.miles / 14 / 24)} days at 14 knots`} />

      {traffic && traffic.count > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '9px' }}>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginBottom: '6px' }}>
            Tracked ships on this lane
          </div>
          <Row label={`Within ${ON_LANE_NM} nm`} value={`${traffic.count}`} />
          <Row label="Making way" value={`${traffic.moving}`} />
          {traffic.medianSpeed !== null && (
            <Row label="Median speed" value={`${traffic.medianSpeed} knots`} />
          )}
          {traffic.notable.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {traffic.notable.map(v => (
                <div key={v.name} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px',
                  padding: '3px 0', fontSize: '12.5px', color: 'var(--text-2)',
                }}>
                  <span style={{ fontWeight: 600 }}>
                    {v.name}
                    {v.kind ? <span style={{ opacity: 0.5 }}>{` ${v.kind}`}</span> : null}
                  </span>
                  <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {v.length ? `${v.length}m · ` : ''}{v.speed} kn
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {route.via.length > 0 ? (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '9px' }}>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginBottom: '6px' }}>
            Threads
          </div>
          {route.via.map(name => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0',
              fontSize: '13px', fontWeight: 600, color: 'var(--text)',
            }}>
              <span style={{
                width: '7px', height: '7px', background: 'var(--seg-world)',
                transform: 'rotate(45deg)', borderRadius: '2px', flex: 'none',
              }} />
              {name}
            </div>
          ))}
        </div>
      ) : (
        <div className="mono-label" style={{
          color: 'var(--text-4)', marginTop: '10px',
          borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
        }}>
          Open-water leg — passes none of the 28 chokepoints.
        </div>
      )}

      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        A route ships follow, not a ship&apos;s track. Described from the line
        itself — the dataset names none of them.
      </div>
    </Shell>
  )
}


/**
 * A photograph of the ship, when one exists and can be shown honestly.
 *
 * Fetched when the panel opens rather than with the fleet: several hundred
 * ships are on screen and almost none of them are clicked, so looking them
 * all up would be hundreds of requests to Wikimedia for pictures nobody opens.
 *
 * The caption is the important part. Commons can prove a photograph is this
 * hull when the file quotes its IMO number or MMSI, and most of the time it
 * cannot — it only knows a ship of this name. Those are different claims and
 * the panel makes the difference plain, because a tanker crossing the Channel
 * and a nineteenth-century frigate of the same name look nothing alike and
 * the search cannot always tell them apart.
 */
function ShipPhotoPanel({ vessel }: { vessel: Vessel }) {
  // One piece of state carrying which ship it is about, rather than a photo
  // and a flag cleared at the top of the effect. Clearing them there is a
  // synchronous setState inside an effect, which cascades a second render on
  // every open; tagging the result with its MMSI makes a stale answer
  // identifiable without having to blank anything first.
  const [result, setResult] = useState<{ mmsi: number; photo: ShipPhoto | null } | null>(null)

  useEffect(() => {
    let cancelled = false

    const query = new URLSearchParams({ mmsi: String(vessel.mmsi), name: vessel.name })
    if (vessel.imo) query.set('imo', String(vessel.imo))

    fetch(`/api/ship-photo?${query}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setResult({ mmsi: vessel.mmsi, photo: d.photo ?? null }) })
      .catch(() => { if (!cancelled) setResult({ mmsi: vessel.mmsi, photo: null }) })

    return () => { cancelled = true }
  }, [vessel.mmsi, vessel.name, vessel.imo])

  const forThisShip = result?.mmsi === vessel.mmsi
  const photo = forThisShip ? result.photo : null
  const done = forThisShip

  // Nothing at all while looking, and nothing afterwards if there is nothing:
  // an empty frame saying "no photograph" on four ships in five would be the
  // loudest thing in the panel.
  if (!photo) {
    return done ? null : (
      <div className="mono-label" style={{ color: 'var(--text-4)', padding: '2px 0 8px' }}>
        looking for a photograph…
      </div>
    )
  }

  return (
    <div style={{ margin: '0 0 12px' }}>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '3 / 2',
        borderRadius: '10px', overflow: 'hidden',
        border: '1px solid var(--border)', background: 'rgba(255,255,255,.03)',
      }}>
        <Image
          src={photo.url}
          alt={`${vessel.name} — photograph from Wikimedia Commons`}
          fill
          sizes="320px"
          style={{ objectFit: 'cover' }}
          unoptimized
        />
      </div>
      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '6px', lineHeight: 1.5,
      }}>
        {photo.match === 'verified'
          ? 'Confirmed by IMO/MMSI on the file'
          : 'Name match — may be another vessel of the same name'}
        <br />
        {/* Attribution and licence are shown because the licences require it,
            not as a nicety; the link is the file page carrying the terms. */}
        <a
          href={photo.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-3)', textDecoration: 'underline' }}
        >
          Wikimedia Commons
        </a>
        {photo.artist ? ` · ${photo.artist}` : ''}
        {photo.licence ? ` · ${photo.licence}` : ''}
      </div>
    </div>
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

  // How long ago this fix was heard. The fleet spans a quarter of an hour, so
  // "where it is" means different things for different ships on the map, and
  // the panel should not present a twelve-minute-old position as current.
  //
  // Kept in state and ticked rather than read during render: the clock is not
  // a pure function, so reading it while rendering gives React a component
  // whose output changes without its props doing so. The first reading is
  // deferred out of the effect body for the same reason the photo's is.
  const [ageMin, setAgeMin] = useState<number | null>(null)

  useEffect(() => {
    const seen = vessel.seenAt
    if (!seen) return
    const tick = () => setAgeMin(Math.round((Date.now() - seen) / 60000))
    const soon = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 30_000)
    return () => { window.clearTimeout(soon); window.clearInterval(timer) }
  }, [vessel.seenAt])

  const size = [
    vessel.length ? `${vessel.length}m` : null,
    vessel.beam ? `${vessel.beam}m beam` : null,
  ].filter(Boolean).join(' × ')

  return (
    <Shell
      title={vessel.name}
      sub={[vessel.kind, size || null, `MMSI ${vessel.mmsi}`].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <ShipPhotoPanel vessel={vessel} />

      {vessel.navStatus && <Row label="Status" value={vessel.navStatus} />}
      <Row label="Speed" value={vessel.speed >= 0 ? `${vessel.speed} knots` : 'not reported'} />
      <Row
        label="Heading"
        value={vessel.course >= 0 ? `${vessel.course}° ${bearing(vessel.course)}` : 'not reported'}
      />
      <Row label="Position" value={`${vessel.lat.toFixed(3)}, ${vessel.lon.toFixed(3)}`} />
      {vessel.destination && <Row label="Bound for" value={vessel.destination} />}
      {vessel.eta && <Row label="Reported ETA" value={vessel.eta} />}
      {vessel.draught && <Row label="Draught" value={`${vessel.draught} m`} />}
      {vessel.imo && <Row label="IMO" value={String(vessel.imo)} />}
      {vessel.callSign && <Row label="Call sign" value={vessel.callSign} />}
      {nearest && (
        <Row label="Nearest chokepoint" value={`${nearest.name} · ${Math.round(nearest.miles)} nm`} />
      )}
      {ageMin !== null && (
        <Row label="Last heard" value={ageMin < 1 ? 'moments ago' : `${ageMin} min ago`} />
      )}
      <div className="mono-label" style={{
        color: 'var(--text-4)', marginTop: '10px',
        borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
      }}>
        {vessel.speed > 0.5
          ? 'Track shows recent fixes; the hull is carried forward on its own reported course between them.'
          : 'Stopped — holding position at a chokepoint.'}
        {/* Said here because these fields are typed by crews at sea, not
            generated: destination and ETA are free text and are routinely
            stale, wrong, or left over from the last voyage. */}
        {(vessel.destination || vessel.eta) &&
          ' Destination and ETA are entered by the crew and are often out of date.'}
      </div>
    </Shell>
  )
}
