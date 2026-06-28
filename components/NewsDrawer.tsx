'use client'
import { useAppStore, Segment } from '@/lib/store'
import { getCountryByCode } from '@/lib/countries'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'headline',    label: 'TOP' },
  { key: 'geopolitics', label: 'GEO' },
  { key: 'finance',     label: 'FIN' },
]

const SOURCE_COLORS: Record<string, string> = {
  'CNN':            '#cc0000',
  'Sky News':       '#0057b8',
  'Indian Express': '#ff6600',
}

export default function NewsDrawer() {
  const { drawerOpen, selectedCountry, selectedSegment, articles, loading, error, closeDrawer, setSegment } = useAppStore()
  const country = selectedCountry ? getCountryByCode(selectedCountry) : null

  if (!drawerOpen) return null

  return (
    <div className="drawer-enter" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      height: '172px',
      background: 'rgba(4,4,12,.96)',
      borderTop: '1px solid rgba(0,229,255,.22)',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 -8px 40px rgba(0,0,0,.7), 0 -1px 0 rgba(0,229,255,.08)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 20px 16px',
    }}>

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        {country && (
          <>
            <span style={{ fontSize: '20px' }}>{country.flag}</span>
            <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '-.01em' }}>
              {country.name}
            </span>
          </>
        )}

        {/* Segment tabs */}
        <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
          {SEGMENTS.map(s => (
            <button key={s.key} onClick={() => setSegment(s.key)} style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              fontSize: '9px', letterSpacing: '.12em',
              padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
              border: selectedSegment === s.key ? '1px solid rgba(0,229,255,.6)' : '1px solid rgba(255,255,255,.12)',
              background: selectedSegment === s.key ? 'rgba(0,229,255,.12)' : 'transparent',
              color: selectedSegment === s.key ? '#00e5ff' : 'rgba(255,255,255,.45)',
              transition: 'all .15s',
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Live badge */}
        <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e5ff', display: 'inline-block', boxShadow: '0 0 6px #00e5ff' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(0,229,255,.6)', letterSpacing: '.1em' }}>LIVE</span>
        </div>

        {/* Close */}
        <button onClick={closeDrawer} style={{
          marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.15)', background: 'transparent',
          color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>✕</button>
      </div>

      {/* Cards row */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}
           className="no-scrollbar">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(0,229,255,.5)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '.1em' }}>
            LOADING...
          </div>
        )}
        {error && (
          <div style={{ color: '#ff3b3b', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            {error}
          </div>
        )}
        {!loading && !error && articles.map(article => (
          <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer"
             style={{ textDecoration: 'none', flexShrink: 0, display: 'block' }}>
            <div style={{
              width: '220px', height: '100%', minHeight: '90px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(0,229,255,.1)',
              borderRadius: '8px', padding: '10px 12px',
              cursor: 'pointer', transition: 'border-color .18s, background .18s',
              display: 'flex', flexDirection: 'column', gap: '5px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,.35)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)' }}
            >
              {/* Source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: SOURCE_COLORS[article.source] || 'rgba(255,255,255,.4)',
                }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
                  {article.source} · {article.timeAgo}
                </span>
              </div>
              {/* Headline */}
              <div style={{
                fontFamily: 'Saira, sans-serif', fontWeight: 700, fontSize: '12px',
                lineHeight: 1.4, color: '#fff',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {article.headline}
              </div>
              {/* Read more */}
              <div style={{ marginTop: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(0,229,255,.6)', letterSpacing: '.08em' }}>
                READ MORE →
              </div>
            </div>
          </a>
        ))}
        {!loading && !error && articles.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,.3)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', alignSelf: 'center' }}>
            NO NEWS FOUND FOR THIS COUNTRY
          </div>
        )}
      </div>
    </div>
  )
}
