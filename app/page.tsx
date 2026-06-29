'use client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { COUNTRIES } from '@/lib/countries'

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

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function pick(code: string) {
    router.push(`/dashboard?country=${code}`)
  }

  return (
    <main style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
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
        height: '56px',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderBottom: '1px solid rgba(0,229,255,.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '20px',
            color: '#fff', letterSpacing: '-.02em',
          }}>
            WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            color: 'rgba(0,229,255,.4)', letterSpacing: '.2em',
            borderLeft: '1px solid rgba(0,229,255,.15)', paddingLeft: '14px',
          }}>
            LIVE NEWS INTELLIGENCE
          </span>
        </div>
        {/* Right side intentionally blank — features coming soon */}
      </nav>

      {/* ── HERO ── */}
      <div className="fade-in" style={{
        position: 'absolute', top: '56px', left: 0, right: 0,
        zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: '64px', gap: '12px',
      }}>
        {/* Segment pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
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
          fontSize: 'clamp(32px, 5vw, 60px)', lineHeight: 1.0,
          textAlign: 'center', letterSpacing: '-.03em',
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
          fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
          color: 'rgba(255,255,255,.35)', letterSpacing: '.12em',
          textAlign: 'center', marginBottom: '8px',
        }}>
          50 COUNTRIES · CNN · SKY NEWS · INDIAN EXPRESS · UPDATES EVERY 20 MIN
        </p>

        {/* ── BIG SEARCH CTA ── */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
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
        position: 'absolute', inset: 0, top: '56px', zIndex: 1,
        maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 30%, black 52%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 30%, black 52%, black 100%)',
      }}>
        <MiniMap />
      </div>

      {/* Bottom tagline */}
      <div style={{
        position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
          color: 'rgba(255,255,255,.2)', letterSpacing: '.16em',
          fontWeight: 700,
        }}>
          CLICK ANY COUNTRY BUBBLE ON THE MAP · OR SEARCH ABOVE
        </p>
      </div>

    </main>
  )
}
