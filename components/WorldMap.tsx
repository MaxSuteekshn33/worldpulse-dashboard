'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { COUNTRIES } from '@/lib/countries'
import { SEGMENTS, type Segment } from '@/lib/segments'
// Type-only: erased at compile time, so the news pipeline never reaches the client bundle.
import type { PulseEntry } from '@/lib/news'

const SEGMENT_COLOR = Object.fromEntries(
  SEGMENTS.map(s => [s.id, s.color]),
) as Record<Segment, string>

const SEGMENT_LABEL = Object.fromEntries(
  SEGMENTS.map(s => [s.id, s.label]),
) as Record<Segment, string>

const IDLE_COLOR = '#6B7389'

/**
 * How a bubble is drawn, by how much coverage the country has right now.
 *
 * Every bubble used to be the same 8px dot inside the same animated 24px ring,
 * so 200 countries rendered as one undifferentiated field of pulsing circles —
 * and the ~half with no wire coverage at that moment shouted exactly as loudly
 * as the half that did. Size, glow and animation now all carry the signal:
 * quiet countries recede, busy ones pulse.
 */
interface Tier {
  dot: number
  ring: number
  ringAlpha: string
  pulse: boolean
}

const TIERS: Record<'quiet' | 'active' | 'hot', Tier> = {
  quiet:  { dot: 4.5, ring: 0,  ringAlpha: '00', pulse: false },
  active: { dot: 7,   ring: 17, ringAlpha: '66', pulse: false },
  hot:    { dot: 9,   ring: 23, ringAlpha: '99', pulse: true  },
}

/**
 * The two halves of the map are not on the same scale.
 *
 * A curated count is a share of a few hundred wire stories, so 4+ really does
 * mean "a lot is happening here". A search count is a share of the ~100 items
 * Google returns for any country that exists, so it clears 4 for everywhere
 * from Luxembourg to Tuvalu. Ranked together, the long tail would outshout the
 * countries actually leading the news.
 *
 * So the pulsing `hot` tier stays reserved for the wires. A search reading says
 * "there is coverage here, and it leans this way", which is `active` — a solid
 * dot and a ring, no animation.
 */
function tierFor(count: number, viaSearch = false): Tier {
  if (count >= 4 && !viaSearch) return TIERS.hot
  if (count >= 1) return TIERS.active
  return TIERS.quiet
}

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

interface MarkerEls { dot: HTMLElement; ring: HTMLElement; tip: HTMLElement; name: string }

/** Paints one bubble for its current pulse reading. Also used for the idle state. */
function paint(els: MarkerEls, entry: PulseEntry | null) {
  const count = entry?.count ?? 0
  const color = entry ? SEGMENT_COLOR[entry.segment] ?? IDLE_COLOR : IDLE_COLOR
  const t = tierFor(count, entry?.viaSearch)

  els.dot.style.width = `${t.dot}px`
  els.dot.style.height = `${t.dot}px`
  els.dot.style.background = color
  els.dot.style.opacity = entry ? '1' : '.55'
  els.dot.style.boxShadow = entry
    ? `0 0 0 1px rgba(255,255,255,.18), 0 0 ${t.dot}px ${color}, 0 0 ${t.dot * 2.4}px ${color}66`
    : 'none'

  els.ring.style.width = `${t.ring}px`
  els.ring.style.height = `${t.ring}px`
  els.ring.style.borderColor = `${color}${t.ringAlpha}`
  els.ring.style.opacity = t.ring ? '1' : '0'
  els.ring.classList.toggle('bubble-ring', t.pulse)

  els.tip.textContent = entry
    ? `${els.name} · ${entry.total} ${entry.total === 1 ? 'story' : 'stories'} · ${SEGMENT_LABEL[entry.segment]}`
    : `${els.name} · quiet right now`
}

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

    /** Repaints every bubble the response mentions. */
    function apply(pulse: Record<string, unknown>) {
      for (const [code, entry] of Object.entries(pulse)) {
        const els = markersRef.current.get(code)
        if (els) paint(els, entry as PulseEntry | null)
      }
    }

    /**
     * Second pass, for the countries the curated wires don't reach.
     *
     * These used to stay grey for good: the pulse read only the 15 curated
     * newsrooms while the country pages read those plus a per-country search,
     * so the map called half the world quiet while the pages behind those
     * bubbles were full. Asking for all of them at once is what made that
     * trade-off look necessary — Google refuses a 200-wide burst of searches
     * outright. In batches it answers, each batch is cached server-side for
     * the usual 20 minutes, and the map fills in as they land.
     */
    async function fillQuiet(codes: string[], batchSize: number) {
      for (let i = 0; i < codes.length; i += batchSize) {
        if (cancelled) return
        try {
          const batch = codes.slice(i, i + batchSize)
          const res = await fetch(`/api/pulse?codes=${batch.join(',')}`)
          if (!res.ok) continue
          const data = await res.json()
          if (cancelled) return
          apply(data.pulse ?? {})
        } catch { /* leave this batch as it is and keep going */ }
      }
    }

    /** One request for the wire-covered half, then the long tail in batches. */
    async function refreshPulse() {
      try {
        const res = await fetch('/api/pulse')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const pulse: Record<string, unknown> = data.pulse ?? {}
        apply(pulse)

        const quiet = Object.keys(pulse).filter(code => !pulse[code])
        if (quiet.length > 0) await fillQuiet(quiet, data.batchSize ?? 10)
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
        // Painted under the tiles. Without it Google's own default is white, so
        // every cold load flashed a full-bleed white rectangle behind the dark
        // hero copy until the first tile landed — which read as a broken map.
        backgroundColor: '#0B0B11',
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
        el.style.cssText = 'width:24px;height:24px;position:relative;cursor:pointer;'
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
        el.setAttribute('aria-label', `${country.name} — open news`)

        // Ring and dot are both centred on the marker box so a tier change
        // grows them from the middle rather than nudging the country off-mark.
        const ring = document.createElement('div')
        ring.style.cssText = `
          border-radius:50%;border:1.5px solid transparent;
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          transition:width .5s ease,height .5s ease,border-color .5s ease,opacity .5s ease;
        `
        const dot = document.createElement('div')
        dot.style.cssText = `
          border-radius:50%;
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          z-index:2;
          transition:width .5s ease,height .5s ease,background .5s ease,
                     box-shadow .5s ease,opacity .5s ease,transform .18s ease;
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
        el.append(ring, dot, tip)

        const els: MarkerEls = { dot, ring, tip, name: country.name }
        paint(els, null)
        markersRef.current.set(country.code, els)

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
            el.style.left = `${pos.x - 12}px`
            el.style.top = `${pos.y - 12}px`
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
