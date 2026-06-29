'use client'
import { useState, useRef, useEffect } from 'react'
import { useAppStore, Segment } from '@/lib/store'
import { getCountryByCode } from '@/lib/countries'
import { COUNTRIES } from '@/lib/countries'

// ── Segment config ────────────────────────────────────────────
const SEGMENTS: { key: Segment; label: string; color: string; icon: string }[] = [
  { key: 'headline',    label: 'HEADLINES', color: '#3b82f6', icon: '📰' },
  { key: 'politics',   label: 'POLITICS',  color: '#ec4899', icon: '🏛️' },
  { key: 'geopolitics', label: 'WORLD',   color: '#f97316', icon: '🌍' },
  { key: 'finance',     label: 'FINANCE',  color: '#22c55e', icon: '💹' },
]

// ── TradingView Chart Widget ──────────────────────────────────
function TVChart({ symbol, title, color }: { symbol: string; title: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.cssText = 'width:100%;height:100%;'
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.cssText = 'width:100%;height:calc(100% - 32px);'
    container.appendChild(widget)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      height: '100%',
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      trendLineColor: color,
      underLineColor: `${color}33`,
      underLineBottomColor: 'rgba(0,0,0,0)',
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      noTimeScale: false,
    })
    container.appendChild(script)
    ref.current.appendChild(container)
    return () => { if (ref.current) ref.current.innerHTML = '' }
  }, [symbol, color])

  return (
    <div style={{
      flex: 1, minWidth: 0, background: 'rgba(255,255,255,.03)',
      border: `1px solid ${color}30`,
      borderRadius: '12px', overflow: 'hidden', padding: '10px',
      display: 'flex', flexDirection: 'column', gap: '6px',
      boxShadow: `0 0 20px ${color}08`,
      transition: 'border-color .2s, box-shadow .2s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = `${color}60`
      e.currentTarget.style.boxShadow = `0 0 28px ${color}18`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = `${color}30`
      e.currentTarget.style.boxShadow = `0 0 20px ${color}08`
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '9px', letterSpacing: '.12em', color }}>{title}</span>
      </div>
      <div ref={ref} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}

// ── Finance Charts Panel ─────────────────────────────────────
const CHARTS = [
  [
    { symbol: 'TVC:GOLD',    title: 'GOLD',    color: '#f59e0b' },
    { symbol: 'TVC:SILVER',  title: 'SILVER',  color: '#94a3b8' },
  ],
  [
    { symbol: 'BSE:SENSEX',  title: 'SENSEX',  color: '#ec4899' },
    { symbol: 'NSE:NIFTY50', title: 'NIFTY 50',color: '#8b5cf6' },
  ],
  [
    { symbol: 'SP:SPX',      title: 'S&P 500 (US)',  color: '#3b82f6' },
    { symbol: 'TVC:UKX',     title: 'FTSE 100 (UK)', color: '#22c55e' },
  ],
]

function FinanceChartsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}
         className="no-scrollbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10px', letterSpacing: '.16em', color: '#22c55e' }}>LIVE MARKET CHARTS</span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse-ring 1.8s ease-out infinite' }} />
      </div>
      {CHARTS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: '12px', height: '140px' }}>
          {row.map(c => <TVChart key={c.symbol} {...c} />)}
        </div>
      ))}
    </div>
  )
}

// ── News Card ────────────────────────────────────────────────
function NewsCard({ article, color, segKey }: {
  article: ReturnType<typeof useAppStore.getState>['articles'][0]
  color: string
  segKey: string
}) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className={`card-${segKey === 'geopolitics' ? 'geopolitics' : segKey}`}
        style={{
          background: '#fff',
          border: '1px solid transparent',
          borderRadius: '12px', overflow: 'hidden',
          cursor: 'pointer', transition: 'all .22s',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 2px 12px rgba(26,10,46,.07)',
        }}
      >
        {/* Image */}
        {article.imageUrl && (
          <div style={{ height: '100px', overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,.3)' }}>
            <img
              src={article.imageUrl}
              alt={article.headline}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .85 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {/* Source + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', textTransform: 'uppercase' }}>
              {article.source} · {article.timeAgo}
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: '13px', lineHeight: 1.4, color: '#1a0a2e',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.headline}
          </div>

          {/* Description preview */}
          <div style={{
            fontFamily: 'Saira, sans-serif', fontSize: '10.5px',
            lineHeight: 1.5, color: '#7c5c3a',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.description}
          </div>

          <div style={{
            marginTop: 'auto', paddingTop: '4px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
            color, letterSpacing: '.1em', opacity: .8,
          }}>READ MORE →</div>
        </div>
      </div>
    </a>
  )
}

// ── News Grid (2×2) ───────────────────────────────────────────
function NewsGrid() {
  const { articles, loading, selectedSegment, setSegment } = useAppStore()

  const LAYOUT = [
    [SEGMENTS[1], SEGMENTS[2]], // Politics | World
    [SEGMENTS[0], SEGMENTS[3]], // Headlines | Finance
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
      {/* Segment tab row */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 800,
              fontSize: '10px', letterSpacing: '.12em', padding: '7px 14px',
              borderRadius: '8px', cursor: 'pointer', transition: 'all .18s',
              background: selectedSegment === s.key ? `${s.color}18` : '#fff',
              border: `1.5px solid ${selectedSegment === s.key ? s.color : 'rgba(26,10,46,.2)'}`,
              color: selectedSegment === s.key ? s.color : '#1a0a2e',
              boxShadow: selectedSegment === s.key ? `0 0 14px ${s.color}25` : '0 1px 4px rgba(26,10,46,.08)',
            }}
          >
            {s.label}
          </button>
        ))}
        {loading && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(0,229,255,.5)', letterSpacing: '.1em', alignSelf: 'center' }}>LOADING…</span>
        )}
      </div>

      {/* 2×2 grid */}
      {LAYOUT.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {row.map(seg => {
            const segArticles = selectedSegment === seg.key ? articles : []
            if (selectedSegment !== seg.key) {
              return (
                <div key={seg.key}
                  onClick={() => setSegment(seg.key)}
                  style={{
                    background: '#fff',
                    border: `1px solid ${seg.color}25`,
                    borderRadius: '12px', padding: '20px',
                    cursor: 'pointer', transition: 'all .18s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    minHeight: '120px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${seg.color}0a`; e.currentTarget.style.borderColor = `${seg.color}50` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = `${seg.color}25` }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, boxShadow: `0 0 10px ${seg.color}` }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '10px', letterSpacing: '.14em', color: seg.color }}>{seg.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#1a0a2e', fontWeight: 800 }}>CLICK TO LOAD</span>
                </div>
              )
            }
            if (loading) {
              return (
                <div key={seg.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1,2].map(i => <div key={i} className="shimmer" style={{ height: '140px', borderRadius: '12px' }} />)}
                </div>
              )
            }
            if (segArticles.length === 0) {
              return (
                <div key={seg.key} style={{
                  background: '#fff', border: `1px solid rgba(255,255,255,.06)`,
                  borderRadius: '12px', padding: '20px', minHeight: '120px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 800, color: '#1a0a2e', textAlign: 'center' }}>NO {seg.label} NEWS</span>
                </div>
              )
            }
            return (
              <div key={seg.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {segArticles.slice(0, 3).map(a => <NewsCard key={a.id} article={a} color={seg.color} segKey={seg.key} />)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Country Search (sidebar) ──────────────────────────────────
function SidebarSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selectCountry = useAppStore(s => s.selectCountry)

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function pick(code: string) { selectCountry(code); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(26,10,46,.04)', border: '1px solid rgba(26,10,46,.15)',
        borderRadius: '8px', padding: '8px 12px',
        boxShadow: '0 0 16px rgba(0,229,255,.08)',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
            color: '#1a0a2e', letterSpacing: '.06em', width: '100%',
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '40px', left: 0, right: 0, zIndex: 9999,
          background: '#fff', border: '1px solid rgba(26,10,46,.15)',
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,.7)',
        }}>
          {results.map(c => (
            <div key={c.code} onMouseDown={() => pick(c.code)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
              color: '#1a0a2e', borderBottom: '1px solid rgba(26,10,46,.07)',
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '14px' }}>{c.flag}</span>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────
export default function NewsDrawer() {
  const { drawerOpen, selectedCountry, closeDrawer } = useAppStore()
  const [activeTab, setActiveTab] = useState<'news' | 'charts'>('news')
  // Default ~42vh so top aligns with southern Africa / Namibia latitude
  const [panelHeight, setPanelHeight] = useState(42)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const country = selectedCountry ? getCountryByCode(selectedCountry) : null

  // Drag handle logic
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: panelHeight }
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }
  function onDragMove(e: MouseEvent) {
    if (!dragRef.current) return
    const dy = dragRef.current.startY - e.clientY
    const newH = dragRef.current.startH + (dy / window.innerHeight) * 100
    setPanelHeight(Math.min(88, Math.max(18, newH)))
  }
  function onDragEnd() {
    dragRef.current = null
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  if (!drawerOpen || !country) return null

  return (
    <div className="panel-enter" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      height: `${panelHeight}vh`,
      background: '#f8f7ff',
      borderTop: '3px solid #1a0a2e',
      boxShadow: '0 -20px 80px rgba(0,0,0,.7)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top bar (contains drag handle pill inline) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 20px',
        borderBottom: '1px solid rgba(26,10,46,.1)',
        flexShrink: 0, background: '#fff',
      }}>
        <span style={{ fontSize: '20px' }}>{country.flag}</span>
        <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '16px', color: '#1a0a2e' }}>{country.name}</span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px #7c3aed', animation: 'pulse-ring 1.8s ease-out infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#7c3aed', letterSpacing: '.12em', fontWeight: 800 }}>LIVE</span>

        {/* ── Drag pill — inline, centred ── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            onMouseDown={onDragStart}
            style={{
              cursor: 'ns-resize', userSelect: 'none',
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '24px',
              background: 'rgba(236,72,153,.1)',
              border: '1.5px solid rgba(236,72,153,.4)',
              boxShadow: '0 0 12px rgba(236,72,153,.15)',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,.18)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(236,72,153,.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,.1)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(236,72,153,.15)' }}
          >
            <span style={{ fontSize: '11px', lineHeight: 1 }}>↕</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
              fontWeight: 900, color: '#1a0a2e', letterSpacing: '.16em',
            }}>DRAG TO RESIZE</span>
          </div>
        </div>

        <button onClick={closeDrawer} style={{
          width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid rgba(26,10,46,.2)', background: 'transparent',
          color: '#1a0a2e', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,10,46,.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >✕</button>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: '200px', flexShrink: 0,
          borderRight: '1px solid rgba(26,10,46,.1)',
          background: '#fff', padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          {/* Country search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '.14em', color: '#7c5c3a', fontWeight: 800 }}>SWITCH COUNTRY</span>
            <SidebarSearch />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(26,10,46,.08)' }} />

          {/* Nav CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '.14em', color: '#7c5c3a', fontWeight: 800 }}>SECTIONS</span>

            {/* Country News CTA */}
            <button
              onClick={() => setActiveTab('news')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                background: activeTab === 'news' ? 'rgba(124,58,237,.1)' : 'rgba(26,10,46,.04)',
                border: `1px solid ${activeTab === 'news' ? 'rgba(124,58,237,.5)' : 'rgba(26,10,46,.12)'}`,
                transition: 'all .18s', textAlign: 'left',
                boxShadow: activeTab === 'news' ? '0 0 16px rgba(124,58,237,.15)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'news' ? '#7c3aed' : '#7c5c3a'} strokeWidth="2">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '9px', letterSpacing: '.1em', color: activeTab === 'news' ? '#7c3aed' : '#1a0a2e' }}>COUNTRY NEWS</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', color: '#7c5c3a', letterSpacing: '.06em', marginTop: '2px', fontWeight: 600 }}>Headlines · Politics · World · Finance</div>
              </div>
            </button>

            {/* Finance Charts CTA */}
            <button
              onClick={() => setActiveTab('charts')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                background: activeTab === 'charts' ? 'rgba(34,197,94,.1)' : 'rgba(26,10,46,.04)',
                border: `1px solid ${activeTab === 'charts' ? 'rgba(34,197,94,.5)' : 'rgba(26,10,46,.12)'}`,
                transition: 'all .18s', textAlign: 'left',
                boxShadow: activeTab === 'charts' ? '0 0 16px rgba(34,197,94,.15)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'charts' ? '#22c55e' : '#7c5c3a'} strokeWidth="2">
                <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '9px', letterSpacing: '.1em', color: activeTab === 'charts' ? '#16a34a' : '#1a0a2e' }}>FINANCE CHARTS</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', color: '#7c5c3a', letterSpacing: '.06em', marginTop: '2px', fontWeight: 600 }}>Gold · Silver · Sensex · Nifty · S&P · FTSE</div>
              </div>
            </button>
          </div>

          {/* Segment legend */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SEGMENTS.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, boxShadow: `0 0 5px ${s.color}`, flexShrink: 0 }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fontWeight: 800, color: '#1a0a2e', letterSpacing: '.08em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div style={{ flex: 1, minWidth: 0, padding: '14px 18px', overflowY: 'auto' }} className="no-scrollbar">
          {activeTab === 'news' ? <NewsGrid /> : <FinanceChartsPanel />}
        </div>
      </div>
    </div>
  )
}
