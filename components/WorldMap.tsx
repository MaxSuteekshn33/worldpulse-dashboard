'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { COUNTRIES } from '@/lib/countries'

// Segment colours
const SEGMENT_COLOR = {
  headline:    '#3b82f6', // blue
  geopolitics: '#f97316', // orange
  finance:     '#22c55e', // green
  default:     '#3b82f6', // blue fallback
}

// Fetch which segment has latest news for a country
async function fetchBubbleColor(countryCode: string): Promise<string> {
  try {
    // Try geopolitics first, then finance, then headline
    const segments = ['geopolitics', 'finance', 'headline'] as const
    const results = await Promise.all(
      segments.map(seg =>
        fetch(`/api/news?country=${countryCode}&segment=${seg}`)
          .then(r => r.json())
          .then(d => ({ seg, count: d.articles?.length || 0 }))
          .catch(() => ({ seg, count: 0 }))
      )
    )
    // Pick segment with most articles
    const top = results.sort((a, b) => b.count - a.count)[0]
    if (top.count === 0) return SEGMENT_COLOR.default
    return SEGMENT_COLOR[top.seg]
  } catch {
    return SEGMENT_COLOR.default
  }
}

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const markerColorsRef = useRef<Map<string, { dot: HTMLElement; ring: HTMLElement }>>(new Map())
  const { selectCountry, drawerOpen } = useAppStore()

  // Update bubble colours from live RSS
  const updateBubbleColors = async () => {
    // Fetch in batches of 5 to avoid hammering RSS feeds
    const batch = async (codes: string[]) => {
      for (const code of codes) {
        const color = await fetchBubbleColor(code)
        const els = markerColorsRef.current.get(code)
        if (els) {
          els.dot.style.background = color
          els.dot.style.boxShadow = `0 0 10px ${color}`
          els.ring.style.borderColor = color
        }
      }
    }
    // Split 25 countries into 5 batches of 5
    const codes = COUNTRIES.map(c => c.code)
    for (let i = 0; i < codes.length; i += 5) {
      await batch(codes.slice(i, i + 5))
    }
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if ((mapContainer.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

    import('leaflet').then((L) => {
      const Leaflet = L.default

      const map = Leaflet.map(mapContainer.current!, {
        center: [20, 10],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        minZoom: 2,
        maxZoom: 8,
        worldCopyJump: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      })
      mapRef.current = map

      Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        noWrap: true,
      }).addTo(map)

      Leaflet.control.zoom({ position: 'bottomright' }).addTo(map)

      // Add bubble markers — start blue, update to live colour after
      COUNTRIES.forEach(country => {
        const el = document.createElement('div')
        el.style.cssText = 'width:32px;height:32px;position:relative;cursor:pointer;'

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:32px;height:32px;border-radius:50%;
          border:1.5px solid ${SEGMENT_COLOR.default};
          position:absolute;top:0;left:0;
          transition: border-color .6s ease;
        `

        const dot = document.createElement('div')
        dot.style.cssText = `
          width:10px;height:10px;border-radius:50%;
          background:${SEGMENT_COLOR.default};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 10px ${SEGMENT_COLOR.default};
          z-index:2;
          transition: background .6s ease, box-shadow .6s ease;
        `

        // Tooltip — shows country name + colour legend
        const tooltip = document.createElement('div')
        tooltip.style.cssText = `
          position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
          background:rgba(4,4,12,.96);border:1px solid rgba(255,255,255,.12);
          border-radius:6px;padding:5px 10px;
          font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.08em;
          color:#fff;white-space:nowrap;pointer-events:none;
          display:none;z-index:9999;
        `
        tooltip.textContent = country.name

        el.appendChild(ring)
        el.appendChild(dot)
        el.appendChild(tooltip)

        // Store refs for colour updates
        markerColorsRef.current.set(country.code, { dot, ring })

        el.addEventListener('mouseenter', () => { tooltip.style.display = 'block' })
        el.addEventListener('mouseleave', () => { tooltip.style.display = 'none' })
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          selectCountry(country.code)
        })

        const icon = Leaflet.divIcon({ html: el, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
        Leaflet.marker([country.lat, country.lng], { icon }).addTo(map)
      })

      // Load live colours after map is ready
      setTimeout(() => updateBubbleColors(), 1000)

      // Refresh every 5 minutes
      const interval = setInterval(() => updateBubbleColors(), 5 * 60 * 1000)

      // Store interval for cleanup
      ;(map as unknown as { _colorInterval: ReturnType<typeof setInterval> })._colorInterval = interval
    })

    return () => {
      if (mapRef.current) {
        const m = mapRef.current as { remove: () => void; _colorInterval?: ReturnType<typeof setInterval> }
        if (m._colorInterval) clearInterval(m._colorInterval)
        m.remove()
        mapRef.current = null
      }
    }
  }, [selectCountry])

  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        ;(mapRef.current as { invalidateSize: () => void }).invalidateSize()
      }
    }, 320)
  }, [drawerOpen])

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0f', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {/* Colour legend */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '16px', zIndex: 10000,
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px',
        padding: '8px 14px', display: 'flex', gap: '14px', alignItems: 'center',
      }}>
        {[
          { color: '#3b82f6', label: 'HEADLINE' },
          { color: '#f97316', label: 'GEOPOLITICS' },
          { color: '#22c55e', label: 'FINANCE' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '.1em', color: 'rgba(255,255,255,.5)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
