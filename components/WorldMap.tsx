'use client'
import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { useAppStore } from '@/lib/store'
import { COUNTRIES } from '@/lib/countries'

const SEGMENT_COLOR = {
  headline:    '#3b82f6',
  politics:   '#ec4899',
  geopolitics: '#f97316',
  finance:     '#22c55e',
  default:     '#3b82f6',
}

// Google Maps dark cyberpunk style
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a4a6a' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }, { weight: 0.8 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1e1e2e' }] },
  { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a5a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050508' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a1a3a' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d0d18' }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
]

async function fetchBubbleColor(countryCode: string): Promise<string> {
  try {
    const segments = ['headline', 'politics', 'geopolitics', 'finance'] as const
    const results = await Promise.all(
      segments.map(seg =>
        fetch(`/api/news?country=${countryCode}&segment=${seg}`)
          .then(r => r.json())
          .then(d => ({ seg, count: d.articles?.length || 0 }))
          .catch(() => ({ seg, count: 0 }))
      )
    )
    const top = results.sort((a, b) => b.count - a.count)[0]
    if (top.count === 0) return '#2a2a3a' // faint grey — no news found
    return SEGMENT_COLOR[top.seg]
  } catch {
    return '#2a2a3a'
  }
}

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerColorsRef = useRef<Map<string, { dot: HTMLElement; ring: HTMLElement }>>(new Map())
  const { selectCountry, drawerOpen } = useAppStore()

  const updateBubbleColors = async () => {
    const codes = COUNTRIES.map(c => c.code)
    for (let i = 0; i < codes.length; i += 5) {
      const batch = codes.slice(i, i + 5)
      await Promise.all(batch.map(async code => {
        const color = await fetchBubbleColor(code)
        const els = markerColorsRef.current.get(code)
        if (els) {
          els.dot.style.background = color
          els.dot.style.boxShadow = `0 0 10px ${color}`
          els.ring.style.borderColor = color
        }
      }))
    }
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    if (!apiKey) { console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY'); return }

    loadGoogleMaps(apiKey).then(() => {
      if (!mapContainer.current) return

      const map = new google.maps.Map(mapContainer.current, {
        center: { lat: 20, lng: 10 },
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 10,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: 'greedy',
        restriction: {
          latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
          strictBounds: true,
        },
      })
      mapRef.current = map

      // Add pulse bubble markers
      COUNTRIES.forEach(country => {
        const el = document.createElement('div')
        el.style.cssText = 'width:20px;height:20px;position:relative;cursor:pointer;'

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:20px;height:20px;border-radius:50%;
          border:1px solid ${SEGMENT_COLOR.default};
          position:absolute;top:0;left:0;
          transition:border-color .6s ease;
        `
        const dot = document.createElement('div')
        dot.style.cssText = `
          width:6px;height:6px;border-radius:50%;
          background:${SEGMENT_COLOR.default};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 7px ${SEGMENT_COLOR.default};
          z-index:2;
          transition:background .6s ease,box-shadow .6s ease;
        `
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

        markerColorsRef.current.set(country.code, { dot, ring })

        el.addEventListener('mouseenter', () => { tooltip.style.display = 'block' })
        el.addEventListener('mouseleave', () => { tooltip.style.display = 'none' })
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          selectCountry(country.code)
        })

        new google.maps.OverlayView()

        // Use OverlayView to place HTML element on map
        const overlay = new google.maps.OverlayView()
        overlay.onAdd = function () {
          const pane = this.getPanes()?.overlayMouseTarget
          pane?.appendChild(el)
        }
        overlay.draw = function () {
          const proj = this.getProjection()
          if (!proj) return
          const pos = proj.fromLatLngToDivPixel(
            new google.maps.LatLng(country.lat, country.lng)
          )
          if (pos) {
            el.style.position = 'absolute'
            el.style.left = `${pos.x - 10}px`
            el.style.top = `${pos.y - 10}px`
          }
        }
        overlay.onRemove = function () {
          el.parentNode?.removeChild(el)
        }
        overlay.setMap(map)
      })

      // India overlay labels
      import('@/components/IndiaOverlay').then(({ addIndiaOverlayGoogle }) => {
        addIndiaOverlayGoogle({ map })
      })

      // Load live colours
      setTimeout(() => updateBubbleColors(), 1000)
      const interval = setInterval(() => updateBubbleColors(), 5 * 60 * 1000)
      ;(map as unknown as { _colorInterval: ReturnType<typeof setInterval> })._colorInterval = interval
    })

    return () => {
      if (mapRef.current) {
        const m = mapRef.current as unknown as { _colorInterval?: ReturnType<typeof setInterval> }
        if (m._colorInterval) clearInterval(m._colorInterval)
        mapRef.current = null
      }
    }
  }, [selectCountry])

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => google.maps.event.trigger(mapRef.current!, 'resize'), 320)
    }
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
          { color: '#3b82f6', label: 'HEADLINES' },
          { color: '#ec4899', label: 'POLITICS' },
          { color: '#f97316', label: 'WORLD' },
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
