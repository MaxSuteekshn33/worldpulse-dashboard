'use client'
import dynamic from 'next/dynamic'
import { useState, useRef } from 'react'
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
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(0,0,0,.7)', border: '1px solid rgba(0,229,255,.25)',
        borderRadius: '4px', padding: '0 12px', height: '32px',
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ color: 'rgba(0,229,255,.5)', fontSize: '12px' }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
            color: '#fff', letterSpacing: '.08em', width: '160px',
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '36px', right: 0,
          background: 'rgba(4,4,12,.96)', border: '1px solid rgba(0,229,255,.18)',
          borderRadius: '6px', overflow: 'hidden', zIndex: 99999,
          minWidth: '200px',
        }}>
          {results.map(c => (
            <div
              key={c.code}
              onMouseDown={() => pick(c.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 14px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                color: '#fff', letterSpacing: '.06em',
                borderBottom: '1px solid rgba(255,255,255,.05)',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '14px' }}>{c.flag}</span>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>

      {/* Top nav bar — above everything */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20000,
        height: '48px',
        background: 'rgba(0,0,0,.88)',
        borderBottom: '1px solid rgba(0,229,255,.12)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

      {/* Map — offset by nav height */}
      <div style={{ width: '100%', height: '100%', paddingTop: '48px' }}>
        <WorldMap />
      </div>

      {/* Bottom news drawer */}
      <NewsDrawer />
    </main>
  )
}
