'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import CountrySearch from '@/components/CountrySearch'
import { COUNTRIES, FEATURED_CODES } from '@/lib/countries'
import { useIsCompact } from '@/lib/useMediaQuery'

/**
 * The dashboard's call to action, as a panel that slides out of the left edge.
 *
 * It used to sit centred over the map, which put the product's own copy on top
 * of the part of the map people came to look at — and left nowhere to put
 * anything else. Moving it to the left edge frees the middle for whatever the
 * dashboard grows next, and collapsing it to a labelled rectangle means the map
 * is unobstructed by default rather than merely less obstructed.
 *
 * Both states stay mounted and cross-slide. The hidden one is `visibility:
 * hidden`, which takes its input and links out of the tab order too, so there
 * is never a focusable control behind the one that is showing.
 */
export default function CountryPanel() {
  const [open, setOpen] = useState(false)
  const isCompact = useIsCompact()
  const navHeight = 56

  // Escape closes it. Deliberately no click-outside: the surface behind this
  // panel is a draggable map, and ending a pan over the map would snap it shut.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const slide = 'transform .34s cubic-bezier(.2,.8,.2,1), opacity .26s ease, visibility .34s'

  /** Only as dark as the state needs: a whole-flank wash would waste the map. */
  const scrim = isCompact
    ? open
      ? 'linear-gradient(to bottom, rgba(8,8,12,.94) 0%, rgba(8,8,12,.62) 42%, transparent 64%)'
      : 'linear-gradient(to bottom, rgba(8,8,12,.72) 0%, rgba(8,8,12,.2) 18%, transparent 30%)'
    : open
      ? 'linear-gradient(to right, rgba(8,8,12,.95) 0%, rgba(8,8,12,.8) 24%, rgba(8,8,12,.32) 42%, transparent 58%)'
      : 'linear-gradient(to right, rgba(8,8,12,.8) 0%, rgba(8,8,12,.26) 15%, transparent 27%)'

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 150,
          pointerEvents: 'none', background: scrim,
          transition: 'background .34s ease',
        }}
      />

      <div style={{
        position: 'absolute', zIndex: 200,
        top: `calc(${navHeight}px + var(--safe-top) + ${isCompact ? '14px' : '42px'})`,
        left: isCompact ? '16px' : 'calc(26px + var(--safe-left))',
        width: isCompact ? 'calc(100% - 32px)' : 'min(410px, calc(100vw - 52px))',
      }}>

        {/* ── COLLAPSED: the rectangle that says what is behind it ── */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', display: 'flex', alignItems: 'center', gap: '13px',
            padding: '15px 17px', borderRadius: '14px',
            background: 'var(--panel-bg)', border: '1px solid var(--border-mid)',
            backdropFilter: 'blur(18px)', boxShadow: 'var(--shadow-lg)',
            cursor: 'pointer', textAlign: 'left',
            transform: open ? 'translateX(-118%)' : 'translateX(0)',
            opacity: open ? 0 : 1,
            visibility: open ? 'hidden' : 'visible',
            transition: slide,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-line)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)' }}
        >
          <span style={{
            display: 'grid', placeItems: 'center', flexShrink: 0,
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
          }}>
            <Search size={17} strokeWidth={2.5} color="var(--accent-bright)" />
          </span>

          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '15px',
              color: 'var(--text)', letterSpacing: '-.02em',
            }}>
              Country news
            </span>
            <span className="mono-label" style={{ color: 'var(--text-4)' }}>
              Tap for any of {COUNTRIES.length} countries
            </span>
          </span>

          <ChevronRight
            size={18}
            strokeWidth={2.5}
            color="var(--text-3)"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          />
        </button>

        {/* ── EXPANDED: the full call to action ── */}
        <div
          style={{
            padding: isCompact ? '18px 18px 20px' : '22px 22px 24px',
            borderRadius: '18px',
            background: 'var(--panel-bg)', border: '1px solid var(--border-mid)',
            backdropFilter: 'blur(22px)', boxShadow: 'var(--shadow-lg)',
            // Deliberately not a scroll container. The search renders its
            // results in an absolutely positioned list that hangs below the
            // field, and any overflow setting here clips it to the card — a
            // seven-country list came back showing two.
            transform: open ? 'translateX(0)' : 'translateX(-118%)',
            opacity: open ? 1 : 0,
            visibility: open ? 'visible' : 'hidden',
            transition: slide,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: '12px', marginBottom: '12px',
          }}>
            <span className="mono-label" style={{ color: 'var(--text-4)', paddingTop: '4px' }}>
              Country news
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse country news"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '9px', flexShrink: 0,
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Hide
            </button>
          </div>

          <h1
            className="display-lg"
            style={{ fontSize: 'clamp(23px, 2.4vw, 30px)', marginBottom: '9px', textWrap: 'balance' }}
          >
            Pick a country. Get the full picture.
          </h1>
          <p style={{
            fontSize: '14px', fontWeight: 500, color: 'var(--text-2)',
            letterSpacing: '-.01em', marginBottom: '17px',
          }}>
            Headlines, politics, world, economy and finance — one page per country,
            refreshed every 20 minutes.
          </p>

          {/* Remounted on toggle so opening lands the caret in an empty field. */}
          <CountrySearch
            key={open ? 'open' : 'closed'}
            size="hero"
            autoFocus={open && !isCompact}
          />

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '13px',
            alignItems: 'center',
          }}>
            <span className="mono-label" style={{ color: 'var(--text-4)', marginRight: '2px' }}>
              Jump to
            </span>
            {FEATURED_CODES.map(code => {
              const c = COUNTRIES.find(x => x.code === code)
              if (!c) return null
              return (
                <Link
                  key={code}
                  href={`/country/${code}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 11px', borderRadius: '999px',
                    background: 'var(--surface-1)', border: '1px solid var(--border)',
                    fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)',
                    letterSpacing: '-.01em', textDecoration: 'none',
                    transition: 'border-color .18s ease, color .18s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-line)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-2)'
                  }}
                >
                  <span style={{ fontSize: '13px', lineHeight: 1 }} aria-hidden>{c.flag}</span>
                  {c.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
