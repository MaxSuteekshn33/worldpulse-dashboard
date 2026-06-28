'use client'
import { useEffect } from 'react'

// Approximate Line of Control coordinates (India's claimed boundary)
// Running N→S from Siachen area down to the international border
const LOC_COORDS: [number, number][] = [
  [36.8, 76.8],  // Siachen / AGPL north
  [36.2, 77.1],
  [35.9, 76.9],
  [35.6, 76.6],  // Saltoro Ridge
  [35.3, 76.2],
  [35.1, 75.9],  // near Skardu
  [34.8, 75.4],
  [34.5, 74.8],  // Kargil sector
  [34.1, 74.4],
  [33.8, 74.2],  // Uri sector
  [33.4, 74.0],
  [33.1, 73.9],
  [32.7, 74.0],  // Poonch / Rajouri
  [32.5, 74.1],  // meets international border near Sialkot
]

// Custom label positions
const LABELS = [
  {
    lat: 34.0,
    lng: 73.5,
    text: 'POK',
    subtext: '(Pak. Occupied Kashmir)',
    color: '#f97316',
  },
  {
    lat: 36.0,
    lng: 74.3,
    text: 'GILGIT-BALTISTAN',
    subtext: '(Pak. Occupied Territory)',
    color: '#f97316',
  },
  {
    lat: 33.8,
    lng: 76.2,
    text: 'JAMMU & KASHMIR',
    subtext: '(India)',
    color: '#00e5ff',
  },
]

interface IndiaOverlayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Leaflet: any
}

export function addIndiaOverlay({ map, Leaflet }: IndiaOverlayProps) {
  Leaflet.polyline(LOC_COORDS, {
    color: '#00e5ff', weight: 1.5, opacity: 0.7, dashArray: '6, 5', lineJoin: 'round',
  }).addTo(map).bindTooltip("Line of Control (India's claimed boundary)", {
    permanent: false, direction: 'top', className: 'loc-tooltip',
  })

  LABELS.forEach(({ lat, lng, text, subtext, color }) => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;user-select:none;'
    el.innerHTML = `
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:8px;letter-spacing:.1em;color:${color};text-shadow:0 0 8px ${color}80;white-space:nowrap;">${text}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(255,255,255,.4);white-space:nowrap;">${subtext}</span>
    `
    const icon = Leaflet.divIcon({ html: el, className: '', iconAnchor: [0, 0] })
    Leaflet.marker([lat, lng], { icon, interactive: false, zIndexOffset: 1000 }).addTo(map)
  })
}

// ── Google Maps version ──────────────────────────────────────
export function addIndiaOverlayGoogle({ map }: { map: google.maps.Map }) {
  // Dashed Line of Control
  new google.maps.Polyline({
    path: LOC_COORDS.map(([lat, lng]) => ({ lat, lng })),
    geodesic: true,
    strokeColor: '#00e5ff',
    strokeOpacity: 0,
    strokeWeight: 0,
    icons: [{
      icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, strokeColor: '#00e5ff', scale: 2 },
      offset: '0',
      repeat: '12px',
    }],
    map,
  })

  // Custom label overlays
  LABELS.forEach(({ lat, lng, text, subtext, color }) => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;user-select:none;'
    el.innerHTML = `
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:8px;letter-spacing:.1em;color:${color};text-shadow:0 0 8px ${color}80;white-space:nowrap;">${text}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(255,255,255,.4);white-space:nowrap;">${subtext}</span>
    `

    const overlay = new google.maps.OverlayView()
    overlay.onAdd = function () {
      const pane = this.getPanes()?.overlayLayer
      pane?.appendChild(el)
    }
    overlay.draw = function () {
      const proj = this.getProjection()
      if (!proj) return
      const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng))
      if (pos) {
        el.style.position = 'absolute'
        el.style.left = `${pos.x}px`
        el.style.top = `${pos.y}px`
      }
    }
    overlay.onRemove = function () { el.parentNode?.removeChild(el) }
    overlay.setMap(map)
  })
}
