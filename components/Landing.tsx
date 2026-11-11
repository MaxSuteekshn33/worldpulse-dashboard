'use client'
// Cross-fades when the destination is prerendered; a plain navigation
// otherwise, so on-demand pages still show their skeleton at once.
import Link from '@/components/FastLink'
import dynamic from 'next/dynamic'
import { ArrowRight } from 'lucide-react'
import CountrySearch from '@/components/CountrySearch'
import CountUp from '@/components/CountUp'
import TimeAgo from '@/components/TimeAgo'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'
import { SOURCE_COUNT } from '@/lib/sources'
import { useIsCompact } from '@/lib/useMediaQuery'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })

/** One country's current top story, fetched by the server page above. */
export interface Highlight {
  code: string
  flag: string
  name: string
  headline: string
  source: string
  publishedAt: string
}

export default function Landing({ highlights }: { highlights: Highlight[] }) {
  const isCompact = useIsCompact()
  const shown = highlights.slice(0, isCompact ? 1 : 3)
  return (
    <main style={{
      minHeight: '100dvh', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Backdrop map — near full strength so the world and its pulses read */}
      <div style={{ position: 'absolute', inset: 0, opacity: .95 }}>
        <MiniMap />
      </div>
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: .18, pointerEvents: 'none' }} />
      {/* Vignette: just enough to seat the copy, not enough to erase the map */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 54% 44% at 50% 46%, rgba(8,8,12,.68) 0%, rgba(8,8,12,.40) 46%, rgba(8,8,12,.14) 72%, transparent 90%)',
      }} />
      {/* Edge falloff so bubbles never collide with the nav or stats strip */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(8,8,12,.92) 0%, transparent 16%, transparent 80%, rgba(8,8,12,.95) 100%)',
      }} />

      {/* ── NAV ── */}
      <header style={{
        position: 'relative', zIndex: 10,
        height: `calc(58px + var(--safe-top))`,
        paddingTop: 'var(--safe-top)',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,12,.6)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        // Matches the country pages and the dashboard; see the note there.
        padding: `var(--safe-top) clamp(16px, 3vw, 28px) 0`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <span style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 900,
            fontSize: isCompact ? '17px' : '19px',
            color: 'var(--text)', letterSpacing: '-.03em',
          }}>
            WORLD<span style={{ color: 'var(--accent)' }}>PULSE</span>
          </span>
          {!isCompact && (
            <span className="mono-label" style={{
              color: 'var(--text-4)',
              borderLeft: '1px solid var(--border-mid)', paddingLeft: '13px',
            }}>
              Live News Intelligence
            </span>
          )}
        </div>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '9px 15px', borderRadius: '9px',
            background: 'var(--surface-2)', border: '1px solid var(--border-mid)',
            fontSize: '14px', fontWeight: 600, color: 'var(--text)',
            textDecoration: 'none', letterSpacing: '-.01em',
          }}
        >
          Open map <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </header>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', zIndex: 10, flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        /**
         * The rhythm, rather than one gap for everything.
         *
         * Every child here used to sit 20px from the next — the eyebrow, the
         * headline, the sentence, the search and the link, all equally far
         * apart. Equal spacing is what made this read flat: nothing was
         * grouped with anything, so the eye had no order to follow. The
         * spacing now says what belongs together — the pills are part of the
         * headline and sit close to it, the sentence explains the headline,
         * and the search is the thing you came to do, so it gets the widest
         * gap of all.
         *
         * In `vh` with a `clamp` because this page is `minHeight: 100dvh`
         * with `overflow: hidden`: anything that does not fit is not scrolled
         * to, it is cut off and unreachable. Spacing that grows with the
         * viewport can never push the search off a short screen.
         */
        padding: `clamp(30px, 6vh, 72px) 20px clamp(26px, 5vh, 48px)`,
        gap: 0,
      }}>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {SEGMENTS.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 11px', borderRadius: '999px',
              background: s.tint, border: `1px solid ${s.color}33`,
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: s.color, display: 'inline-block',
              }} />
              <span className="mono-label" style={{ color: 'var(--text-2)', fontSize: '10px' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <h1 className="display-xl" style={{ maxWidth: '820px', marginTop: 'clamp(15px, 2.3vh, 26px)' }}>
          The world is happening.
          <br />
          <span style={{ color: 'var(--accent)' }}>Track it live.</span>
        </h1>

        <p style={{
          // A touch larger and looser, and a slightly wider measure: this is
          // the only prose on the page and it was set tighter than the cards.
          fontSize: isCompact ? '15px' : '17px', fontWeight: 450,
          color: 'var(--text-2)', maxWidth: '548px', lineHeight: 1.6,
          marginTop: 'clamp(13px, 1.8vh, 20px)',
        }}>
          Headlines, politics, world affairs, economy and finance —
          one focused page per country, refreshed every 20 minutes.
        </p>

        {/* Primary CTA */}
        <div style={{
          width: isCompact ? '100%' : 'min(520px, 92vw)',
          // The widest gap on the page, because this is the one thing the
          // page is asking you to do.
          marginTop: 'clamp(20px, 3.4vh, 36px)',
        }}>
          <CountrySearch size={isCompact ? 'compact' : 'hero'} placeholder="Search a country to start…" />
        </div>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 600, color: 'var(--text-3)',
            textDecoration: 'none', letterSpacing: '-.01em',
            marginTop: 'clamp(13px, 1.8vh, 18px)',
          }}
        >
          or explore the world map <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      {/* ── LIVE RIGHT NOW ──
          The headline above claims the world is happening; this is the only
          thing on the page that proves it. Real stories, fetched on the server
          and refreshed on the same 20-minute cycle as everything else, each a
          way into the country page behind it. */}
      {shown.length > 0 && (
        <section style={{
          position: 'relative', zIndex: 10,
          borderTop: '1px solid var(--border)',
          background: 'rgba(8,8,12,.72)',
          backdropFilter: 'blur(16px)',
          padding: `11px ${isCompact ? '16px' : '28px'}`,
        }}>
          <div style={{
            maxWidth: '1280px', margin: '0 auto',
            display: 'flex', alignItems: 'center',
            gap: isCompact ? '12px' : '22px',
          }}>
            <span
              className="mono-label"
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                color: 'var(--text-4)', flexShrink: 0,
              }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'var(--seg-finance)',
                boxShadow: '0 0 7px var(--seg-finance)',
              }} />
              Live now
            </span>

            {shown.map(h => (
              <Link
                key={h.code}
                href={`/country/${h.code}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  flex: 1, minWidth: 0, textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '13px', lineHeight: 1, flexShrink: 0 }} aria-hidden>
                  {h.flag}
                </span>
                <span style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--text-2)',
                  letterSpacing: '-.01em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {h.headline}
                </span>
                <span className="mono-meta" style={{ color: 'var(--text-4)', flexShrink: 0 }}>
                  <TimeAgo iso={h.publishedAt} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── STATS STRIP ── */}
      <footer style={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid var(--border)',
        background: 'rgba(8,8,12,.75)',
        backdropFilter: 'blur(16px)',
        padding: `16px ${isCompact ? '16px' : '28px'} calc(16px + var(--safe-bottom))`,
        display: 'flex', alignItems: 'center', gap: isCompact ? '18px' : '36px',
        justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {[
          { v: COUNTRIES.length, l: 'Countries' },
          { v: SOURCE_COUNT, l: 'Newsrooms' },
          { v: SEGMENTS.length, l: 'Categories' },
          { v: 20, l: 'Min refresh' },
        ].map(({ v, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '18px',
              color: 'var(--text)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
            }}><CountUp to={v} /></span>
            <span className="mono-label" style={{ color: 'var(--text-3)' }}>{l}</span>
          </div>
        ))}
      </footer>
    </main>
  )
}
