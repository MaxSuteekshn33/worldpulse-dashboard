'use client'
import { Note, Row, Shell } from '@/components/Detail'
import { ExternalLink } from 'lucide-react'
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
    <Shell title={event.kind} sub={event.place} onClose={onClose}>
      <>
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

        <Note>
          A machine-coded news report, not a verified incident, and not a
          casualty count — GDELT publishes none. The article count is how
          widely it was covered, which follows where the press is as much as
          where the violence is. The location is geocoded from the text and
          may be only as precise as a province.
        </Note>
      </>
    </Shell>
  )
}
