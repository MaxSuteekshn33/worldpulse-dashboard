'use client'
import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'

/** Non-interactive dark map of one country, used as the country-page hero backdrop. */
const BACKDROP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0B11' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7489' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4D5A72' }, { weight: 1.2 }] },
  { featureType: 'administrative.country', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#20242E' }] },
  { featureType: 'administrative.province', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#5C6476' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06060A' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1C2331' }] },
]

interface Props { lat: number; lng: number; zoom: number }

export default function CountryMapBg({ lat, lng, zoom }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const made = useRef(false)

  useEffect(() => {
    if (!ref.current || made.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    if (!apiKey) return

    made.current = true
    let cancelled = false

    loadGoogleMaps(apiKey).then(() => {
      if (!ref.current || cancelled) return
      new google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom,
        styles: BACKDROP_STYLE,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        clickableIcons: false,
        isFractionalZoomEnabled: true,
      })
    })

    return () => { cancelled = true }
  }, [lat, lng, zoom])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}
    />
  )
}
