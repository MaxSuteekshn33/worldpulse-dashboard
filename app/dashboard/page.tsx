'use client'
import dynamic from 'next/dynamic'
import NewsDrawer from '@/components/NewsDrawer'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

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
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
          color: 'rgba(255,255,255,.2)', letterSpacing: '.12em',
        }}>
          CLICK ANY COUNTRY TO LOAD NEWS
        </span>
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
