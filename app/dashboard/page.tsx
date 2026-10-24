'use client'
import dynamic from 'next/dynamic'
// Cross-fades when the destination is prerendered; a plain navigation
// otherwise, so on-demand pages still show their skeleton at once.
import Link from '@/components/FastLink'
import { useEffect } from 'react'
import CountryPanel from '@/components/CountryPanel'
import CountUp from '@/components/CountUp'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'
import { SOURCE_COUNT } from '@/lib/sources'
import { useIsCompact } from '@/lib/useMediaQuery'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

/**
 * How long the call to action stays open on arrival.
 *
 * Long enough that the first thing anyone reads on a map they have never seen
 * is what the map is for; short enough that it then gets out of the way on
 * its own, because the map is what they came for.
 */
const CTA_MS = 8000

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
      <span style={{
        fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '17px',
        color: 'var(--text)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
      }}>
        <CountUp to={value} />
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


      {/* ── CALL TO ACTION ──
          Left edge, collapsed by default. It was a centred hero, which covered
          the middle of the map — the part people actually came to read — and
          left nowhere to put anything else on this screen. The panel brings its
          own scrim, sized to whichever state it is in. */}
      <CountryPanel introMs={CTA_MS} />

      {/* ── BOTTOM STATS STRIP ──
          Google's attribution logo is pinned bottom-left of the map at
          z-index 1,000,000 and may not be hidden, so the strip gets out of its
          way: shifted right on desktop, lifted above it on compact. Before
          this the "200" in "200 Countries" sat directly under the logo. */}
      <footer style={{
        position: 'absolute', left: 0, right: 0,
        bottom: 0, zIndex: 200,
        padding: isCompact
          ? '12px 16px calc(42px + var(--safe-bottom))'
          : '12px 24px calc(12px + var(--safe-bottom)) 88px',
        background: 'linear-gradient(to top, rgba(8,8,12,.95) 55%, transparent)',
        display: 'flex', alignItems: 'center',
        gap: isCompact ? '16px' : '28px',
        flexWrap: 'wrap',
      }}>
        <Stat value={COUNTRIES.length} label="Countries" />
        <Stat value={SOURCE_COUNT} label="Newsrooms" />
        <Stat value={SEGMENTS.length} label="Categories" />

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
            {/* Roughly half the map sits quiet at any moment — saying so stops the
                dim grey dots reading as a map that failed to load. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: '#6B7389', opacity: .55, display: 'inline-block',
              }} />
              <span className="mono-label" style={{ color: 'var(--text-4)' }}>Quiet</span>
            </div>
          </div>
        )}
      </footer>
    </main>
  )
}
