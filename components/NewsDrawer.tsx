'use client'
import { useState, useRef, useEffect } from 'react'
import { Newspaper, Landmark, Globe2, LineChart, Search, X, GripHorizontal, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { useAppStore, Segment } from '@/lib/store'
import { getCountryByCode } from '@/lib/countries'
import { COUNTRIES } from '@/lib/countries'
import { useIsCompact } from '@/lib/useMediaQuery'

// ── Segment config ────────────────────────────────────────────
const SEGMENTS: { key: Segment; label: string; color: string; icon: LucideIcon }[] = [
  { key: 'headline',    label: 'HEADLINES', color: '#3b82f6', icon: Newspaper },
  { key: 'politics',   label: 'POLITICS',  color: '#ec4899', icon: Landmark },
  { key: 'geopolitics', label: 'WORLD',   color: '#f97316', icon: Globe2 },
  { key: 'finance',     label: 'FINANCE',  color: '#22c55e', icon: LineChart },
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
  const isCompact = useIsCompact()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}
         className="no-scrollbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10px', letterSpacing: '.16em', color: '#22c55e' }}>LIVE MARKET CHARTS</span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse-ring 1.8s ease-out infinite' }} />
      </div>
      {isCompact
        ? CHARTS.flat().map(c => (
            <div key={c.symbol} style={{ height: '160px' }}><TVChart {...c} /></div>
          ))
        : CHARTS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: '12px', height: '140px' }}>
              {row.map(c => <TVChart key={c.symbol} {...c} />)}
            </div>
          ))
      }
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
        className={`news-card card-${segKey === 'geopolitics' ? 'geopolitics' : segKey}`}
        style={{
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '14px', overflow: 'hidden',
          cursor: 'pointer', transition: 'all .22s',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.06)',
        }}
      >
        {/* Image */}
        {article.imageUrl && (
          <div style={{ height: '110px', overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,.3)' }}>
            <img
              src={article.imageUrl}
              alt={article.headline}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {/* Source + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '.06em', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase' }}>
              {article.source} · {article.timeAgo}
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700,
            fontSize: '14.5px', lineHeight: 1.4, color: '#fff',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.headline}
          </div>

          {/* Description preview */}
          <div style={{
            fontFamily: 'Saira, sans-serif', fontSize: '12.5px',
            lineHeight: 1.55, color: 'rgba(255,255,255,.6)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.description}
          </div>

          <div style={{
            marginTop: 'auto', paddingTop: '6px',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
            color, letterSpacing: '.08em', fontWeight: 700,
          }}>
            READ MORE <ArrowUpRight size={11} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </a>
  )
}

// ── News Grid (2×2 desktop / single column mobile) ─────────────
function NewsGrid() {
  const { articles, loading, selectedSegment, setSegment } = useAppStore()
  const isCompact = useIsCompact()

  const LAYOUT = [
    [SEGMENTS[1], SEGMENTS[2]], // Politics | World
    [SEGMENTS[0], SEGMENTS[3]], // Headlines | Finance
  ]

  const segTabs = (
    <div style={{
      display: 'flex', gap: '8px',
      flexWrap: isCompact ? 'nowrap' : 'wrap',
      overflowX: isCompact ? 'auto' : 'visible',
      WebkitOverflowScrolling: 'touch',
    }} className={isCompact ? 'no-scrollbar' : undefined}>
      {SEGMENTS.map(s => {
        const Icon = s.icon
        const active = selectedSegment === s.key
        return (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              fontSize: '11px', letterSpacing: '.1em',
              padding: isCompact ? '11px 16px' : '8px 16px',
              minHeight: isCompact ? '44px' : undefined,
              borderRadius: '10px', cursor: 'pointer', transition: 'all .18s',
              background: active ? `${s.color}22` : 'rgba(255,255,255,.05)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: `1.5px solid ${active ? s.color : 'rgba(255,255,255,.12)'}`,
              color: active ? s.color : 'rgba(255,255,255,.75)',
              boxShadow: active ? `0 0 16px ${s.color}30` : 'none',
            }}
          >
            <Icon size={13} strokeWidth={2.3} />
            {s.label}
          </button>
        )
      })}
      {loading && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,229,255,.6)', letterSpacing: '.08em', alignSelf: 'center', flexShrink: 0 }}>LOADING…</span>
      )}
    </div>
  )

  // ── Mobile: single full-width column showing only the active segment ──
  if (isCompact) {
    const current = SEGMENTS.find(s => s.key === selectedSegment)!
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
        {segTabs}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: '170px', borderRadius: '14px' }} />)}
          </div>
        ) : articles.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,.04)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: '14px', padding: '28px 20px', minHeight: '120px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textAlign: 'center', letterSpacing: '.04em' }}>NO {current.label} NEWS</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {articles.slice(0, 6).map(a => <NewsCard key={a.id} article={a} color={current.color} segKey={current.key} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
      {segTabs}

      {/* 2×2 grid */}
      {LAYOUT.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {row.map(seg => {
            const segArticles = selectedSegment === seg.key ? articles : []
            const SegIcon = seg.icon
            if (selectedSegment !== seg.key) {
              return (
                <div key={seg.key}
                  onClick={() => setSegment(seg.key)}
                  className="segment-tile"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${seg.color}30`,
                    borderRadius: '14px', padding: '20px',
                    cursor: 'pointer', transition: 'all .18s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '9px',
                    minHeight: '120px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${seg.color}14`; e.currentTarget.style.borderColor = `${seg.color}60` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = `${seg.color}30` }}
                >
                  <SegIcon size={20} strokeWidth={2} color={seg.color} style={{ filter: `drop-shadow(0 0 6px ${seg.color}80)` }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '11px', letterSpacing: '.12em', color: seg.color }}>{seg.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,.45)', fontWeight: 600, letterSpacing: '.06em' }}>CLICK TO LOAD</span>
                </div>
              )
            }
            if (loading) {
              return (
                <div key={seg.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1,2].map(i => <div key={i} className="shimmer" style={{ height: '140px', borderRadius: '14px' }} />)}
                </div>
              )
            }
            if (segArticles.length === 0) {
              return (
                <div key={seg.key} style={{
                  background: 'rgba(255,255,255,.04)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid rgba(255,255,255,.1)`,
                  borderRadius: '14px', padding: '20px', minHeight: '120px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textAlign: 'center', letterSpacing: '.04em' }}>NO {seg.label} NEWS</span>
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
  const isCompact = useIsCompact()

  const results = query.trim().length > 0
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function pick(code: string) { selectCountry(code); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(255,255,255,.06)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: '10px', padding: isCompact ? '11px 12px' : '9px 12px',
        minHeight: isCompact ? '44px' : undefined,
        boxShadow: '0 0 16px rgba(0,229,255,.06)',
      }}>
        <Search size={13} strokeWidth={2.3} color="#00e5ff" style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search country…"
          inputMode="search"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '16px' : '11px',
            color: '#fff', letterSpacing: '.04em', width: '100%', minWidth: 0,
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '44px', left: 0, right: 0, zIndex: 9999,
          background: 'rgba(10,10,20,.92)',
          backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,.7)',
        }}>
          {results.map(c => (
            <div key={c.code} onMouseDown={() => pick(c.code)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: isCompact ? '12px' : '9px 12px', minHeight: isCompact ? '44px' : undefined,
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: isCompact ? '13px' : '11px',
              color: '#fff', borderBottom: '1px solid rgba(255,255,255,.06)',
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,.1)')}
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
  const isCompact = useIsCompact()
  // Default ~42vh (desktop) so top aligns with southern Africa / Namibia latitude;
  // mobile starts taller (58vh) since content stacks into a single column.
  // null = "no manual override yet" — falls back to the responsive default below.
  const [panelHeightOverride, setPanelHeight] = useState<number | null>(null)
  const panelHeight = panelHeightOverride ?? (isCompact ? 58 : 42)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const country = selectedCountry ? getCountryByCode(selectedCountry) : null
  const MIN_H = 18
  const MAX_H = isCompact ? 92 : 88

  // Drag handle logic — mouse (desktop) + touch (mobile) share the same math
  function beginDrag(clientY: number) {
    dragRef.current = { startY: clientY, startH: panelHeight }
  }
  function updateDrag(clientY: number) {
    if (!dragRef.current) return
    const dy = dragRef.current.startY - clientY
    const newH = dragRef.current.startH + (dy / window.innerHeight) * 100
    setPanelHeight(Math.min(MAX_H, Math.max(MIN_H, newH)))
  }
  function endDrag() {
    dragRef.current = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  }
  function onMouseMove(e: MouseEvent) { updateDrag(e.clientY) }
  function onMouseUp() { endDrag() }
  function onTouchMove(e: TouchEvent) { e.preventDefault(); updateDrag(e.touches[0].clientY) }
  function onTouchEnd() { endDrag() }

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    beginDrag(e.clientY)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
  function onDragTouchStart(e: React.TouchEvent) {
    beginDrag(e.touches[0].clientY)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  if (!drawerOpen || !country) return null

  return (
    <div className="panel-enter" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      height: `${panelHeight}vh`,
      paddingBottom: 'var(--safe-bottom)',
      background: 'rgba(10,10,20,.78)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderTop: '1px solid rgba(255,255,255,.14)',
      boxShadow: '0 -20px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top bar (contains drag handle pill inline) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isCompact ? '8px' : '10px',
        padding: isCompact ? '8px 12px' : '10px 20px',
        borderBottom: '1px solid rgba(255,255,255,.1)',
        flexShrink: 0, background: 'rgba(255,255,255,.03)',
        flexWrap: isCompact ? 'wrap' : 'nowrap',
      }}>
        <span style={{ fontSize: isCompact ? '17px' : '20px' }}>{country.flag}</span>
        <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: isCompact ? '14px' : '16px', color: '#fff' }}>{country.name}</span>
        {!isCompact && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px #7c3aed', animation: 'pulse-ring 1.8s ease-out infinite' }} />}
        {!isCompact && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#a78bfa', letterSpacing: '.1em', fontWeight: 700 }}>LIVE</span>}

        {/* ── Drag pill — inline, centred; wide touch-friendly hit area on mobile ── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', order: isCompact ? 3 : 0, width: isCompact ? '100%' : undefined }}>
          <div
            onMouseDown={onDragStart}
            onTouchStart={onDragTouchStart}
            style={{
              cursor: 'ns-resize', userSelect: 'none', touchAction: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: isCompact ? '10px 16px' : '6px 16px',
              minHeight: isCompact ? '44px' : undefined,
              width: isCompact ? '100%' : undefined,
              borderRadius: isCompact ? '12px' : '24px',
              background: 'rgba(236,72,153,.12)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1.5px solid rgba(236,72,153,.4)',
              boxShadow: '0 0 12px rgba(236,72,153,.15)',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(236,72,153,.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,.12)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(236,72,153,.15)' }}
          >
            <GripHorizontal size={13} strokeWidth={2.3} color="#fff" />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
              fontWeight: 800, color: '#fff', letterSpacing: '.14em',
            }}>DRAG TO RESIZE</span>
          </div>
        </div>

        <button onClick={closeDrawer} aria-label="Close news panel" style={{
          width: isCompact ? '40px' : '28px', height: isCompact ? '40px' : '28px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.04)',
          color: '#fff', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
        ><X size={isCompact ? 16 : 14} strokeWidth={2.3} /></button>
      </div>

      {/* ── Body: sidebar + content (sidebar collapses to a top strip on mobile) ── */}
      <div style={{ display: 'flex', flexDirection: isCompact ? 'column' : 'row', flex: 1, minHeight: 0 }}>

        {isCompact ? (
          /* ── MOBILE TOP STRIP: search + section toggle, no legend/descriptions ── */
          <div style={{
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.02)', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <SidebarSearch />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('news')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  minHeight: '44px', padding: '0 10px', borderRadius: '10px', cursor: 'pointer',
                  background: activeTab === 'news' ? 'rgba(124,58,237,.16)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${activeTab === 'news' ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.1)'}`,
                  transition: 'all .18s',
                }}
              >
                <Newspaper size={14} strokeWidth={2} color={activeTab === 'news' ? '#a78bfa' : 'rgba(255,255,255,.6)'} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10.5px', letterSpacing: '.06em', color: activeTab === 'news' ? '#a78bfa' : '#fff' }}>NEWS</span>
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  minHeight: '44px', padding: '0 10px', borderRadius: '10px', cursor: 'pointer',
                  background: activeTab === 'charts' ? 'rgba(34,197,94,.16)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${activeTab === 'charts' ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.1)'}`,
                  transition: 'all .18s',
                }}
              >
                <LineChart size={14} strokeWidth={2} color={activeTab === 'charts' ? '#4ade80' : 'rgba(255,255,255,.6)'} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10.5px', letterSpacing: '.06em', color: activeTab === 'charts' ? '#4ade80' : '#fff' }}>CHARTS</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── DESKTOP LEFT SIDEBAR ── */
          <div style={{
            width: '200px', flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.02)', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}>
            {/* Country search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '.1em', color: 'rgba(255,255,255,.45)', fontWeight: 700 }}>SWITCH COUNTRY</span>
              <SidebarSearch />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,.08)' }} />

            {/* Nav CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '.1em', color: 'rgba(255,255,255,.45)', fontWeight: 700 }}>SECTIONS</span>

              {/* Country News CTA */}
              <button
                onClick={() => setActiveTab('news')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  background: activeTab === 'news' ? 'rgba(124,58,237,.16)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${activeTab === 'news' ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.1)'}`,
                  transition: 'all .18s', textAlign: 'left',
                  boxShadow: activeTab === 'news' ? '0 0 16px rgba(124,58,237,.15)' : 'none',
                }}
              >
                <Newspaper size={15} strokeWidth={2} color={activeTab === 'news' ? '#a78bfa' : 'rgba(255,255,255,.55)'} />
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10.5px', letterSpacing: '.08em', color: activeTab === 'news' ? '#a78bfa' : '#fff' }}>COUNTRY NEWS</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8.5px', color: 'rgba(255,255,255,.45)', letterSpacing: '.04em', marginTop: '2px', fontWeight: 500 }}>Headlines · Politics · World · Finance</div>
                </div>
              </button>

              {/* Finance Charts CTA */}
              <button
                onClick={() => setActiveTab('charts')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  background: activeTab === 'charts' ? 'rgba(34,197,94,.16)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${activeTab === 'charts' ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.1)'}`,
                  transition: 'all .18s', textAlign: 'left',
                  boxShadow: activeTab === 'charts' ? '0 0 16px rgba(34,197,94,.15)' : 'none',
                }}
              >
                <LineChart size={15} strokeWidth={2} color={activeTab === 'charts' ? '#4ade80' : 'rgba(255,255,255,.55)'} />
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '10.5px', letterSpacing: '.08em', color: activeTab === 'charts' ? '#4ade80' : '#fff' }}>FINANCE CHARTS</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8.5px', color: 'rgba(255,255,255,.45)', letterSpacing: '.04em', marginTop: '2px', fontWeight: 500 }}>Gold · Silver · Sensex · Nifty · S&P · FTSE</div>
                </div>
              </button>
            </div>

            {/* Segment legend */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SEGMENTS.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <s.icon size={12} strokeWidth={2.2} color={s.color} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: '.06em' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RIGHT / MAIN CONTENT ── */}
        <div style={{ flex: 1, minWidth: 0, padding: isCompact ? '12px 14px' : '14px 18px', overflowY: 'auto' }} className="news-scroll">
          {activeTab === 'news' ? <NewsGrid /> : <FinanceChartsPanel />}
        </div>
      </div>
    </div>
  )
}
