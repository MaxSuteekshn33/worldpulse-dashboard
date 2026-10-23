'use client'
import { useEffect, useRef, useState } from 'react'
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

interface MarkerEls {
  /** The marker's own box — what the entrance sweep animates. */
  box: HTMLElement
  dot: HTMLElement
  ring: HTMLElement
  /** A one-shot ring, played when a quiet bubble gets its first reading. */
  ping: HTMLElement
  tip: HTMLElement
  name: string
  /** Milliseconds into the entrance sweep this country arrives. */
  enterDelay: number
  /** Whether this bubble currently carries a reading, so a fill can be spotted. */
  lit: boolean
  /** Where it sits, so arrow keys can move to the country actually next to it. */
  lat: number
  lng: number
}

/**
 * The marker an arrow key should move to.
 *
 * Every marker used to be its own tab stop, which put 200 of them between the
 * top of the dashboard and anything below it. The map is one stop now, and
 * moves within it the way a composite widget should: by arrow key, to the
 * nearest country in that direction rather than to the next one in the list,
 * because on a map "next" means next on screen.
 *
 * Distance along the travel axis counts double against distance across it, so
 * pressing right from France reaches Germany rather than wandering up to
 * Norway.
 */
function nextInDirection(
  from: MarkerEls,
  all: MarkerEls[],
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
): MarkerEls | null {
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight'
  const forward = key === 'ArrowRight' || key === 'ArrowUp'

  let best: MarkerEls | null = null
  let bestScore = Infinity

  for (const m of all) {
    if (m === from) continue
    const along = horizontal ? m.lng - from.lng : m.lat - from.lat
    if (forward ? along <= 0 : along >= 0) continue

    const across = horizontal ? Math.abs(m.lat - from.lat) : Math.abs(m.lng - from.lng)
    const score = Math.abs(along) + across * 2
    if (score < bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/**
 * How long the entrance sweep takes end to end.
 *
 * The bubbles used to appear in a single frame, which read as a repaint rather
 * than as the world reporting in. They now arrive west to east: the delay comes
 * from longitude, so the wave crosses the Atlantic, Europe, Asia and the
 * Pacific in that order, with a little jitter so neighbours on the same
 * meridian don't land in lockstep.
 */
const SWEEP_MS = 850

function enterDelayFor(lng: number): number {
  const west = (lng + 180) / 360
  return Math.round(west * SWEEP_MS + Math.random() * 70)
}

/** Paints one bubble for its current pulse reading. Also used for the idle state. */
function paint(els: MarkerEls, entry: PulseEntry | null, announce = false) {
  const count = entry?.count ?? 0
  const color = entry ? SEGMENT_COLOR[entry.segment] ?? IDLE_COLOR : IDLE_COLOR
  const t = tierFor(count, entry?.viaSearch)

  // A bubble that was quiet and now isn't gets a single expanding ring, so the
  // long tail filling in is visible as it happens rather than only in the
  // before-and-after.
  if (announce && entry && !els.lit) {
    els.ping.style.borderColor = color
    els.ping.classList.remove('marker-ping')
    void els.ping.offsetWidth // restart the animation rather than ignore it
    els.ping.classList.add('marker-ping')
    // Taken off again when it finishes. Left on, the class accumulated across
    // every marker that had ever been filled — invisible, since the animation
    // ends at zero opacity, but 200 stale classes is not a state to leave the
    // DOM in, and it made the live count unreadable.
    els.ping.addEventListener(
      'animationend',
      () => els.ping.classList.remove('marker-ping'),
      { once: true },
    )
  }
  els.lit = entry !== null

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
  const [tilesIn, setTilesIn] = useState(false)
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

    /**
     * Repaints every bubble the response mentions.
     *
     * `announce` is for the long-tail batches only. The first pass lights
     * around a hundred countries at once, and a hundred simultaneous rings
     * reads as a fault rather than as news arriving.
     */
    function apply(pulse: Record<string, unknown>, announce = false) {
      for (const [code, entry] of Object.entries(pulse)) {
        const els = markersRef.current.get(code)
        if (els) paint(els, entry as PulseEntry | null, announce)
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
          apply(data.pulse ?? {}, true)
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

      // Tiles can take several seconds on a cold load, and `backgroundColor`
      // only stops that being a white rectangle — it still leaves the reader
      // looking at nothing. The placeholder clears on the real signal rather
      // than a guessed timeout.
      google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        if (cancelled) return
        setTilesIn(true)

        // Bring the bubbles in only once there is a map under them; arriving
        // over a blank panel just looks like a glitch.
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        for (const els of markersRef.current.values()) {
          if (!still) els.box.style.transitionDelay = `${els.enterDelay}ms`
          els.box.style.opacity = '1'
          els.box.style.transform = 'none'
        }
      })

      COUNTRIES.forEach(country => {
        const el = document.createElement('div')
        el.style.cssText = `
          width:24px;height:24px;position:relative;cursor:pointer;
          opacity:0;transform:scale(.4);
          transition:opacity .45s ease, transform .55s cubic-bezier(.2,1.25,.4,1);
        `
        el.className = 'map-marker'
        el.setAttribute('role', 'button')
        // Roving tabindex: exactly one marker is reachable by Tab at a time.
        el.setAttribute('tabindex', markersRef.current.size === 0 ? '0' : '-1')
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
        // Sits under the dot and is invisible until a fill plays it.
        const ping = document.createElement('div')
        ping.style.cssText = `
          width:16px;height:16px;border-radius:50%;
          border:1.5px solid transparent;
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          opacity:0;pointer-events:none;z-index:1;
        `

        el.append(ping, ring, dot, tip)

        const els: MarkerEls = {
          box: el, dot, ring, ping, tip,
          name: country.name,
          enterDelay: enterDelayFor(country.lng),
          lit: false,
          lat: country.lat,
          lng: country.lng,
        }
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

        // Focus gets the same treatment as hover, so a keyboard user can see
        // and read where they are instead of inferring it from a ring.
        el.addEventListener('focus', () => {
          tip.style.display = 'block'
          dot.style.transform = 'translate(-50%,-50%) scale(1.5)'
        })
        el.addEventListener('blur', () => {
          tip.style.display = 'none'
          dot.style.transform = 'translate(-50%,-50%) scale(1)'
        })

        el.addEventListener('keydown', e => {
          const ev = e as KeyboardEvent
          if (ev.key === 'Enter' || ev.key === ' ') {
            e.preventDefault()
            open()
            return
          }
          if (
            ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' &&
            ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown'
          ) return

          // The map pans on arrow keys by default, which would fight this.
          e.preventDefault()
          e.stopPropagation()

          const here = markersRef.current.get(country.code)
          if (!here) return
          const target = nextInDirection(here, [...markersRef.current.values()], ev.key)
          if (!target) return

          here.box.setAttribute('tabindex', '-1')
          target.box.setAttribute('tabindex', '0')
          target.box.focus()
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

      <div
        aria-hidden={tilesIn}
        className="dot-grid"
        style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          background: 'var(--bg)',
          opacity: tilesIn ? 0 : 1,
          // Nothing to click through once it has faded.
          pointerEvents: 'none',
          visibility: tilesIn ? 'hidden' : 'visible',
          transition: 'opacity .5s ease, visibility .5s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <span className="shimmer" style={{
            width: '9px', height: '9px', borderRadius: '50%',
            background: 'var(--accent)',
          }} />
          <span className="mono-label" style={{ color: 'var(--text-4)' }}>
            Loading the world
          </span>
        </span>
      </div>
    </div>
  )
}
