'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import NewsDrawer from '@/components/NewsDrawer'
import { COUNTRIES } from '@/lib/countries'
import { useAppStore } from '@/lib/store'
import { useIsCompact } from '@/lib/useMediaQuery'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

function CountrySearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const selectCountry = useAppStore(s => s.selectCountry)
  const inputRef = useRef<HTMLInputElement>(null)
  const isCompact = useIsCompact()

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function pick(code: string) {
    selectCountry(code)
    setQuery('')
    setOpen(false)
    setMobileExpanded(false)
  }

  // Compact viewport: collapse to a 44×44 icon button that expands into a full-width search bar
  if (isCompact && !mobileExpanded) {
    return (
      <button
        onClick={() => { setMobileExpanded(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        aria-label="Search country"
        style={{
          position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 99999,
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'rgba(4,4,12,.85)', border: '1px solid rgba(0,229,255,.45)',
          backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 0 16px rgba(0,229,255,.12)',
        }}
      >
        <Search size={16} strokeWidth={2.3} color="#00e5ff" />
      </button>
    )
  }

  return (
    <div style={{
      position: isCompact ? 'fixed' : 'absolute',
      top: isCompact ? 'calc(var(--safe-top) + 8px)' : '50%',
      left: isCompact ? '12px' : 'auto',
      right: '12px',
      transform: isCompact ? 'none' : 'translateY(-50%)',
      zIndex: 99999,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(4,4,12,.92)',
        border: '1px solid rgba(0,229,255,.45)',
        borderRadius: '8px', padding: '0 14px', height: '44px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 20px rgba(0,229,255,.15), 0 0 50px rgba(0,229,255,.05)',
        transition: 'box-shadow .2s',
      }}>
        <Search size={14} strokeWidth={2.3} color="#00e5ff" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          inputMode="search"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '16px' : '12px',
            color: '#fff', letterSpacing: '.06em', width: isCompact ? '100%' : '170px', minWidth: 0,
          }}
        />
        {isCompact && (
          <button
            onClick={() => { setMobileExpanded(false); setQuery(''); setOpen(false) }}
            aria-label="Close search"
            style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.08)', border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={13} strokeWidth={2.3} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '48px', right: 0, left: isCompact ? 0 : 'auto',
          background: 'rgba(4,4,12,.97)', border: '1px solid rgba(0,229,255,.2)',
          borderRadius: '10px', overflow: 'hidden', zIndex: 99999,
          minWidth: isCompact ? undefined : '240px',
          boxShadow: '0 12px 40px rgba(0,0,0,.7), 0 0 20px rgba(0,229,255,.06)',
        }}>
          {results.map(c => (
            <div
              key={c.code}
              onMouseDown={() => pick(c.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '12px',
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
  const isCompact = useIsCompact()
  const navHeight = 52

  return (
    <main style={{ width: '100vw', height: '100dvh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>

      <Suspense fallback={null}><AutoInit /></Suspense>

      {/* ── NAV ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20000,
        height: `calc(${navHeight}px + var(--safe-top))`,
        paddingTop: 'var(--safe-top)',
        background: 'rgba(6,6,14,.9)',
        borderBottom: '1px solid rgba(0,229,255,.1)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: `var(--safe-top) ${isCompact ? '16px' : '24px'} 0`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: `${navHeight}px` }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: isCompact ? '16px' : '18px',
              color: '#fff', letterSpacing: '-.02em',
            }}>
              WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
            </span>
          </Link>
          {!isCompact && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
              color: 'rgba(0,229,255,.35)', letterSpacing: '.18em',
              borderLeft: '1px solid rgba(0,229,255,.15)', paddingLeft: '12px',
            }}>
              LIVE NEWS INTELLIGENCE
            </span>
          )}
        </div>
        <CountrySearch />
      </div>

      {/* ── MAP ── */}
      <div style={{ width: '100%', height: '100%', paddingTop: `calc(${navHeight}px + var(--safe-top))` }}>
        <WorldMap />
      </div>

      {/* ── NEWS PANEL ── */}
      <NewsDrawer />
    </main>
  )
}
