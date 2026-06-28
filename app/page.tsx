'use client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false })

const PULSES = [
  { color: '#3b82f6', glow: 'rgba(59,130,246,.35)', label: 'Top News',     desc: 'Breaking headlines from CNN, Sky News & Indian Express' },
  { color: '#f97316', glow: 'rgba(249,115,22,.35)',  label: 'Geopolitics',  desc: 'Diplomacy, conflict, elections & global affairs' },
  { color: '#22c55e', glow: 'rgba(34,197,94,.35)',   label: 'Economics',    desc: 'Markets, business, trade & financial news' },
]

export default function Landing() {
  const router = useRouter()

  return (
    <main style={{
      width: '100vw', height: '100vh',
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Background radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,229,255,.04) 0%, transparent 70%)',
      }} />

      {/* Dot grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(0,229,255,.08) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        opacity: .4,
      }} />

      {/* Main card row */}
      <div style={{
        display: 'flex', gap: '32px', alignItems: 'stretch',
        width: '100%', maxWidth: '1000px', padding: '0 32px',
        zIndex: 1,
      }}>

        {/* LEFT — Mini map card */}
        <div style={{
          flex: '1.1', minHeight: '420px',
          borderRadius: '20px', overflow: 'hidden',
          border: '1px solid rgba(0,229,255,.15)',
          boxShadow: '0 0 40px rgba(0,229,255,.07), 0 20px 60px rgba(0,0,0,.6)',
          position: 'relative',
        }}>
          <MiniMap />
          {/* Overlay label */}
          <div style={{
            position: 'absolute', top: '14px', left: '16px', zIndex: 10,
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            letterSpacing: '.14em', color: 'rgba(0,229,255,.6)',
            background: 'rgba(0,0,0,.6)', padding: '4px 10px', borderRadius: '4px',
            border: '1px solid rgba(0,229,255,.15)',
          }}>
            LIVE · 25 COUNTRIES
          </div>
        </div>

        {/* RIGHT — Info panel */}
        <div style={{
          flex: '1', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: '28px', padding: '8px 0',
        }}>

          {/* Kicker */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            letterSpacing: '.22em', color: 'rgba(0,229,255,.5)',
            textTransform: 'uppercase',
          }}>
            Real-time · CNN · Sky News · Indian Express
          </div>

          {/* Headline */}
          <div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900,
              fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: 1.05,
              color: '#fff', letterSpacing: '-.02em', textTransform: 'uppercase',
            }}>
              Live News<br />
              <span style={{ color: '#00e5ff' }}>Intelligence</span>
            </div>
            <div style={{
              fontFamily: 'Saira, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,.4)', marginTop: '10px', lineHeight: 1.6,
            }}>
              Click any country on the map to instantly surface<br />
              live news filtered by segment.
            </div>
          </div>

          {/* Pulse legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PULSES.map(({ color, glow, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Animated pulse dot */}
                <div style={{ position: 'relative', width: '20px', height: '20px', flexShrink: 0 }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `1.5px solid ${color}`,
                    animation: 'pulse-ring 1.8s ease-out infinite',
                  }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: color, boxShadow: `0 0 10px ${glow}`,
                  }} />
                </div>
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                    fontSize: '11px', letterSpacing: '.1em', color,
                    textTransform: 'uppercase',
                  }}>{label}</div>
                  <div style={{
                    fontFamily: 'Saira, sans-serif', fontSize: '11px',
                    color: 'rgba(255,255,255,.35)', marginTop: '2px',
                  }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sub hint */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
            color: 'rgba(255,255,255,.2)', letterSpacing: '.1em',
          }}>
            SELECT ANY COUNTRY ON THE MAP TO READ THE NEWS
          </div>
        </div>
      </div>

      {/* CTA — bottom centre */}
      <div style={{
        position: 'absolute', bottom: '40px', left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 800,
            fontSize: '11px', letterSpacing: '.18em', textTransform: 'uppercase',
            color: '#00e5ff',
            background: 'transparent',
            border: '1.5px solid rgba(0,229,255,.5)',
            borderRadius: '2px',
            padding: '14px 40px',
            cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
            transition: 'color .2s, border-color .2s, box-shadow .2s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget
            b.style.color = '#fff'
            b.style.borderColor = '#00e5ff'
            b.style.boxShadow = '0 0 24px rgba(0,229,255,.25)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget
            b.style.color = '#00e5ff'
            b.style.borderColor = 'rgba(0,229,255,.5)'
            b.style.boxShadow = 'none'
          }}
        >
          ▶ &nbsp; TRACK NEWS LIVE
        </button>
      </div>

    </main>
  )
}
