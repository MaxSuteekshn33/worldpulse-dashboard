'use client'
import { ExternalLink, X } from 'lucide-react'
import type { ConflictEvent } from '@/lib/conflict'
import { SEVERITY_COLOUR, SEVERITY_LABEL } from '@/lib/conflictLayer'

/**
 * What you get for clicking an event.
 *
 * The caveats are not decoration on this layer. A dot on a conflict map reads
 * as "this happened here, and we know it did", and what GDELT actually
 * provides is "a news article was coded as describing this, somewhere around
 * here". The panel therefore puts the source article one click away and says
 * plainly what the numbers do and do not mean — particularly the article
 * count, which measures how widely something was covered and not how bad it
 * was.
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

/** Actor codes come as shouted CAMEO names; this makes them readable. */
function actorName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 40)
}

export default function ConflictDetail({ event, ageMin, onClose }: {
  event: ConflictEvent
  /** How long ago it was reported, in minutes. Null until the clock ticks. */
  ageMin: number | null
  onClose: () => void
}) {
  const colour = SEVERITY_COLOUR[event.severity]

  let host: string | null = null
  try { host = event.url ? new URL(event.url).hostname.replace(/^www\./, '') : null } catch { host = null }

  return (
    <div className="sea-detail">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-lg" style={{ fontSize: '20px', lineHeight: 1.15 }}>
            {event.kind}
          </div>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginTop: '5px' }}>
            {event.place}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="sea-detail-close">
          <X size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      <div style={{ marginTop: '14px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 650, color: colour, marginBottom: '8px',
        }}>
          {SEVERITY_LABEL[event.severity]}
        </div>

        {(event.actor1 || event.actor2) && (
          <Row
            label="Parties"
            value={[event.actor1, event.actor2].filter(Boolean)
              .map(a => actorName(a as string)).join(' → ')}
          />
        )}
        {/* Said as coverage, never as severity — it is a count of articles. */}
        <Row label="Articles covering it" value={event.articles.toLocaleString()} />
        <Row label="CAMEO code" value={event.code} />
        {/* Explained inline rather than left as a bare number, because a
            negative score next to a conflict reads as a casualty figure. */}
        <Row
          label="Goldstein score"
          value={`${event.goldstein.toFixed(1)} of −10`}
        />
        {ageMin !== null && (
          <Row
            label="Reported"
            value={ageMin < 1 ? 'moments ago'
              : ageMin < 60 ? `${ageMin} min ago`
              : `${Math.round(ageMin / 60)} h ago`}
          />
        )}

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              marginTop: '12px', padding: '8px 12px', borderRadius: '9px',
              border: '1px solid var(--border-mid)', color: 'var(--text-2)',
              fontSize: '12.5px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} strokeWidth={2} aria-hidden />
            Read the source{host ? ` · ${host}` : ''}
          </a>
        )}

        <div className="mono-label" style={{
          color: 'var(--text-4)', marginTop: '12px',
          borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
        }}>
          A machine-coded news report, not a verified incident, and not a
          casualty count — GDELT publishes none. The article count is how
          widely it was covered, which follows where the press is as much as
          where the violence is. The location is geocoded from the text and
          may be only as precise as a province.
        </div>
      </div>
    </div>
  )
}
