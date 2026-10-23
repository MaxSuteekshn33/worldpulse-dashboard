'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowRight } from 'lucide-react'
import CountrySearch from '@/components/CountrySearch'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'
import { SOURCE_COUNT } from '@/lib/sources'
import { useIsCompact } from '@/lib/useMediaQuery'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })

export default function Landing() {
  const isCompact = useIsCompact()
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
        padding: `var(--safe-top) ${isCompact ? '16px' : '28px'} 0`,
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
            fontSize: '13.5px', fontWeight: 600, color: 'var(--text)',
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
        padding: `${isCompact ? '44px' : '56px'} 20px 40px`,
        gap: '20px',
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
              <span className="mono-label" style={{ color: 'var(--text-2)', fontSize: '9.5px' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <h1 className="display-xl" style={{ maxWidth: '800px' }}>
          The world is happening.
          <br />
          <span style={{ color: 'var(--accent)' }}>Track it live.</span>
        </h1>

        <p style={{
          fontSize: isCompact ? '15px' : '16.5px', fontWeight: 450,
          color: 'var(--text-2)', maxWidth: '520px', lineHeight: 1.55,
        }}>
          Headlines, politics, world affairs, economy and finance —
          one focused page per country, refreshed every 20 minutes.
        </p>

        {/* Primary CTA */}
        <div style={{ width: isCompact ? '100%' : 'min(520px, 92vw)', marginTop: '4px' }}>
          <CountrySearch size={isCompact ? 'compact' : 'hero'} placeholder="Search a country to start…" />
        </div>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 600, color: 'var(--text-3)',
            textDecoration: 'none', letterSpacing: '-.01em',
          }}
        >
          or explore the world map <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

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
          { v: String(COUNTRIES.length), l: 'Countries' },
          { v: String(SOURCE_COUNT), l: 'Newsrooms' },
          { v: String(SEGMENTS.length), l: 'Categories' },
          { v: '20', l: 'Min refresh' },
        ].map(({ v, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '18px',
              color: 'var(--text)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
            }}>{v}</span>
            <span className="mono-label" style={{ color: 'var(--text-3)' }}>{l}</span>
          </div>
        ))}
      </footer>
    </main>
  )
}
