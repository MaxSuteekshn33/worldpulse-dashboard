/**
 * Conflict and unrest events, from GDELT.
 *
 * The third live layer, and the one whose sourcing took the most finding.
 * The obvious candidates are gone or gated: UCDP's API now answers every
 * request with `401 API token required`, ACLED has always needed a
 * registered key and restricts redistribution, and GDELT's own GEO 2.0 API —
 * which returned ready-made GeoJSON — now 404s on every documented form of
 * its URL.
 *
 * What is still open, and is in fact the source underneath most of the
 * others, is GDELT's raw event export. Every fifteen minutes GDELT publishes
 * a zipped CSV of everything its coders extracted from world news in that
 * window: around 750 events, of which 60 or so are violence with
 * coordinates. No key, no quota, and it is the canonical feed rather than
 * somebody's wrapper around it.
 *
 * What these events *are* matters more here than on any other layer, because
 * the subject invites being read as something it is not:
 *
 *   - They are machine-coded *reports*, not verified incidents. One shelling
 *     reported by four outlets can be four rows.
 *   - `articles` is how widely something was reported, not how severe it was.
 *     A protest in a capital with a press corps outranks a massacre in a
 *     region with none. This is a map of attention as much as of violence.
 *   - Locations are geocoded from text and are sometimes wrong, often only
 *     as precise as a province.
 *   - Nothing here is a casualty count. GDELT does not publish one.
 *
 * The UI says all of this rather than implying a precision the feed does not
 * have, which is the same standard the shipping and flight layers are held
 * to — and here it is not a nicety.
 */
import { inflateRawSync } from 'node:zlib'

const BASE = 'https://data.gdeltproject.org/gdeltv2'

/** GDELT asks callers to identify themselves, as every open feed here does. */
const USER_AGENT = 'WorldPulse/1.0 (+https://worldpulse-dashboard-gov9.vercel.app)'

/** How long one answer is served before another sweep runs. */
export const CONFLICT_REVALIDATE = 300

/**
 * How long an event stays on the map, in seconds.
 *
 * Six hours. Long enough that the map is populated rather than showing the
 * sixty events of the last quarter of an hour, short enough that it is still
 * about now. Unlike a ship, an event does not move, so age costs accuracy
 * only in the sense that older news is less current.
 */
export const CONFLICT_MEMORY = 6 * 60 * 60

/** The most events one answer carries, newest and most-reported kept. */
export const MAX_EVENTS = 900

/**
 * How many fifteen-minute exports to pull when there is nothing cached.
 *
 * Six is ninety minutes, about 300KB, and the difference between a cold
 * instance showing a nearly empty world and showing a usable one. Later
 * refreshes take one file each.
 */
export const COLD_EXPORTS = 6

/**
 * Reads the single member of a zip.
 *
 * GDELT publishes `.CSV.zip`, and Node has gzip but no zip. Rather than take
 * a dependency for one function, this reads the central directory — the
 * authoritative place for the sizes, since the local header may leave them
 * at zero when a data descriptor is used — and inflates the raw deflate
 * stream. Verified against a real export: 51,029 compressed bytes to 312,686
 * uncompressed, exactly as the directory declares.
 */
export function unzipSingle(buf: Buffer): string {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip')

  const cd = buf.readUInt32LE(eocd + 16)
  const method = buf.readUInt16LE(cd + 10)
  const compSize = buf.readUInt32LE(cd + 20)
  const localOff = buf.readUInt32LE(cd + 42)

  const nameLen = buf.readUInt16LE(localOff + 26)
  const extraLen = buf.readUInt16LE(localOff + 28)
  const start = localOff + 30 + nameLen + extraLen
  const raw = buf.subarray(start, start + compSize)

  return (method === 8 ? inflateRawSync(raw) : raw).toString('utf8')
}

/**
 * The CAMEO codes this layer shows, and what they mean in plain words.
 *
 * GDELT codes every event against CAMEO, a taxonomy of a few hundred verbs.
 * Only the families that amount to coercion or violence are here; the rest —
 * statements, appeals, negotiations, which are most of the feed — belong on
 * a different map.
 */
const CAMEO: Record<string, string> = {
  // 14: protest
  '140': 'Political dissent', '141': 'Demonstration or rally',
  '142': 'Hunger strike', '143': 'Strike or boycott',
  '144': 'Obstruction or blockade', '145': 'Violent protest or riot',
  // 17: coercion
  '170': 'Coercion', '171': 'Property seized or damaged',
  '172': 'Administrative sanctions', '173': 'Arrests or detentions',
  '174': 'Expulsion or deportation', '175': 'Repression',
  // 18: assault
  '180': 'Unconventional violence', '181': 'Abduction or hostage-taking',
  '182': 'Physical assault', '183': 'Bombing',
  '184': 'Human shields', '185': 'Assassination attempt', '186': 'Assassination',
  // 19: fighting
  '190': 'Conventional military force', '191': 'Blockade or movement restricted',
  '192': 'Territory occupied', '193': 'Small-arms fighting',
  '194': 'Artillery or armour', '195': 'Air strikes',
  '196': 'Ceasefire violation',
  // 20: mass violence
  '200': 'Unconventional mass violence', '201': 'Mass expulsion',
  '202': 'Mass killings', '203': 'Ethnic cleansing',
  '204': 'Weapons of mass destruction',
}

/**
 * How an event reads on the map.
 *
 * Three bands rather than twenty codes, because the map has to be legible at
 * a glance and the difference between "artillery" and "small arms" is not
 * one a reader is going to take from a dot's colour.
 */
export type Severity = 'mass' | 'armed' | 'unrest'

const ROOT_SEVERITY: Record<string, Severity> = {
  '14': 'unrest', '17': 'unrest',
  '18': 'armed', '19': 'armed',
  '20': 'mass',
}

export interface ConflictEvent {
  id: string
  lat: number
  lon: number
  /** The place as GDELT named it, e.g. 'Sanaa, Sana', Yemen'. */
  place: string
  /** CAMEO event code, e.g. '195'. */
  code: string
  /** What that code means, in words. */
  kind: string
  severity: Severity
  /**
   * CAMEO's Goldstein scale, -10 to +10: how much the *type* of event is
   * taken to destabilise. A property of the verb, not of this incident —
   * every air strike scores the same.
   */
  goldstein: number
  /** How many articles GDELT saw. Attention, not severity. */
  articles: number
  actor1?: string
  actor2?: string
  /** The article GDELT coded this from. */
  url: string
  /** When GDELT added it, epoch ms. */
  at: number
}

/** Column positions in the 61-field GDELT 2.0 export. */
const COL = {
  id: 0, root: 28, code: 26, goldstein: 30, articles: 33,
  actor1: 6, actor2: 16,
  place: 52, country: 53, lat: 56, lon: 57,
  added: 59, url: 60,
}

/**
 * Countries whose events this layer does not show.
 *
 * An editorial choice, not a data problem: India is left off at the moment
 * by request. It is a large share of what the feed carries — 42 of 766 rows
 * in a sample window, and the two most heavily covered events in another
 * were both Maharashtra — so leaving it in crowds out the rest of the world
 * on a map that is supposed to show all of it.
 *
 * Matched on GDELT's country code rather than the place name, which is not
 * the same test and would be wrong: the sample contained a US event whose
 * place name matches 'India' — Indiana. GDELT uses FIPS 10-4 here, where
 * India is `IN`; Indonesia is `ID` and the British Indian Ocean Territory is
 * `IO`, so there is nothing to collide with.
 */
const HIDDEN_COUNTRIES = new Set(['IN'])

function clean(v: string | undefined): string | undefined {
  const t = (v ?? '').trim()
  return t.length ? t : undefined
}

/** `20261025184500` to epoch milliseconds, read as UTC. */
function stampToMs(stamp: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(stamp.trim())
  if (!m) return Date.now()
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

/**
 * Turns one export's CSV into the events worth drawing.
 *
 * Exported so the parsing can be exercised against a saved file without the
 * network, which is the only way the column map ever gets checked.
 */
export function parseExport(csv: string): ConflictEvent[] {
  const out: ConflictEvent[] = []

  for (const line of csv.split('\n')) {
    if (!line) continue
    const f = line.split('\t')
    if (f.length < 61) continue

    const severity = ROOT_SEVERITY[f[COL.root]]
    if (!severity) continue
    if (HIDDEN_COUNTRIES.has((f[COL.country] ?? '').trim())) continue

    const lat = Number(f[COL.lat])
    const lon = Number(f[COL.lon])
    // Without a position there is nothing to draw. GDELT leaves these empty
    // for events it could not place, which is a good fraction of them.
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) continue

    const code = f[COL.code]
    out.push({
      id: f[COL.id],
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      place: clean(f[COL.place]) ?? 'Location not given',
      code,
      kind: CAMEO[code] ?? CAMEO[`${code.slice(0, 2)}0`] ?? 'Armed incident',
      severity,
      goldstein: Number(f[COL.goldstein]) || 0,
      articles: Number(f[COL.articles]) || 1,
      actor1: clean(f[COL.actor1]),
      actor2: clean(f[COL.actor2]),
      url: clean(f[COL.url]) ?? '',
      at: stampToMs(f[COL.added]),
    })
  }

  return out
}

/**
 * Collapses the same incident reported more than once.
 *
 * GDELT codes each article separately, so one air strike covered by four
 * outlets arrives as four rows with four ids — visible in a single export as
 * two identical rows for Khamis Mushait, minutes apart. Drawn raw, the busiest
 * stories pile dots on top of each other and look like repeated attacks.
 *
 * Two events are treated as one when they share a day, a CAMEO code and a
 * place to within a tenth of a degree — about 11km, which is finer than
 * GDELT's own geocoding. The survivor keeps the combined article count, since
 * being reported four times is exactly what `articles` is supposed to measure.
 */
export function collapse(events: ConflictEvent[]): ConflictEvent[] {
  const byKey = new Map<string, ConflictEvent>()

  for (const e of events) {
    const day = Math.floor(e.at / 86_400_000)
    const key = `${day}:${e.code}:${e.lat.toFixed(1)}:${e.lon.toFixed(1)}`
    const prior = byKey.get(key)
    if (!prior) { byKey.set(key, { ...e }); continue }

    prior.articles += e.articles
    // Keep the newest telling of it, and with it the freshest source link.
    if (e.at > prior.at) {
      prior.at = e.at
      prior.url = e.url
      prior.place = e.place
    }
  }

  return [...byKey.values()]
}

/** The export URLs for the last `count` fifteen-minute windows. */
export function recentExports(count: number, now = Date.now()): string[] {
  const urls: string[] = []
  // GDELT publishes on the quarter hour, a little after it; stepping back
  // from the last completed quarter avoids asking for a file not yet written.
  const quarter = 15 * 60 * 1000
  const latest = Math.floor(now / quarter) * quarter - quarter

  for (let i = 0; i < count; i++) {
    const d = new Date(latest - i * quarter)
    const stamp =
      `${d.getUTCFullYear()}` +
      `${String(d.getUTCMonth() + 1).padStart(2, '0')}` +
      `${String(d.getUTCDate()).padStart(2, '0')}` +
      `${String(d.getUTCHours()).padStart(2, '0')}` +
      `${String(d.getUTCMinutes()).padStart(2, '0')}00`
    urls.push(`${BASE}/${stamp}.export.CSV.zip`)
  }

  return urls
}

/** Downloads and parses one export. */
export async function fetchExport(url: string): Promise<ConflictEvent[]> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    cache: 'no-store',
  })
  // A window that does not exist yet answers 404, which is ordinary rather
  // than exceptional — the clock and GDELT's publishing are not in lockstep.
  if (!res.ok) return []

  const buf = Buffer.from(await res.arrayBuffer())
  return parseExport(unzipSingle(buf))
}

/**
 * Pulls several windows, oldest first, one at a time.
 *
 * Sequential on purpose. This is a free feed served from one host and the
 * whole sweep is a few hundred kilobytes; there is nothing to gain by asking
 * for six files at once except a reputation.
 */
export async function fetchRecent(count: number): Promise<ConflictEvent[]> {
  const events: ConflictEvent[] = []
  for (const url of recentExports(count)) {
    try {
      events.push(...await fetchExport(url))
    } catch {
      // One unreadable window is not a reason to lose the others.
    }
  }
  return events
}

/** Drops what has aged out of the window. */
export function stillRecent(events: ConflictEvent[], now = Date.now()): ConflictEvent[] {
  const cutoff = now - CONFLICT_MEMORY * 1000
  return events.filter(e => e.at >= cutoff)
}

/**
 * Folds new events into what is held, collapses duplicates and ages the rest.
 *
 * The cap keeps the most-reported rather than the newest: at the point where
 * there are more events than the map can carry, the ones worth losing are the
 * ones a single outlet mentioned once.
 */
export function mergeEvents(
  held: ConflictEvent[],
  fresh: ConflictEvent[],
  now = Date.now(),
): ConflictEvent[] {
  const live = stillRecent(collapse([...held, ...fresh]), now)
  if (live.length <= MAX_EVENTS) return live
  return live.sort((a, b) => b.articles - a.articles).slice(0, MAX_EVENTS)
}
