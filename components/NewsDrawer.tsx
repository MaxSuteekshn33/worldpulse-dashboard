'use client'
import { useRef } from 'react'
import { useAppStore, Segment } from '@/lib/store'
import { getCountryByCode } from '@/lib/countries'

const SEGMENTS: { key: Segment; label: string; color: string; glow: string }[] = [
  { key: 'headline',    label: 'HEADLINES', color: '#3b82f6', glow: 'rgba(59,130,246,.15)' },
  { key: 'politics',   label: 'POLITICS',  color: '#ec4899', glow: 'rgba(236,72,153,.15)' },
  { key: 'geopolitics', label: 'WORLD',    color: '#f97316', glow: 'rgba(249,115,22,.15)' },
  { key: 'finance',     label: 'FINANCE',  color: '#22c55e', glow: 'rgba(34,197,94,.15)' },
]

function SegmentColumn({
  seg, articles, loading, selectedSegment, onSelect, country,
}: {
  seg: typeof SEGMENTS[0]
  articles: ReturnType<typeof useAppStore.getState>['articles']
  loading: boolean
  selectedSegment: Segment
  onSelect: (s: Segment) => void
  country: string | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isActive = selectedSegment === seg.key
  const segArticles = isActive ? articles : []

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' })
  }

  return (
    <div style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Column header */}
      <button
        onClick={() => onSelect(seg.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
          background: isActive ? `${seg.color}18` : 'transparent',
          border: `1px solid ${isActive ? seg.color + '60' : 'rgba(255,255,255,.08)'}`,
          transition: 'all .2s',
          boxShadow: isActive ? `0 0 16px ${seg.glow}` : 'none',
        }}
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: seg.color, flexShrink: 0,
          boxShadow: `0 0 8px ${seg.color}`,
          animation: isActive ? 'pulse-ring 1.8s ease-out infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          fontSize: '9px', letterSpacing: '.14em',
          color: isActive ? seg.color : 'rgba(255,255,255,.4)',
          transition: 'color .2s',
        }}>{seg.label}</span>
        {isActive && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', color: 'rgba(0,229,255,.5)', letterSpacing: '.1em',
          }}>LIVE</span>
        )}
      </button>

      {/* Cards row with scroll arrows */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Left arrow */}
        <button onClick={() => scroll('left')} style={{
          flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
          color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s', flexDirection: 'column',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' }}
        >‹</button>

        {/* Scrollable cards */}
        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{ display: 'flex', gap: '10px', overflowX: 'auto', flex: 1 }}
          onClick={() => !isActive && onSelect(seg.key)}
        >
          {!isActive ? (
            // Placeholder — click to load
            <div style={{
              flexShrink: 0, width: '220px', height: '112px',
              background: 'rgba(255,255,255,.02)',
              border: `1px solid ${seg.color}20`,
              borderRadius: '10px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '18px' }}>📰</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                fontWeight: 700, color: '#fff', letterSpacing: '.1em',
              }}>CLICK TO LOAD</span>
            </div>
          ) : loading ? (
            // Shimmer cards
            [1, 2, 3].map(i => (
              <div key={i} className="shimmer" style={{
                flexShrink: 0, width: '220px', height: '112px',
                borderRadius: '10px', border: `1px solid ${seg.color}20`,
              }} />
            ))
          ) : segArticles.length === 0 ? (
            <div style={{
              flexShrink: 0, width: '220px', height: '112px',
              background: 'rgba(255,255,255,.02)',
              border: `1px solid rgba(255,255,255,.06)`,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
                color: 'rgba(255,255,255,.2)', letterSpacing: '.1em', textAlign: 'center',
              }}>NO {seg.label} NEWS<br />FOR THIS COUNTRY</span>
            </div>
          ) : (
            segArticles.map(article => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <div
                  className={`card-${seg.key === 'geopolitics' ? 'geopolitics' : seg.key}`}
                  style={{
                    width: '220px', height: '112px',
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid transparent',
                    borderRadius: '10px', padding: '11px 13px',
                    cursor: 'pointer', transition: 'all .2s',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                  }}
                >
                  {/* Source + time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: seg.color, flexShrink: 0,
                      boxShadow: `0 0 5px ${seg.color}`,
                    }} />
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
                      letterSpacing: '.08em', color: 'rgba(255,255,255,.35)',
                      textTransform: 'uppercase',
                    }}>
                      {article.source} · {article.timeAgo}
                    </span>
                  </div>

                  {/* Headline */}
                  <div style={{
                    fontFamily: 'Archivo, sans-serif', fontWeight: 700,
                    fontSize: '11.5px', lineHeight: 1.35, color: '#fff',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {article.headline}
                  </div>

                  {/* Preview description */}
                  <div style={{
                    fontFamily: 'Saira, sans-serif', fontSize: '10px',
                    lineHeight: 1.4, color: 'rgba(255,255,255,.38)',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {article.description}
                  </div>

                  {/* Read more */}
                  <div style={{
                    marginTop: 'auto',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
                    color: seg.color, letterSpacing: '.1em', opacity: .7,
                  }}>
                    READ MORE →
                  </div>
                </div>
              </a>
            ))
          )}
        </div>

        {/* Right arrow */}
        <button onClick={() => scroll('right')} style={{
          flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
          color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' }}
        >›</button>
      </div>
    </div>
  )
}

export default function NewsDrawer() {
  const { drawerOpen, selectedCountry, selectedSegment, articles, loading, closeDrawer, setSegment } = useAppStore()
  const country = selectedCountry ? getCountryByCode(selectedCountry) : null

  if (!drawerOpen || !country) return null

  return (
    <div className="panel-enter" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      background: 'rgba(6,6,14,.94)',
      backdropFilter: 'blur(28px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
      borderTop: '1px solid rgba(0,229,255,.15)',
      boxShadow: '0 -12px 60px rgba(0,0,0,.8), 0 -1px 0 rgba(0,229,255,.08)',
      padding: '14px 20px 16px',
    }}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '22px' }}>{country.flag}</span>
        <span style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 900,
          fontSize: '17px', letterSpacing: '-.01em', color: '#fff',
        }}>
          {country.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#00e5ff', display: 'inline-block',
            boxShadow: '0 0 8px #00e5ff',
            animation: 'pulse-ring 1.8s ease-out infinite',
          }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
            color: 'rgba(0,229,255,.55)', letterSpacing: '.14em',
          }}>LIVE</span>
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
          color: 'rgba(255,255,255,.2)', letterSpacing: '.1em',
          marginLeft: '4px',
        }}>· CLICK A SEGMENT TO LOAD · SCROLL CARDS →</span>

        {/* Close */}
        <button onClick={closeDrawer} style={{
          marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.12)', background: 'transparent',
          color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.4)' }}
        >✕</button>
      </div>

      {/* ── 4 segment columns ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {SEGMENTS.map(seg => (
          <SegmentColumn
            key={seg.key}
            seg={seg}
            articles={articles}
            loading={loading}
            selectedSegment={selectedSegment}
            onSelect={setSegment}
            country={selectedCountry}
          />
        ))}
      </div>
    </div>
  )
}
