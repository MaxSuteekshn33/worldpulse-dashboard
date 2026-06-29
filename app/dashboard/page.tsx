'use client'
import dynamic from 'next/dynamic'
import { useState, useRef, useEffect } from 'react'
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
        border: '1px solid rgba(0,229,255,.5)',
        borderRadius: '8px', padding: '0 16px', height: '40px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 20px rgba(0,229,255,.2), 0 0 40px rgba(0,229,255,.08)',
      }}>
        <span style={{ color: '#00e5ff', fontSize: '16px', lineHeight: 1 }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '12px',
            color: '#fff', letterSpacing: '.08em', width: '180px',
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '46px', right: 0,
          background: 'rgba(4,4,12,.97)', border: '1px solid rgba(0,229,255,.22)',
          borderRadius: '8px', overflow: 'hidden', zIndex: 99999,
          minWidth: '240px',
          boxShadow: '0 8px 32px rgba(0,0,0,.6), 0 0 20px rgba(0,229,255,.08)',
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
                borderBottom: '1px solid rgba(255,255,255,.05)',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '16px' }}>{c.flag}</span>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AutoOpenIndia() {
  const selectCountry = useAppStore(s => s.selectCountry)
  const drawerOpen = useAppStore(s => s.drawerOpen)

  useEffect(() => {
    if (!drawerOpen) {
      // Small delay to let the map load first
      const t = setTimeout(() => selectCountry('IN'), 1200)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>

      {/* Auto-open India */}
      <AutoOpenIndia />

      {/* Top nav bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20000,
        height: '56px',
        background: 'rgba(0,0,0,.88)',
        borderBottom: '1px solid rgba(0,229,255,.12)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '18px',
            color: '#fff', letterSpacing: '-.02em',
          }}>
            WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            color: 'rgba(0,229,255,.45)', letterSpacing: '.18em', textTransform: 'uppercase',
            borderLeft: '1px solid rgba(0,229,255,.18)', paddingLeft: '12px',
          }}>
            Live News Intelligence
          </span>
        </div>
        <CountrySearch />
      </div>

      {/* Map */}
      <div style={{ width: '100%', height: '100%', paddingTop: '56px' }}>
        <WorldMap />
      </div>

      {/* Bottom news drawer */}
      <NewsDrawer />
    </main>
  )
}
