'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS, type Segment } from '@/lib/segments'

const SEGMENT_COLOR = Object.fromEntries(
  SEGMENTS.map(s => [s.id, s.color]),
) as Record<Segment, string>

const IDLE_COLOR = '#4C4C5E'

/** Dark map styling — softened from the old high-contrast cyberpunk preset. */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C5C72' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2E3340' }, { weight: 0.9 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#7A8090' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'administrative.province', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06060A' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#121620' }] },
]

interface MarkerEls { dot: HTMLElement; ring: HTMLElement }

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerEls>>(new Map())
  const router = useRouter()

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    if (!apiKey) { console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY'); return }

    const markers = markersRef.current
    let refreshTimer: ReturnType<typeof setInterval> | undefined
    let cancelled = false

    /** One request for every country, then recolour each bubble. */
    async function refreshPulse() {
      try {
        const res = await fetch('/api/pulse')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        for (const [code, entry] of Object.entries(data.pulse ?? {})) {
          const els = markersRef.current.get(code)
          if (!els) continue
          const seg = (entry as { segment?: Segment } | null)?.segment
          const color = seg ? SEGMENT_COLOR[seg] ?? IDLE_COLOR : IDLE_COLOR
          els.dot.style.background = color
          els.dot.style.boxShadow = `0 0 8px ${color}`
          els.ring.style.borderColor = color
        }
      } catch { /* keep last known colours */ }
    }

    loadGoogleMaps(apiKey).then(() => {
      if (!mapContainer.current || cancelled) return

      const map = new google.maps.Map(mapContainer.current, {
        center: { lat: 25, lng: 12 },
        zoom: 2.4,
        minZoom: 2,
        maxZoom: 7,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: 'greedy',
        restriction: {
          latLngBounds: { north: 83, south: -60, west: -180, east: 180 },
          strictBounds: true,
        },
      })
      mapRef.current = map

      COUNTRIES.forEach(country => {
        const el = document.createElement('div')
        el.style.cssText = 'width:22px;height:22px;position:relative;cursor:pointer;'
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
        el.setAttribute('aria-label', `${country.name} — open news`)

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:22px;height:22px;border-radius:50%;
          border:1px solid ${IDLE_COLOR};
          position:absolute;top:0;left:0;
          transition:border-color .5s ease;
        `
        const dot = document.createElement('div')
        dot.style.cssText = `
          width:7px;height:7px;border-radius:50%;
          background:${IDLE_COLOR};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 8px ${IDLE_COLOR};
          z-index:2;
          transition:background .5s ease,box-shadow .5s ease,transform .18s ease;
        `
        const tip = document.createElement('div')
        tip.style.cssText = `
          position:absolute;bottom:28px;left:50%;transform:translateX(-50%);
          background:rgba(10,10,16,.97);border:1px solid rgba(255,255,255,.14);
          border-radius:7px;padding:6px 11px;
          font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:600;
          letter-spacing:-.01em;color:#F4F6F8;white-space:nowrap;pointer-events:none;
          display:none;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.6);
        `
        tip.textContent = country.name

        el.append(ring, dot, tip)
        markersRef.current.set(country.code, { dot, ring })

        const open = () => router.push(`/country/${country.code}`)

        el.addEventListener('mouseenter', () => {
          tip.style.display = 'block'
          dot.style.transform = 'translate(-50%,-50%) scale(1.5)'
        })
        el.addEventListener('mouseleave', () => {
          tip.style.display = 'none'
          dot.style.transform = 'translate(-50%,-50%) scale(1)'
        })
        el.addEventListener('click', e => { e.stopPropagation(); open() })
        el.addEventListener('keydown', e => {
          const key = (e as KeyboardEvent).key
          if (key === 'Enter' || key === ' ') { e.preventDefault(); open() }
        })

        const overlay = new google.maps.OverlayView()
        overlay.onAdd = function () {
          this.getPanes()?.overlayMouseTarget.appendChild(el)
        }
        overlay.draw = function () {
          const proj = this.getProjection()
          if (!proj) return
          const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(country.lat, country.lng))
          if (pos) {
            el.style.position = 'absolute'
            el.style.left = `${pos.x - 11}px`
            el.style.top = `${pos.y - 11}px`
          }
        }
        overlay.onRemove = function () { el.parentNode?.removeChild(el) }
        overlay.setMap(map)
      })

      refreshPulse()
      refreshTimer = setInterval(refreshPulse, 20 * 60 * 1000)
    })

    return () => {
      cancelled = true
      if (refreshTimer) clearInterval(refreshTimer)
      markers.clear()
      mapRef.current = null
    }
  }, [router])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
