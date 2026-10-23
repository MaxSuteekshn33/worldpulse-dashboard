'use client'
import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { COUNTRIES } from '@/lib/countries'

import { SEGMENTS } from '@/lib/segments'

const COLORS = SEGMENTS.map(s => s.color)

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#49536B' }, { weight: 1 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06060A' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Landmass is lifted well clear of the water so continents read as shapes
  // behind the hero copy rather than disappearing into the background.
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#222B3C' }] },
]

export default function MiniMap() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    if (!apiKey) return

    loadGoogleMaps(apiKey).then(() => {
      if (!ref.current) return

      const map = new google.maps.Map(ref.current, {
        center: { lat: 20, lng: 10 },
        zoom: 1.5,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        restriction: {
          latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
          strictBounds: true,
        },
      })
      mapRef.current = map

      // Add decorative bubbles
      COUNTRIES.forEach((country, i) => {
        const color = COLORS[i % COLORS.length]
        const el = document.createElement('div')
        el.style.cssText = 'width:18px;height:18px;position:relative;pointer-events:none;'

        const ring = document.createElement('div')
        ring.className = 'bubble-ring'
        ring.style.cssText = `
          width:18px;height:18px;border-radius:50%;
          border:1.5px solid ${color};
          position:absolute;top:0;left:0;
          animation-delay:${((i * 0.17) % 2.4).toFixed(2)}s;
        `
        // Layered glow: a tight halo for punch plus a wide soft bloom, so the
        // dot still reads against the dark landmass without blowing out.
        const dot = document.createElement('div')
        dot.style.cssText = `
          width:7px;height:7px;border-radius:50%;
          background:${color};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          box-shadow:0 0 0 1px rgba(255,255,255,.16),
                     0 0 7px ${color},
                     0 0 18px ${color}99;
        `
        el.appendChild(ring)
        el.appendChild(dot)

        const overlay = new google.maps.OverlayView()
        overlay.onAdd = function () {
          this.getPanes()?.overlayLayer.appendChild(el)
        }
        overlay.draw = function () {
          const proj = this.getProjection()
          if (!proj) return
          const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(country.lat, country.lng))
          if (pos) {
            el.style.position = 'absolute'
            el.style.left = `${pos.x - 7}px`
            el.style.top = `${pos.y - 7}px`
          }
        }
        overlay.onRemove = function () { el.parentNode?.removeChild(el) }
        overlay.setMap(map)
      })
    })

    return () => { mapRef.current = null }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: '420px', background: 'var(--bg)' }} />
}
