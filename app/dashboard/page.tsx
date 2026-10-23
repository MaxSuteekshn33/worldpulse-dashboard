'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect } from 'react'
import CountrySearch from '@/components/CountrySearch'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'
import { SOURCE_COUNT } from '@/lib/sources'
import { useIsCompact } from '@/lib/useMediaQuery'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

const QUICK_PICKS = ['IN', 'US', 'GB', 'CN', 'RU']

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
      <span style={{
        fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '17px',
        color: 'var(--text)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      <span className="mono-label" style={{ color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const isCompact = useIsCompact()
  const navHeight = 56

  useEffect(() => {
    document.body.classList.add('lock-scroll')
    return () => { document.body.classList.remove('lock-scroll') }
  }, [])

  return (
    <main style={{
      width: '100vw', height: '100dvh', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ── NAV ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        height: `calc(${navHeight}px + var(--safe-top))`,
        paddingTop: 'var(--safe-top)',
        background: 'rgba(8,8,12,.88)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: `var(--safe-top) ${isCompact ? '16px' : '28px'} 0`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', height: `${navHeight}px` }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900,
              fontSize: isCompact ? '17px' : '19px',
              color: 'var(--text)', letterSpacing: '-.03em',
            }}>
              WORLD<span style={{ color: 'var(--accent)' }}>PULSE</span>
            </span>
          </Link>
          {!isCompact && (
            <span className="mono-label" style={{
              color: 'var(--text-4)',
              borderLeft: '1px solid var(--border-mid)', paddingLeft: '13px',
            }}>
              Live News Intelligence
            </span>
          )}
        </div>
      </header>

      {/* ── MAP ── */}
      <div style={{
        position: 'absolute', inset: 0,
        paddingTop: `calc(${navHeight}px + var(--safe-top))`,
      }}>
        <WorldMap />
      </div>

      {/* Scrim — keeps hero copy legible over busy map labels */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 150, pointerEvents: 'none',
          background: isCompact
            ? 'linear-gradient(to bottom, rgba(8,8,12,.92) 0%, rgba(8,8,12,.5) 34%, transparent 52%)'
            : 'radial-gradient(ellipse 48% 44% at 50% 30%, rgba(8,8,12,.93) 0%, rgba(8,8,12,.78) 45%, rgba(8,8,12,.28) 72%, transparent 88%)',
        }}
      />

      {/* ── HERO SEARCH CTA ── */}
      <div style={{
        position: 'absolute',
        top: isCompact ? `calc(${navHeight}px + var(--safe-top) + 20px)` : '17%',
        left: '50%', transform: 'translateX(-50%)',
        width: isCompact ? 'calc(100% - 32px)' : 'min(640px, 92vw)',
        zIndex: 200, pointerEvents: 'none',
      }}>
        <div className="fade-up" style={{ pointerEvents: 'auto' }}>
          {!isCompact && (
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <h1 className="display-lg" style={{ marginBottom: '10px', textWrap: 'balance' }}>
                Pick a country. Get the full picture.
              </h1>
              <p style={{
                fontSize: '15px', fontWeight: 500, color: 'var(--text-2)',
                letterSpacing: '-.01em', maxWidth: '470px', margin: '0 auto',
                textWrap: 'balance',
              }}>
                Headlines, politics, world, economy and finance — one page per country,
                refreshed every 20 minutes.
              </p>
            </div>
          )}

          <CountrySearch size={isCompact ? 'compact' : 'hero'} />

          {/* Quick picks */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            justifyContent: 'center', marginTop: '14px',
          }}>
            {!isCompact && (
              <span className="mono-label" style={{ color: 'var(--text-4)', alignSelf: 'center', marginRight: '2px' }}>
                Jump to
              </span>
            )}
            {QUICK_PICKS.map(code => {
              const c = COUNTRIES.find(x => x.code === code)
              if (!c) return null
              return (
                <Link
                  key={code}
                  href={`/country/${code}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '7px 13px', borderRadius: '999px',
                    background: 'rgba(18,18,26,.88)',
                    border: '1px solid var(--border)',
                    backdropFilter: 'blur(14px)',
                    fontSize: '13px', fontWeight: 600, color: 'var(--text-2)',
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
                  <span style={{ fontSize: '14px', lineHeight: 1 }} aria-hidden>{c.flag}</span>
                  {c.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATS STRIP ── */}
      <footer style={{
        position: 'absolute', left: 0, right: 0,
        bottom: 0, zIndex: 200,
        padding: `12px ${isCompact ? '16px' : '24px'} calc(12px + var(--safe-bottom))`,
        background: 'linear-gradient(to top, rgba(8,8,12,.95) 55%, transparent)',
        display: 'flex', alignItems: 'center',
        gap: isCompact ? '16px' : '28px',
        flexWrap: 'wrap',
      }}>
        <Stat value={String(COUNTRIES.length)} label="Countries" />
        <Stat value={String(SOURCE_COUNT)} label="Newsrooms" />
        <Stat value={String(SEGMENTS.length)} label="Categories" />

        {/* Legend */}
        {!isCompact && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '15px',
            marginLeft: 'auto', paddingLeft: '20px',
            borderLeft: '1px solid var(--border)',
          }}>
            {SEGMENTS.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: s.color, boxShadow: `0 0 6px ${s.color}`, display: 'inline-block',
                }} />
                <span className="mono-label" style={{ color: 'var(--text-3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </footer>
    </main>
  )
}
