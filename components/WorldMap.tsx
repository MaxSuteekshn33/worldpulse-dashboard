'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
// `Map` is aliased: this file is full of the JavaScript one.
import { Globe as GlobeIcon, Map as MapIcon } from 'lucide-react'
import { useIsCompact } from '@/lib/useMediaQuery'
import { useSoftNav } from '@/components/NavTransition'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { loadTerrain } from '@/lib/globe'
import { CHOKEPOINTS } from '@/lib/chokepoints'
import type { Layer } from '@/components/LayerTabs'
import type { ChokepointReading } from '@/lib/shipping'
import type { Vessel } from '@/lib/vessels'
import { type Trails, createVesselOverlay, drawTrails, drawVessels, extendTrails } from '@/lib/vesselLayer'
import {
  type ChokeMarker,
  type LanePolyline,
  type LaneRef,
  createChokeMarkers,
  createLanePolylines,
  drawLanesOnGlobe,
  highlightLane,
  paintChoke,
  pickLaneAt,
} from '@/lib/shippingLayer'
import { LANES } from '@/lib/lanes'
import { describeLane } from '@/lib/laneInfo'
import { ChokepointDetail, LaneDetail, ShipDetail } from '@/components/SeaDetail'
import { type GlobeView, createGlobeView } from '@/lib/globeView'
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

/** What a marker's own entrance and hover animate. Restored when it goes back
 *  to the flat map, because on the globe a transform transition would smear
 *  every bubble behind the turn. */
const MARKER_TRANSITION = 'opacity .45s ease, transform .55s cubic-bezier(.2,1.25,.4,1)'

/**
 * Pixels of canvas behind the globe.
 *
 * Only the disc inside it is ever drawn — about a third of this — and every
 * frame is a pass over all of those, so this is the knob that decides how
 * sharp the globe is against how much it costs to sit on.
 */
const GLOBE_PIXELS = 360_000

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

export default function WorldMap({ layer = 'news' }: { layer?: Layer }) {
  const [tilesIn, setTilesIn] = useState(false)
  const [view, setView] = useState<'map' | 'globe'>('map')
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerEls>>(new Map())
  // The two renderings of the same markers, and which one currently has them.
  const globeCanvas = useRef<HTMLCanvasElement>(null)
  const globeStage = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeView | null>(null)
  const paneRef = useRef<HTMLElement | null>(null)
  const viewRef = useRef<'map' | 'globe'>('map')
  const busyRef = useRef(false)
  // The shipping layer, built the first time it is asked for and kept after.
  const layerRef = useRef<Layer>(layer)
  const chokeRef = useRef<Map<string, ChokeMarker>>(new Map())
  const lanesRef = useRef<LanePolyline[]>([])
  const shippingRef = useRef(false)
  const vesselsRef = useRef<Vessel[]>([])
  const vesselOverlayRef = useRef<(google.maps.OverlayView & { redraw: () => void }) | null>(null)
  // Only the summary is state: it changes once a capture, not once a ship.
  const [fleet, setFleet] = useState<{ count: number; configured: boolean } | null>(null)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [readings, setReadings] = useState<Map<string, ChokepointReading>>(new Map())
  const [picked, setPicked] = useState<
    | { kind: 'choke'; id: string }
    | { kind: 'ship'; mmsi: number }
    | { kind: 'lane'; ref: LaneRef }
    | null
  >(null)
  const trailsRef = useRef<Trails>(new Map())
  const capturedRef = useRef(0)
  // Read inside the draw loops, which must not be rebuilt when it changes —
  // mirrored through a ref rather than captured, and synced after the render
  // rather than during it.
  const pickedRef = useRef(picked)
  useEffect(() => {
    pickedRef.current = picked
    highlightLane(lanesRef.current, picked?.kind === 'lane' ? picked.ref : null)
    globeRef.current?.refresh()
  }, [picked])
  const router = useRouter()
  const isCompact = useIsCompact()
  // Stable: NavTransition memoises it on the router, so naming it as a
  // dependency below doesn't rebuild 200 markers.
  const navigate = useSoftNav()

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

        const href = `/country/${country.code}`
        const open = () => navigate(href)

        // Start the country page the moment a pointer settles on the bubble.
        // Only five countries are prerendered; the rest render on demand, and
        // measured cold that is a second or two. Warming it on hover moves
        // that wait into the time someone spends aiming, so the click itself
        // has nothing left to wait for. Once per marker — prefetch is cached,
        // but re-asking on every mouseenter is noise.
        let warmed = false
        const warm = () => {
          if (warmed) return
          warmed = true
          router.prefetch(href)
        }

        el.addEventListener('mouseenter', () => {
          warm()
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
          warm()
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
          const pane = this.getPanes()?.overlayMouseTarget
          if (!pane) return
          // Remembered so the markers can be handed back after a spell on the
          // globe. They are moved between parents, never rebuilt: the pulse
          // has been colouring these exact nodes since the page loaded.
          paneRef.current = pane as HTMLElement
          pane.appendChild(el)
        }
        overlay.draw = function () {
          // While the globe has them, their position is its business.
          if (viewRef.current === 'globe') return
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
  }, [router, navigate])

  // Freed on unmount: the lookup tables are several megabytes, and the
  // dashboard is left and come back to all session.
  useEffect(() => () => {
    globeRef.current?.destroy()
    globeRef.current = null
  }, [])

  /** Built the first time the globe is asked for, then kept. */
  async function ensureGlobe(): Promise<GlobeView | null> {
    if (globeRef.current) return globeRef.current
    const canvas = globeCanvas.current
    const stage = globeStage.current
    if (!canvas || !stage) return null

    let terrain
    try { terrain = await loadTerrain('/world-terrain.webp') } catch { return null }

    const rect = stage.getBoundingClientRect()
    const fit = Math.min(1, Math.sqrt(GLOBE_PIXELS / Math.max(1, rect.width * rect.height)))
    canvas.width = Math.max(320, Math.round(rect.width * fit))
    canvas.height = Math.max(240, Math.round(rect.height * fit))

    globeRef.current = createGlobeView({
      canvas,
      stage,
      terrain,
      fit,
      markers: new Map(markersRef.current),
      // Read through the ref rather than captured, so switching layers does
      // not mean rebuilding the globe.
      drawOverlay: (ctx, project, radius) => {
        if (layerRef.current !== 'shipping') return
        const lane = pickedRef.current?.kind === 'lane' ? pickedRef.current.ref : null
        drawLanesOnGlobe(ctx, project, radius, lane)
        const place = (lat: number, lon: number) => {
          const p = project(lat, lon)
          return p.front ? p : null
        }
        const scale = Math.max(0.55, radius / 240)
        const hours = capturedRef.current
          ? (Date.now() - capturedRef.current) / 3_600_000
          : 0
        drawTrails(ctx, place, trailsRef.current, scale)
        const sel = pickedRef.current
        drawVessels(ctx, place, vesselsRef.current, scale, hours,
          sel?.kind === 'ship' ? sel.mmsi : undefined)
      },
    })
    return globeRef.current
  }

  /**
   * Moves the bubbles between the map's overlay pane and the globe's stage.
   *
   * The same nodes, never rebuilt — which is the point of doing it this way.
   * Whatever the pulse has coloured them stays coloured, the tooltips and key
   * handling come along, and there is no second set of two hundred markers to
   * keep in step with the first.
   */
  function handMarkersTo(where: 'stage' | 'pane') {
    const stage = globeStage.current
    const pane = paneRef.current
    // Both sets travel together, whichever layer is showing: the one that is
    // hidden is hidden by `display`, and leaving it behind in the other view's
    // container would strand it there the moment the layer changed.
    const all = [...markersRef.current.values(), ...chokeRef.current.values()]
    for (const m of all) {
      if (where === 'stage') {
        if (!stage) return
        // A transform transition would smear every bubble behind the turn.
        m.box.style.transition = 'opacity .35s ease'
        m.box.style.left = '0px'
        m.box.style.top = '0px'
        stage.appendChild(m.box)
      } else {
        if (!pane) return
        m.box.style.transform = ''
        m.box.style.visibility = 'visible'
        m.box.removeAttribute('aria-hidden')
        m.box.style.transition = MARKER_TRANSITION
        m.box.style.opacity = '1'
        pane.appendChild(m.box)
      }
    }
    // Nothing about the map changed, so it has no reason to reposition the
    // markers it has just been given back. This gives it one.
    if (where === 'pane') mapRef.current?.panBy(0, 0)
  }

  /** The ship closest to a point, within a tolerance in degrees. */
  function nearestVessel(lat: number, lon: number, within: number): Vessel | null {
    let best: Vessel | null = null
    let bestD = within
    for (const v of vesselsRef.current) {
      const d = Math.hypot(v.lat - lat, (v.lon - lon) * Math.cos((lat * Math.PI) / 180))
      if (d < bestD) { bestD = d; best = v }
    }
    return best
  }

  /** Nautical miles between two points, near enough at these distances. */
  function milesBetween(aLat: number, aLon: number, bLat: number, bLon: number) {
    const dLat = bLat - aLat
    const dLon = (bLon - aLon) * Math.cos(((aLat + bLat) / 2 * Math.PI) / 180)
    return Math.hypot(dLat, dLon) * 60
  }

  /**
   * Builds the shipping layer once: the lanes, the chokepoint markers, and
   * one fetch of the traffic behind them.
   *
   * Deferred until the layer is first opened, because most visits never leave
   * the news and none of this is free — 162 polylines, 28 overlays and a
   * round trip.
   */
  async function ensureShipping(map: google.maps.Map) {
    if (shippingRef.current) return
    shippingRef.current = true

    chokeRef.current = createChokeMarkers(CHOKEPOINTS, id => setPicked({ kind: 'choke', id }))
    lanesRef.current = createLanePolylines(map, ref => setPicked({ kind: 'lane', ref }))

    // Positioned by Google while the flat map has them, exactly as the
    // country bubbles are.
    for (const p of CHOKEPOINTS) {
      const m = chokeRef.current.get(p.id)
      if (!m) continue
      const overlay = new google.maps.OverlayView()
      overlay.onAdd = function () {
        this.getPanes()?.overlayMouseTarget.appendChild(m.box)
      }
      overlay.draw = function () {
        if (viewRef.current === 'globe') return
        const proj = this.getProjection()
        if (!proj) return
        const at = proj.fromLatLngToDivPixel(new google.maps.LatLng(p.lat, p.lon))
        if (!at) return
        m.box.style.left = `${at.x - 12}px`
        m.box.style.top = `${at.y - 12}px`
      }
      overlay.onRemove = function () { m.box.parentNode?.removeChild(m.box) }
      overlay.setMap(map)
    }

    vesselOverlayRef.current = createVesselOverlay(
      map,
      () => vesselsRef.current,
      () => ({
        hours: capturedRef.current ? (Date.now() - capturedRef.current) / 3_600_000 : 0,
        trails: trailsRef.current,
        selected: pickedRef.current?.kind === 'ship' ? pickedRef.current.mmsi : undefined,
      }),
    )

    // Clicking the sea picks the nearest ship, if the click was near one.
    // Tolerance is in pixels and converted to degrees for the current zoom,
    // so it stays the same size under the finger at every scale.
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (layerRef.current !== 'shipping' || !e.latLng) return
      const perDeg = (256 * Math.pow(2, map.getZoom() ?? 3)) / 360
      const found = nearestVessel(e.latLng.lat(), e.latLng.lng(), 14 / perDeg)
      setPicked(found ? { kind: 'ship', mmsi: found.mmsi } : null)
    })

    try {
      const res = await fetch('/api/chokepoints')
      const data = await res.json()
      const byId = new Map<string, ChokepointReading>(
        (data.readings ?? []).map((r: ChokepointReading) => [r.id, r]),
      )
      setReadings(byId)
      for (const p of CHOKEPOINTS) {
        const m = chokeRef.current.get(p.id)
        if (m) paintChoke(m, byId.get(p.id) ?? null, p)
      }
    } catch {
      // The lanes and the chokepoints are still worth showing without the
      // counts; the markers keep their "figures loading" tooltip.
    }
  }

  /** Whichever markers the current layer puts on the globe. */
  function activeMarkers() {
    return layerRef.current === 'shipping'
      ? new Map([...chokeRef.current].map(([k, m]) => [k, { box: m.box, lat: m.lat, lng: m.lng }]))
      : new Map([...markersRef.current].map(([k, m]) => [k, { box: m.box, lat: m.lat, lng: m.lng }]))
  }

  // Applies the layer to whichever view is showing. DOM only — nothing here
  // is React state, because two hundred bubbles and a hundred and sixty
  // polylines are not worth a render each.
  useEffect(() => {
    layerRef.current = layer
    const map = mapRef.current
    if (!map) return

    let cancelled = false
    const shipping = layer === 'shipping'

    ;(async () => {
      if (shipping) await ensureShipping(map)
      if (cancelled) return

      // A chokepoint picked on the shipping layer means nothing on the news
      // one. Cleared here, after the await, rather than from an effect of its
      // own, where it would cascade a render on every layer change.
      if (!shipping) setPicked(null)

      for (const m of markersRef.current.values()) {
        m.box.style.display = shipping ? 'none' : ''
      }
      for (const m of chokeRef.current.values()) {
        m.box.style.display = shipping ? '' : 'none'
      }
      for (const l of lanesRef.current) {
        l.line.setMap(shipping ? map : null)
        l.hit.setMap(shipping ? map : null)
      }

      globeRef.current?.setMarkers(activeMarkers())
      globeRef.current?.refresh()
    })()

    return () => { cancelled = true }
  }, [layer, tilesIn])

  /**
   * Keeps the fleet current while the shipping layer is open.
   *
   * Each capture is a few seconds of listening on the server, so this asks
   * only while someone is looking at it — and stops the moment they are not.
   */
  useEffect(() => {
    if (layer !== 'shipping') return
    let cancelled = false

    const pull = async () => {
      try {
        const res = await fetch('/api/vessels')
        const data = await res.json()
        if (cancelled) return
        vesselsRef.current = data.vessels ?? []
        trailsRef.current = extendTrails(trailsRef.current, vesselsRef.current)
        capturedRef.current = Date.parse(data.capturedAt ?? '') || Date.now()
        setVessels(vesselsRef.current)
        setFleet({ count: vesselsRef.current.length, configured: data.configured !== false })
        vesselOverlayRef.current?.redraw()
        globeRef.current?.refresh()
      } catch {
        if (!cancelled) setFleet({ count: 0, configured: true })
      }
    }

    pull()
    const timer = window.setInterval(pull, 45_000)
    // The globe redraws on its own clock; the flat map only redraws when the
    // map itself changes, so without this the fleet would sit still between
    // captures however carefully it was being carried forward.
    const motion = window.setInterval(() => {
      if (viewRef.current === 'map') vesselOverlayRef.current?.redraw()
    }, 500)
    return () => { cancelled = true; window.clearInterval(timer); window.clearInterval(motion) }
  }, [layer])

  /**
   * Swaps the two views.
   *
   * A plain cross-fade. There used to be a morph here — the globe unwrapping
   * into the flat map and back — and it was taken out: it drew attention to
   * the switch rather than to either of the things being switched between,
   * and the two projections it joined never looked like the same picture
   * mid-way however carefully they were matched.
   */
  async function switchTo(next: 'map' | 'globe') {
    if (busyRef.current || viewRef.current === next) return
    const canvas = globeCanvas.current
    const container = mapContainer.current
    if (!canvas || !container) return

    busyRef.current = true
    const globe = await ensureGlobe()
    if (!globe) { busyRef.current = false; return }

    if (next === 'globe') {
      viewRef.current = 'globe'
      handMarkersTo('stage')
      globe.setMarkers(activeMarkers())
      // Draws its first frame before it is faded in, so what arrives is the
      // globe rather than an empty canvas that becomes one.
      globe.run()
      canvas.style.opacity = '1'
      container.style.opacity = '0'
    } else {
      globe.stop()
      canvas.style.opacity = '0'
      container.style.opacity = '1'
      viewRef.current = 'map'
      handMarkersTo('pane')
    }

    setView(next)
    busyRef.current = false
  }

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', transition: 'opacity .22s ease' }}
      />

      {/* The other rendering of the same world. Opacity is driven imperatively
          so a re-render mid-transition cannot pull it out from under itself. */}
      <canvas
        ref={globeCanvas}
        aria-hidden
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', transition: 'opacity .22s ease',
        }}
      />
      <div
        ref={globeStage}
        onClick={e => {
          if (layerRef.current !== 'shipping' || viewRef.current !== 'globe') return
          const globe = globeRef.current
          const stage = globeStage.current
          if (!globe || !stage) return
          const box = stage.getBoundingClientRect()
          const x = e.clientX - box.left
          const y = e.clientY - box.top
          // Hit-tested in screen space, because on a sphere two ships a long
          // way apart can sit a few pixels apart near the limb.
          let best: Vessel | null = null
          let bestD = 15
          for (const v of vesselsRef.current) {
            const p = globe.project(v.lat, v.lon)
            if (!p.front) continue
            const d = Math.hypot(p.x - x, p.y - y)
            if (d < bestD) { bestD = d; best = v }
          }
          if (best) { setPicked({ kind: 'ship', mmsi: best.mmsi }); return }
          // Nothing close enough to be a ship, so try the lanes underneath.
          const lane = pickLaneAt(x, y, (lat, lon) => globe.project(lat, lon))
          setPicked(lane ? { kind: 'lane', ref: lane } : null)
        }}
        className="globe-stage"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: view === 'globe' ? 'auto' : 'none',
          cursor: view === 'globe' ? 'grab' : 'default',
          touchAction: 'none',
        }}
      />

      {/* ── VIEW SWITCH ──
          Bottom left, stacked, and labelled with what each one is. It was a
          pill in the top right, where it read as chrome and was missed —
          which for the only control that reveals half the feature is the
          whole problem. Lifted clear of the stats strip and of Google's
          attribution logo, which is pinned to the very bottom left and may
          not be moved or hidden. */}
      <div
        className="view-switch"
        role="group"
        aria-label="Map projection"
        style={{
          position: 'absolute', zIndex: 210,
          left: isCompact ? '16px' : 'calc(24px + var(--safe-left))',
          bottom: isCompact
            ? 'calc(104px + var(--safe-bottom))'
            : 'calc(78px + var(--safe-bottom))',
        }}
      >
        <button
          type="button"
          onClick={() => switchTo('globe')}
          className={view === 'globe' ? 'is-on' : ''}
          aria-pressed={view === 'globe'}
        >
          <GlobeIcon size={17} strokeWidth={1.9} aria-hidden />
          <span>Globe</span>
        </button>
        <button
          type="button"
          onClick={() => switchTo('map')}
          className={view === 'map' ? 'is-on' : ''}
          aria-pressed={view === 'map'}
        >
          <MapIcon size={17} strokeWidth={1.9} aria-hidden />
          <span>Map</span>
        </button>
      </div>

      {/* ── FLEET NOTE ──
          Says what the ships on screen are, which matters because they are a
          few seconds of listening rather than a continuous feed — and says
          plainly when there is no key rather than showing empty seas. */}
      {layer === 'shipping' && fleet && (
        <div
          className="mono-label"
          style={{
            position: 'absolute', zIndex: 210,
            top: '18px', right: '18px',
            padding: '8px 13px', borderRadius: '10px',
            border: '1px solid var(--border-mid)',
            background: 'rgba(8,8,12,.84)',
            backdropFilter: 'blur(14px)',
            color: fleet.configured ? 'var(--text-3)' : 'var(--text-4)',
          }}
        >
          {fleet.configured
            ? `${fleet.count} ships · sampled live`
            : 'Live vessels off — set AISSTREAM_KEY'}
        </div>
      )}

      {/* ── WHAT YOU CLICKED ── */}
      {layer === 'shipping' && picked && (
        <div style={{
          position: 'absolute', zIndex: 220,
          right: '18px', top: '64px',
        }}>
          {picked.kind === 'choke' ? (() => {
            const point = CHOKEPOINTS.find(c => c.id === picked.id)
            if (!point) return null
            // Ships inside this chokepoint's own watch box, which is the live
            // counterpart to PortWatch's published and week-old count.
            const here = vessels.filter(
              v => Math.abs(v.lat - point.lat) <= 4 && Math.abs(v.lon - point.lon) <= 4,
            ).length
            return (
              <ChokepointDetail
                point={point}
                reading={readings.get(point.id) ?? null}
                nearby={here}
                onClose={() => setPicked(null)}
              />
            )
          })() : picked.kind === 'lane' ? (() => {
            const flat = LANES[picked.ref.tier][picked.ref.index]
            if (!flat) return null
            return (
              <LaneDetail
                route={describeLane(picked.ref.tier, flat)}
                onClose={() => setPicked(null)}
              />
            )
          })() : (() => {
            const vessel = vessels.find(v => v.mmsi === picked.mmsi)
            if (!vessel) return null
            let nearest: { name: string; miles: number } | null = null
            for (const c of CHOKEPOINTS) {
              const miles = milesBetween(vessel.lat, vessel.lon, c.lat, c.lon)
              if (!nearest || miles < nearest.miles) nearest = { name: c.name, miles }
            }
            return <ShipDetail vessel={vessel} nearest={nearest} onClose={() => setPicked(null)} />
          })()}
        </div>
      )}

      {/* ── COLD START ──
          Tiles can take several seconds on a first load, and `backgroundColor`
          only stops that being a white rectangle — it still leaves the reader
          looking at nothing. Clears on the real signal rather than a guessed
          timeout. */}
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
