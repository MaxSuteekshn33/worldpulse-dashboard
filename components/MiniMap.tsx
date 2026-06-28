'use client'
import { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { COUNTRIES } from '@/lib/countries'

const COLORS = ['#3b82f6', '#f97316', '#22c55e']

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3a3a5a' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050508' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d0d18' }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
]

export default function MiniMap() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    if (!apiKey) return

    const loader = new Loader({ apiKey, version: 'weekly', region: 'IN', language: 'en' })

    loader.load().then(() => {
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
        el.style.cssText = 'width:14px;height:14px;position:relative;pointer-events:none;'

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

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: '420px', background: '#0a0a0f' }} />
}
