'use client'
import dynamic from 'next/dynamic'
import NewsDrawer from '@/components/NewsDrawer'

// Dynamically import map (no SSR — Mapbox needs browser APIs)
const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>

      {/* Top-left HUD label */}
      <div style={{
        position: 'absolute', top: '20px', left: '24px', zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '18px',
          color: '#fff', letterSpacing: '-.02em',
        }}>
          WORLD<span style={{ color: '#00e5ff' }}>PULSE</span>
        </span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
          color: 'rgba(0,229,255,.5)', letterSpacing: '.18em', textTransform: 'uppercase',
          borderLeft: '1px solid rgba(0,229,255,.2)', paddingLeft: '10px',
        }}>
          Live News Intelligence
        </span>
      </div>

      {/* Hint label */}
      <div style={{
        position: 'absolute', top: '20px', right: '80px', zIndex: 50,
        fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
        color: 'rgba(255,255,255,.25)', letterSpacing: '.12em',
      }}>
        CLICK ANY COUNTRY TO LOAD NEWS
      </div>

      {/* Map — full screen */}
      <div style={{ width: '100%', height: '100%' }}>
        <WorldMap />
      </div>

      {/* Bottom news drawer */}
      <NewsDrawer />
    </main>
  )
}
