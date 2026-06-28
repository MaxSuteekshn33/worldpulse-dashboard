'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { COUNTRIES } from '@/lib/countries'

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const { selectCountry, drawerOpen } = useAppStore()

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    // Prevent Leaflet double-init on hot reload
    if ((mapContainer.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

    // Dynamically import Leaflet (browser only)
    import('leaflet').then((L) => {
      const Leaflet = L.default

      const map = Leaflet.map(mapContainer.current!, {
        center: [20, 10],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        minZoom: 1.5,
        maxZoom: 8,
        worldCopyJump: false,
      })
      mapRef.current = map

      // Dark tile layer — CartoDB Dark Matter (free, no key)
      Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Zoom control (neon styled via CSS)
      Leaflet.control.zoom({ position: 'bottomright' }).addTo(map)

      // Add pulse bubble markers for each country
      COUNTRIES.forEach(country => {
        const el = document.createElement('div')
        el.style.cssText = 'width:32px;height:32px;position:relative;cursor:pointer;'

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:32px;height:32px;border-radius:50%;
          border:1.5px solid #00e5ff;
          position:absolute;top:0;left:0;
        `

        const dot = document.createElement('div')
        dot.style.cssText = `
          width:10px;height:10px;border-radius:50%;
          background:#00e5ff;
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 10px #00e5ff;
          z-index:2;
        `

        // Tooltip
        const tooltip = document.createElement('div')
        tooltip.style.cssText = `
          position:absolute;bottom:22px;left:50%;transform:translateX(-50%);
          background:rgba(4,4,12,.95);border:1px solid rgba(0,229,255,.25);
          border-radius:5px;padding:4px 8px;
          font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.08em;
          color:#fff;white-space:nowrap;pointer-events:none;
          display:none;z-index:999;
        `
        tooltip.textContent = country.name

        el.appendChild(ring)
        el.appendChild(dot)
        el.appendChild(tooltip)

        el.addEventListener('mouseenter', () => { tooltip.style.display = 'block' })
        el.addEventListener('mouseleave', () => { tooltip.style.display = 'none' })
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          selectCountry(country.code)
        })

        const icon = Leaflet.divIcon({ html: el, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
        Leaflet.marker([country.lat, country.lng], { icon }).addTo(map)
      })

      // Map background click — do nothing (use ✕ button to close drawer)
    })

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [selectCountry])

  // Resize when drawer opens/closes
  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        ;(mapRef.current as { invalidateSize: () => void }).invalidateSize()
      }
    }, 320)
  }, [drawerOpen])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%', background: '#0a0a0f' }} />
}
