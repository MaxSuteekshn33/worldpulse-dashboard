'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import TimeAgo from './TimeAgo'
import { accessFor, ACCESS_LABEL, type Access } from '@/lib/sources'
import { useIsCompact } from '@/lib/useMediaQuery'
import type { Article } from '@/lib/news'

const ACCESS_COLOR: Record<Access, { fg: string; bg: string; line: string }> = {
  free: { fg: '#7FD4A6', bg: 'rgba(79,169,124,.14)', line: 'rgba(79,169,124,.34)' },
  metered: { fg: '#E0A868', bg: 'rgba(209,138,78,.14)', line: 'rgba(209,138,78,.32)' },
  subscription: { fg: '#9AA3B8', bg: 'rgba(255,255,255,.05)', line: 'rgba(255,255,255,.12)' },
}

function AccessBadge({ access }: { access: Access }) {
  const c = ACCESS_COLOR[access]
  return (
    <span
      className="mono-label"
      style={{
        padding: '3px 7px', borderRadius: '5px', whiteSpace: 'nowrap',
        color: c.fg, background: c.bg, border: `1px solid ${c.line}`,
      }}
    >
      {ACCESS_LABEL[access]}
    </span>
  )
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="mono-label"
      style={{
        padding: '4px 9px', borderRadius: '999px',
        color: color ?? 'var(--text-3)',
        background: color ? `${color}1F` : 'var(--surface-1)',
        border: `1px solid ${color ? `${color}40` : 'var(--border)'}`,
      }}
    >
      {label}
    </span>
  )
}

interface Props {
  article: Article
  color: string
  segmentLabel: string
  countryName: string
  position: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

/**
 * The story popup: who filed it, what it says, who else covered it, and a way
 * through to the original.
 *
 * It opens on a card click rather than navigating away, so a reader can work
 * down a section without losing their place — and so "Also reported by" has
 * somewhere to live. That list is the point of the popup: a paywall on the
 * outlet you happened to land on is not a paywall on the story, and the
 * clustering in lib/news.ts already knows who else ran it.
 */
export default function StoryModal({
  article, color, segmentLabel, countryName, position, onClose, onPrev, onNext,
}: Props) {
  const isCompact = useIsCompact()
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [drag, setDrag] = useState(0)
  const dragFrom = useRef<number | null>(null)

  const access = accessFor(article.source)
  const related = article.alsoReportedBy ?? []
  // Only worth pointing somewhere else when the outlet you landed on asks for
  // money and one of the newsrooms that ran the same story does not.
  const freeRoute = access && access !== 'free'
    ? related.find(r => accessFor(r.source) === 'free')
    : undefined

  useEffect(() => {
    closeRef.current?.focus()
    document.body.classList.add('lock-scroll')
    return () => { document.body.classList.remove('lock-scroll') }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft' && onPrev) { onPrev(); return }
      if (e.key === 'ArrowRight' && onNext) { onNext(); return }
      if (e.key !== 'Tab') return

      // Focus trap. Without it, tabbing walks out of the dialog and into the
      // page behind it, which is still there and still full of links.
      const node = cardRef.current
      if (!node) return
      const items = Array.from(
        node.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter(el => el.offsetParent !== null)
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="story-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(4,4,8,.72)', backdropFilter: 'blur(6px)',
        display: 'flex', padding: isCompact ? '0' : '24px',
        alignItems: isCompact ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-headline"
        onClick={e => e.stopPropagation()}
        className={isCompact ? 'story-sheet' : 'story-card'}
        // On a phone this is a bottom sheet, so it answers the gesture people
        // already use on one: drag it down to dismiss.
        onTouchStart={isCompact ? e => { dragFrom.current = e.touches[0].clientY } : undefined}
        onTouchMove={isCompact ? e => {
          if (dragFrom.current === null) return
          const dy = e.touches[0].clientY - dragFrom.current
          // Only when the content is already at the top, so the gesture never
          // fights the scroll.
          if (dy > 0 && (cardRef.current?.scrollTop ?? 0) <= 0) setDrag(dy)
        } : undefined}
        onTouchEnd={isCompact ? () => {
          if (drag > 90) onClose()
          dragFrom.current = null
          setDrag(0)
        } : undefined}
        style={{
          width: isCompact ? '100%' : 'min(560px, 100%)',
          maxHeight: isCompact ? '88dvh' : 'min(86dvh, 760px)',
          overflowY: 'auto',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-mid)',
          borderRadius: isCompact ? '20px 20px 0 0' : '18px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(24px)',
          padding: isCompact
            ? `10px 18px calc(20px + var(--safe-bottom))`
            : '20px 22px 22px',
          transform: drag > 0 ? `translateY(${drag}px)` : undefined,
          transition: drag > 0 ? 'none' : 'transform .22s ease',
        }}
      >
        {isCompact && (
          <div aria-hidden style={{
            width: '38px', height: '4px', borderRadius: '2px',
            background: 'var(--border-strong)', margin: '0 auto 14px',
          }} />
        )}

        {/* ── SOURCE ROW ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          marginBottom: '12px', flexWrap: 'wrap',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
          <span className="mono-label" style={{ color: 'var(--text-2)' }}>
            {article.source}
          </span>
          <span style={{ color: 'var(--text-4)' }}>·</span>
          <span className="mono-meta" style={{ color: 'var(--text-3)' }}>
            <TimeAgo iso={article.publishedAt} />
          </span>
          {access && <AccessBadge access={access} />}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto', display: 'grid', placeItems: 'center',
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <h2 id="story-headline" className="heading-md" style={{ marginBottom: '11px' }}>
          {article.headline}
        </h2>

        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <Chip label={segmentLabel} color={color} />
          <Chip label={countryName} />
        </div>

        {article.description && (
          <p style={{
            fontSize: '14.5px', fontWeight: 450, lineHeight: 1.62,
            color: 'var(--text-2)', marginBottom: '16px',
          }}>
            {article.description}
          </p>
        )}

        {/* ── A WAY IN THAT DOESN'T CHARGE ── */}
        {freeRoute && (
          <a
            href={freeRoute.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '11px 13px', borderRadius: '11px', marginBottom: '14px',
              background: 'rgba(79,169,124,.10)',
              border: '1px solid rgba(79,169,124,.28)',
              textDecoration: 'none',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span className="mono-label" style={{ color: '#7FD4A6' }}>
                Free to read
              </span>
              <span style={{
                fontSize: '13.5px', fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                The same story on {freeRoute.source}
              </span>
            </span>
            <ArrowRight
              size={15}
              strokeWidth={2.5}
              color="#7FD4A6"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            />
          </a>
        )}

        {/* ── ALSO REPORTED BY ── */}
        {related.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <span className="mono-label" style={{ color: 'var(--text-4)' }}>
              Also reported by
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {related.map(r => {
                const ra = accessFor(r.source)
                return (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '9px 11px', borderRadius: '9px',
                      background: 'var(--surface-1)', border: '1px solid var(--border)',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{
                      fontSize: '13px', fontWeight: 600, color: 'var(--text-2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.source}
                    </span>
                    {ra && <AccessBadge access={ra} />}
                    <span className="mono-meta" style={{ color: 'var(--text-4)', marginLeft: 'auto', flexShrink: 0 }}>
                      <TimeAgo iso={r.publishedAt} />
                    </span>
                    <ExternalLink size={12} strokeWidth={2.5} color="var(--text-4)" style={{ flexShrink: 0 }} />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          paddingTop: '14px', borderTop: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Previous story"
            style={navStyle(!onPrev)}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next story"
            style={navStyle(!onNext)}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
          <span className="mono-meta" style={{ color: 'var(--text-4)' }}>{position}</span>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '10px 15px', borderRadius: '10px',
              background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
              fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-bright)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Read full story
            <ExternalLink size={13} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </div>
  )
}

function navStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'grid', placeItems: 'center',
    width: '32px', height: '32px', borderRadius: '9px',
    background: 'var(--surface-1)', border: '1px solid var(--border)',
    color: disabled ? 'var(--text-4)' : 'var(--text-2)',
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
}
