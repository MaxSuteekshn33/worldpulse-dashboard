'use client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { COUNTRIES } from '@/lib/countries'
import { useIsCompact } from '@/lib/useMediaQuery'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })

const SEGMENTS = [
  { color: '#3b82f6', label: 'HEADLINES' },
  { color: '#ec4899', label: 'POLITICS' },
  { color: '#f97316', label: 'WORLD' },
  { color: '#22c55e', label: 'FINANCE' },
]

export default function Landing() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isCompact = useIsCompact()

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function pick(code: string) {
    router.push(`/dashboard?country=${code}`)
  }

  return (
    <main style={{
      width: '100vw', height: '100dvh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Dot grid */}
      <div className="dot-grid" style={{ position: 'fixed', inset: 0, opacity: .5, pointerEvents: 'none', zIndex: 0 }} />

      {/* Radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(0,229,255,.05) 0%, transparent 70%)',
      }} />

      {/* ── NAV ── */}
      <nav className="glass" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: `calc(56px + var(--safe-top))`,
        paddingTop: 'var(--safe-top)',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderBottom: '1px solid rgba(0,229,255,.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `var(--safe-top) ${isCompact ? '16px' : '32px'} 0`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: isCompact ? '17px' : '20px',
            color: '#fff', letterSpacing: '-.02em',
          }}>
            WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
          </span>
          {!isCompact && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              color: 'rgba(0,229,255,.4)', letterSpacing: '.2em',
              borderLeft: '1px solid rgba(0,229,255,.15)', paddingLeft: '14px',
            }}>
              LIVE NEWS INTELLIGENCE
            </span>
          )}
        </div>
        {/* Right side intentionally blank — features coming soon */}
      </nav>

      {/* ── HERO ── */}
      <div className="fade-in" style={{
        position: 'absolute', top: `calc(56px + var(--safe-top))`, left: 0, right: 0,
        zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '12px',
        padding: `${isCompact ? '32px' : '64px'} 20px 0`,
      }}>
        {/* Segment pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {SEGMENTS.map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '20px',
              background: `${s.color}14`,
              border: `1px solid ${s.color}40`,
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, display: 'inline-block' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '.12em', color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 900,
          fontSize: 'clamp(30px, 8vw, 60px)', lineHeight: 1.05,
          textAlign: 'center', letterSpacing: '-.03em', maxWidth: '780px',
          background: 'linear-gradient(180deg, #fff 40%, rgba(255,255,255,.5) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          THE WORLD IS HAPPENING.<br />
          <span style={{
            background: 'linear-gradient(90deg, #00e5ff, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>TRACK IT LIVE.</span>
        </h1>

        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '9.5px' : '11px',
          color: 'rgba(255,255,255,.35)', letterSpacing: '.1em',
          textAlign: 'center', marginBottom: '8px', maxWidth: '480px',
        }}>
          50 COUNTRIES · CNN · SKY NEWS · INDIAN EXPRESS · UPDATES EVERY 20 MIN
        </p>

        {/* ── BIG SEARCH CTA — moved to bottom centre, rendered below ── */}
        <div style={{ display: 'none' }}>
          <div className="glass-neon" style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            borderRadius: '12px', padding: '0 20px', height: '56px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 160)}
              placeholder="Search a country to start tracking…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '13px',
                color: '#fff', letterSpacing: '.06em',
              }}
            />
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                fontSize: '9px', letterSpacing: '.14em',
                color: '#0a0a0f', background: '#00e5ff',
                border: 'none', borderRadius: '6px',
                padding: '8px 16px', cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'opacity .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              OPEN MAP ▶
            </button>
          </div>

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div className="glass" style={{
              position: 'absolute', top: '62px', left: 0, right: 0,
              borderRadius: '10px', overflow: 'hidden', zIndex: 9999,
              boxShadow: '0 16px 48px rgba(0,0,0,.6), 0 0 24px rgba(0,229,255,.08)',
            }}>
              {results.map(c => (
                <div
                  key={c.code}
                  onMouseDown={() => pick(c.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                    color: '#fff', letterSpacing: '.06em',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '18px' }}>{c.flag}</span>
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(0,229,255,.5)', fontSize: '9px' }}>VIEW NEWS →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAP fills bottom portion ── */}
      <div style={{
        position: 'absolute', inset: 0, top: `calc(56px + var(--safe-top))`, zIndex: 1,
        maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 30%, black 52%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 30%, black 52%, black 100%)',
      }}>
        <MiniMap />
      </div>

      {/* ── BOTTOM CENTRE SEARCH CTA ── */}
      <div style={{
        position: 'fixed', bottom: 'calc(var(--safe-bottom) + 24px)', left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, width: '100%', maxWidth: '520px', padding: isCompact ? '0 16px' : '0 24px',
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: isCompact ? '10px' : '12px',
            background: 'rgba(4,4,12,.92)',
            border: '1.5px solid rgba(0,229,255,.5)',
            borderRadius: '14px', padding: isCompact ? '0 14px' : '0 20px', height: '56px',
            boxShadow: '0 0 40px rgba(0,229,255,.2), 0 0 80px rgba(0,229,255,.08), 0 20px 60px rgba(0,0,0,.8)',
            backdropFilter: 'blur(24px)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 160)}
              placeholder={isCompact ? 'Search a country…' : 'Search a country to start tracking…'}
              inputMode="search"
              style={{
                flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '16px' : '13px',
                color: '#fff', letterSpacing: '.06em',
              }}
            />
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                flexShrink: 0,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 800,
                fontSize: '10px', letterSpacing: '.14em',
                color: '#0a0a0f', background: '#00e5ff',
                border: 'none', borderRadius: '8px',
                padding: isCompact ? '10px 14px' : '10px 18px', cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'opacity .15s',
                boxShadow: '0 0 20px rgba(0,229,255,.4)',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {isCompact ? '▶' : 'OPEN MAP ▶'}
            </button>
          </div>

          {/* Dropdown opens upward */}
          {open && results.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '64px', left: 0, right: 0,
              background: 'rgba(4,4,12,.97)', border: '1px solid rgba(0,229,255,.2)',
              borderRadius: '10px', overflow: 'hidden', zIndex: 9999,
              maxHeight: '50vh', overflowY: 'auto',
              boxShadow: '0 -8px 40px rgba(0,0,0,.7), 0 0 24px rgba(0,229,255,.08)',
            }}>
              {results.map(c => (
                <div
                  key={c.code}
                  onMouseDown={() => pick(c.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: isCompact ? '13px 16px' : '12px 20px', minHeight: isCompact ? '44px' : undefined,
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '13px' : '11px',
                    color: '#fff', letterSpacing: '.06em',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '18px' }}>{c.flag}</span>
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(0,229,255,.5)', fontSize: '9px' }}>VIEW NEWS →</span>
                </div>
              ))}
            </div>
          )}

          {/* Hint text */}
          <p style={{
            textAlign: 'center', marginTop: '10px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
            color: 'rgba(255,255,255,.2)', letterSpacing: '.14em', fontWeight: 700,
          }}>
            CLICK ANY COUNTRY BUBBLE ON THE MAP · OR SEARCH HERE
          </p>
        </div>
      </div>

    </main>
  )
}
