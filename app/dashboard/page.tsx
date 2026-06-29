'use client'
import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import NewsDrawer from '@/components/NewsDrawer'
import { COUNTRIES } from '@/lib/countries'
import { useAppStore } from '@/lib/store'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

function CountrySearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selectCountry = useAppStore(s => s.selectCountry)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function pick(code: string) {
    selectCountry(code)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'absolute', top: '50%', right: '24px', transform: 'translateY(-50%)', zIndex: 99999 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(4,4,12,.85)',
        border: '1px solid rgba(0,229,255,.45)',
        borderRadius: '8px', padding: '0 16px', height: '38px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 20px rgba(0,229,255,.15), 0 0 50px rgba(0,229,255,.05)',
        transition: 'box-shadow .2s',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
            color: '#fff', letterSpacing: '.08em', width: '170px',
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          background: 'rgba(4,4,12,.97)', border: '1px solid rgba(0,229,255,.2)',
          borderRadius: '10px', overflow: 'hidden', zIndex: 99999,
          minWidth: '240px',
          boxShadow: '0 12px 40px rgba(0,0,0,.7), 0 0 20px rgba(0,229,255,.06)',
        }}>
          {results.map(c => (
            <div
              key={c.code}
              onMouseDown={() => pick(c.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                color: '#fff', letterSpacing: '.06em',
                borderBottom: '1px solid rgba(255,255,255,.04)',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '16px' }}>{c.flag}</span>
              {c.name}
              <span style={{ marginLeft: 'auto', color: 'rgba(0,229,255,.4)', fontSize: '9px' }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AutoInit() {
  const selectCountry = useAppStore(s => s.selectCountry)
  const drawerOpen = useAppStore(s => s.drawerOpen)
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('country')
    if (code) {
      // Country passed from landing page search
      setTimeout(() => selectCountry(code.toUpperCase()), 900)
    } else if (!drawerOpen) {
      // Default: open India
      setTimeout(() => selectCountry('IN'), 1200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function Dashboard() {
  return (
    <main style={{ width: '100vw', height: '100vh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>

      <Suspense fallback={null}><AutoInit /></Suspense>

      {/* ── NAV ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20000,
        height: '52px',
        background: 'rgba(6,6,14,.9)',
        borderBottom: '1px solid rgba(0,229,255,.1)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '18px',
              color: '#fff', letterSpacing: '-.02em',
            }}>
              WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
            </span>
          </a>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
            color: 'rgba(0,229,255,.35)', letterSpacing: '.18em',
            borderLeft: '1px solid rgba(0,229,255,.15)', paddingLeft: '12px',
          }}>
            LIVE NEWS INTELLIGENCE
          </span>
        </div>
        <CountrySearch />
      </div>

      {/* ── MAP ── */}
      <div style={{ width: '100%', height: '100%', paddingTop: '52px' }}>
        <WorldMap />
      </div>

      {/* ── NEWS PANEL ── */}
      <NewsDrawer />
    </main>
  )
}
