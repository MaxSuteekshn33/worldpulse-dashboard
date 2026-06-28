'use client'
import { useEffect, useRef } from 'react'
import { COUNTRIES } from '@/lib/countries'

const COLORS = ['#3b82f6', '#f97316', '#22c55e']

export default function MiniMap() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    if ((ref.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

    import('leaflet').then((L) => {
      const Leaflet = L.default

      const map = Leaflet.map(ref.current!, {
        center: [20, 10],
        zoom: 1.5,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        touchZoom: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      })
      mapRef.current = map

      Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        noWrap: true,
      }).addTo(map)

      // Add decorative pulse bubbles
      COUNTRIES.forEach((country, i) => {
        const color = COLORS[i % COLORS.length]
        const el = document.createElement('div')
        el.style.cssText = 'width:14px;height:14px;position:relative;'

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:14px;height:14px;border-radius:50%;
          border:1px solid ${color};
          position:absolute;top:0;left:0;
          animation-delay:${(i * 0.15) % 1.8}s;
        `
        const dot = document.createElement('div')
        dot.style.cssText = `
          width:5px;height:5px;border-radius:50%;
          background:${color};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 6px ${color};
        `
        el.appendChild(ring)
        el.appendChild(dot)

        const icon = Leaflet.divIcon({ html: el, className: '', iconSize: [14, 14], iconAnchor: [7, 7] })
        Leaflet.marker([country.lat, country.lng], { icon }).addTo(map)
      })
    })

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: '420px', background: '#0a0a0f' }} />
}
