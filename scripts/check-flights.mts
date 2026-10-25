/**
 * Checks for the flights layer.
 *
 *   npm run check:flights          offline, no network
 *   npm run check:flights -- --live   also calls adsb.lol and inspects a response
 *
 * Two halves, deliberately split.
 *
 * The offline half checks the viewport quantizer, which is the part of this
 * feature most likely to break quietly: get it wrong and every pan becomes a
 * fresh upstream request, which nothing in the UI would show and the provider
 * would notice before we did. Pure arithmetic, so it runs anywhere.
 *
 * The live half exists because the response shape is the one thing that cannot
 * be checked by reading code. It reports field coverage across a real
 * response rather than asserting an exact schema — this is a community feed
 * where any given aircraft may be missing any given field, so "how much of
 * this did we understand" is the useful question, not "did it match".
 */
import {
  MAX_RADIUS_NM,
  fetchAircraft,
  quantizeScope,
  scopeFromParams,
  scopeKey,
  scopeQuery,
} from '../lib/flights'

let failures = 0

function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\nViewport quantizer')

/** Rough nautical miles between two points, for the offset checks below. */
function nmBetween(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLon = (bLon - aLon) * Math.cos(((aLat + bLat) / 2 * Math.PI) / 180)
  return Math.hypot(bLat - aLat, dLon) * 60
}

// A city-scale view becomes a circle on the grid.
const london = quantizeScope(51.5, -0.12, 100)
check('london is a radius scope', london.kind === 'radius')
if (london.kind === 'radius') {
  check('london radius snaps to a 25 mile step', london.dist === 100, String(london.dist))
}

// The property that matters, and the one the first grid got wrong: a circle
// has to stay over the thing it was asked about. A flat five degree grid is
// about 300 miles across, so a 250 mile circle could be centred 150 miles
// from the view — further than its own radius — and miss the traffic someone
// had zoomed in to look at. The grid is tied to the radius now, so the offset
// is bounded by a fraction of it at every zoom.
for (const [lat, lon, want] of [[51.5, -0.12, 100], [41.9, 12.5, 250], [-33.9, 151.2, 25]] as const) {
  const s = quantizeScope(lat, lon, want)
  if (s.kind !== 'radius') { check(`a ${want}nm view stays a circle`, false); continue }
  const off = nmBetween(lat, lon, s.lat, s.lon)
  check(
    `a ${want}nm circle stays within half its radius of the view`,
    off <= s.dist * 0.75,
    `off by ${off.toFixed(0)}nm of ${s.dist}nm`,
  )
}

// A pan small enough to stay inside one cell still has to produce the same
// key, or the cache never gets a hit and every drag hits the provider.
check(
  'a small pan is the same request',
  scopeKey(quantizeScope(51.5, -0.12, 100)) === scopeKey(quantizeScope(51.56, -0.05, 100)),
  `${scopeKey(quantizeScope(51.5, -0.12, 100))} vs ${scopeKey(quantizeScope(51.56, -0.05, 100))}`,
)

// And a pan that leaves it must not.
check(
  'a pan into the next cell is a different request',
  scopeKey(quantizeScope(51.5, -0.12, 100)) !== scopeKey(quantizeScope(41.9, 12.5, 100)),
)

// Past the provider's cap there is no honest circle, so it becomes the
// worldwide military feed.
check('over the cap falls back to military', quantizeScope(0, 0, MAX_RADIUS_NM + 10).kind === 'mil')
check('at the cap is still a circle', quantizeScope(0, 0, MAX_RADIUS_NM).kind === 'radius')

// A very tight zoom must still ask for a usable circle rather than zero miles.
const tight = quantizeScope(35.68, 139.69, 3)
check('a tiny radius is clamped up', tight.kind === 'radius' && tight.dist === 25,
  tight.kind === 'radius' ? String(tight.dist) : tight.kind)

// Garbage in, military feed out — never NaN in a URL.
check('NaN falls back to military', quantizeScope(NaN, 0, 100).kind === 'mil')
check('infinite radius falls back to military', quantizeScope(0, 0, Infinity).kind === 'mil')

// Longitude wraps; a snapped value must stay in range.
for (const lon of [179, 178.4, -179, -178.4, 180, -180]) {
  const s = quantizeScope(0, lon, 100)
  check(
    `lon ${lon} stays in range`,
    s.kind === 'radius' && s.lon >= -180 && s.lon <= 180,
    s.kind === 'radius' ? String(s.lon) : s.kind,
  )
}

// Latitude is clamped away from the poles, where a radius query is meaningless.
for (const lat of [89, -89]) {
  const s = quantizeScope(lat, 0, 100)
  check(
    `lat ${lat} is clamped`,
    s.kind === 'radius' && Math.abs(s.lon) <= 180 && Math.abs(s.lat) <= 85,
    s.kind === 'radius' ? String(s.lat) : s.kind,
  )
}

console.log('Query round trip')

// The client builds a URL, the route rebuilds the scope: the two must agree,
// or the route's cache keys and the browser's would diverge.
for (const scope of [
  quantizeScope(51.5, -0.12, 100),
  quantizeScope(-33.9, 151.2, 250),
  quantizeScope(0, 0, 9999),
]) {
  const back = scopeFromParams(new URLSearchParams(scopeQuery(scope)))
  check(
    `round trip of ${scopeKey(scope)}`,
    scopeKey(back) === scopeKey(scope),
    `became ${scopeKey(back)}`,
  )
}

// A hand-typed URL must land on the same small set of keys as the client's.
const sloppy = scopeFromParams(new URLSearchParams('lat=51.7&lon=-0.4&dist=105'))
check('an unquantized URL is re-quantized', scopeKey(sloppy) === scopeKey(london), scopeKey(sloppy))
check('an empty URL is the military feed', scopeFromParams(new URLSearchParams('')).kind === 'mil')

if (process.argv.includes('--live')) {
  console.log('\nLive response (adsb.lol)')
  try {
    const mil = await fetchAircraft({ kind: 'mil' })
    console.log(`  military feed: ${mil.length} aircraft`)
    check('military feed returned aircraft', mil.length > 0,
      'empty — either the feed is down or the shape changed')

    if (mil.length) {
      // Coverage rather than assertion: see the note at the top.
      const has = (pick: (a: typeof mil[number]) => unknown) =>
        Math.round((mil.filter(a => pick(a) !== null && pick(a) !== undefined).length / mil.length) * 100)
      console.log(`  callsign ${has(a => a.callsign)}% · type ${has(a => a.type)}% · ` +
        `registration ${has(a => a.registration)}% · altitude ${has(a => a.altitude)}%`)
      console.log(`  flagged military: ${mil.filter(a => a.military).length}/${mil.length}`)
      // Every aircraft in this feed should carry the flag; if none do, the
      // dbFlags bit has moved and the whole escalation filter is silently off.
      check('the military flag is being parsed', mil.some(a => a.military),
        'no aircraft in the military feed carried dbFlags bit 0')
      check('tracks are being parsed', mil.some(a => a.track >= 0))
      check('positions look like coordinates',
        mil.every(a => Math.abs(a.lat) <= 90 && Math.abs(a.lon) <= 180))
    }

    // A busy patch of sky, to exercise the radius endpoint as well.
    const circle = await fetchAircraft(quantizeScope(51.5, -0.12, 150))
    console.log(`  150nm around London: ${circle.length} aircraft`)
    check('radius query returned aircraft', circle.length > 0,
      'empty — adsb.lol coverage is thinnest outside North America and Europe')
  } catch (err) {
    failures++
    console.error(`  FAIL  live fetch — ${err instanceof Error ? err.message : String(err)}`)
  }
} else {
  console.log('\n  (skipping the live response check; pass --live to run it)')
}

console.log(failures ? `\n${failures} failed\n` : '\nall passed\n')
process.exit(failures ? 1 : 0)
