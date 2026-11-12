/**
 * Regression checks for the two text-matching layers.
 *
 *   npm run check
 *
 * Runs offline — no feeds are fetched. Layer one is country matching
 * (lib/aliases.ts): does a piece of text name this country, and only this
 * country? Layer two is section matching (lib/news.ts): does a story belong in
 * the section its feed filed it under?
 *
 * Both are pure string work, which is exactly the kind of thing that passes a
 * spot check and breaks on the 170th country. The pair sweep below is the real
 * value here: it walks all 200 x 199 ordered country pairs.
 */
import { COUNTRY_TERMS, matchesCountry, SUPPORTED_CODES } from '../lib/aliases'
import { COUNTRIES, getCountryByCode } from '../lib/countries'
import { canonicalUrl, createShownStories, onTopic, relatedRank, sourceKey, spreadTopics, topicKey, TOPIC_TERMS, type Article } from '../lib/news'
import { SEGMENT_IDS, type Segment } from '../lib/segments'

let failures = 0

function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── 1. Every country is in the alias table ────────────────────────────────
console.log('\n1. Coverage')
for (const c of COUNTRIES) {
  check(`${c.code} has match terms`, Boolean(COUNTRY_TERMS[c.code]))
}
check(
  'no orphan alias entries',
  SUPPORTED_CODES.every(code => getCountryByCode(code) !== undefined),
  SUPPORTED_CODES.filter(code => !getCountryByCode(code)).join(', '),
)
console.log(`   ${COUNTRIES.length} countries, ${SUPPORTED_CODES.length} alias entries`)

// ── 2. Each country matches its own name ──────────────────────────────────
console.log('\n2. Self-match')
for (const c of COUNTRIES) {
  check(
    `${c.code} matches "${c.name}"`,
    matchesCountry(`Report from ${c.name} on Thursday`, c.code),
  )
}

// ── 3. The pair sweep: no country's name matches another's matcher ────────
// This is where naive substring matching fell over — "Oman" inside "Romania",
// "Mali" inside "Somalia", "India" inside "Indiana", "Niger" inside "Nigeria".
console.log('\n3. Cross-country collisions (200 x 199)')
let pairs = 0
const collisions: string[] = []
for (const a of COUNTRIES) {
  for (const b of COUNTRIES) {
    if (a.code === b.code) continue
    pairs++
    if (matchesCountry(`Report from ${a.name} on Thursday`, b.code)) {
      collisions.push(`"${a.name}" (${a.code}) wrongly matched ${b.code}`)
    }
  }
}
for (const c of collisions) check('collision', false, c)
console.log(`   ${pairs} pairs checked, ${collisions.length} collisions`)

// ── 4. Known traps, both directions ───────────────────────────────────────
console.log('\n4. Known traps')
const traps: [string, string, boolean][] = [
  // Substring false positives.
  ['The woman left Romania on Monday', 'OM', false],
  ['Fighting continues in Somalia', 'ML', false],
  ['A factory in Indiana reopened', 'IN', false],
  ['He told us the deal was off', 'US', false],
  // A price is not a place. Found on the live landing page, where "Apple's
  // foldable iPhone hits stores with US$2,399" was filed under United States.
  ['Apple\u2019s foldable iPhone hits stores with US$2,399', 'US', false],
  ['Exports reached USD 4.1 billion last quarter', 'US', false],
  ['The US said the US$2bn deal would proceed', 'US', true],
  ['Nigeria raised fuel prices', 'NE', false],
  ['A new plan for New Mexico', 'MX', false],
  // Nested names must not swallow the shorter country.
  ['Papua New Guinea declared a state of emergency', 'GN', false],
  ['Conakry, Guinea saw protests', 'GN', true],
  ['South Sudan and Sudan resumed oil talks', 'SD', true],
  ['South Sudan declared independence in 2011', 'SS', true],
  ['Ireland and Northern Ireland agreed a border plan', 'IE', true],
  ['Northern Ireland assembly met at Stormont', 'IE', false],
  ['Equatorial Guinea named a new premier', 'GQ', true],
  // Case-sensitive acronyms.
  ['The US and UK signed a pact', 'US', true],
  ['The US and UK signed a pact', 'GB', true],
  ['She gave us the files', 'US', false],
  // Demonyms are listed explicitly, so they must work.
  ['Indian markets closed higher', 'IN', true],
  ['French voters went to the polls', 'FR', true],
]
for (const [text, code, want] of traps) {
  check(`${code} ${want ? 'matches' : 'ignores'} "${text}"`, matchesCountry(text, code) === want)
}

// ── 5. Section routing ────────────────────────────────────────────────────
// A story filed by a shared feed has to earn its section on the text. Several
// feeds are wired into three or four sections at once, so without this the
// same article shipped under all of them.
console.log('\n5. Section routing')
const article = (headline: string, fromDesk = false): Article => ({
  id: 'test', headline, description: '', source: 'Test',
  url: 'https://example.com', publishedAt: new Date().toISOString(),
  segment: 'headline', fromDesk,
})

const routing: [string, Segment, boolean][] = [
  // Belongs where it is filed.
  ['Parliament passes the finance bill after a late-night vote', 'politics', true],
  ['Foreign minister heads to the summit as ceasefire talks resume', 'world', true],
  ['Inflation eases as GDP growth beats forecasts', 'economy', true],
  ['Stocks rally as the central bank signals a rate cut', 'finance', true],
  // Filed in the wrong section by a shared feed.
  ['Stocks rally as the central bank signals a rate cut', 'politics', false],
  ['Parliament passes the finance bill after a late-night vote', 'world', false],
  ['Parents and teachers: share your views on half terms', 'finance', false],
  ['Thousands of fans gathered for the final', 'world', false],
  // Headlines is the catch-all and stays ungated.
  ['Thousands of fans gathered for the final', 'headline', true],
]
for (const [headline, segment, want] of routing) {
  check(
    `${segment} ${want ? 'keeps' : 'drops'} "${headline.slice(0, 46)}…"`,
    onTopic(article(headline), segment) === want,
  )
}

// A SUBJECT desk keeps an item no vocabulary recognises, but not one another
// section plainly owns.
check(
  'politics desk keeps an unrecognised story',
  onTopic(article('Storm Austen leaves thousands without power', true), 'politics'),
)
check(
  'desk feed still loses a story another section owns',
  !onTopic(article('Stocks rally as the central bank signals a rate cut', true), 'politics'),
)

// ...but a WORLD desk is not a subject desk. "World" means "foreign to the
// newsroom's own country", which on a page about a DIFFERENT country is no
// evidence the story is international — every foreign World desk covers that
// country's domestic news. This bypass was the main route by which general
// copy reached World, and general copy is what Headlines is made of: Brazil's
// World section came back 11-of-12 identical to its Headlines, padded with
// Petrobras earnings and an F1 contract; Spain's was a rail-crash memorial, a
// general strike and roosting house sparrows.
check(
  'world desk does NOT keep an unrecognised domestic story',
  !onTopic(article('Storm Austen leaves thousands without power', true), 'world'),
)
check(
  'world still keeps a genuinely international story from a desk',
  onTopic(article('Ambassador recalled as border treaty talks collapse', true), 'world'),
)
check(
  'world keeps an international story with no desk flag at all',
  onTopic(article('Ambassador recalled as border treaty talks collapse', false), 'world'),
)

// Vocabulary false positives, each found by sampling live World sections.
// A single generic term used to carry a whole story into World on its own.
check(
  'world drops an archaeology story ("occupation")',
  !onTopic(article('Bronze leg found in Scottish bog sheds new light on Roman occupation'), 'world'),
)
check(
  'world drops a remittances story ("overseas")',
  !onTopic(article('Overseas Pakistanis send home $14.8bn in four months'), 'world'),
)
check(
  'world drops a drug-trafficking arrest ("alliance")',
  !onTopic(article('Bolivia arrests former judge on suspicion of drug trafficking alliance'), 'world'),
)
// `nuclear` alone was mostly domestic energy; only the security senses survive.
check(
  'world drops a nuclear POWER story',
  !onTopic(article('Agency calls for stronger nuclear power oversight in Zambia'), 'world'),
)
check(
  'world drops a reactor build',
  !onTopic(article("South Africa's new nuclear build to be anchored on science"), 'world'),
)
check(
  'world keeps nuclear SUBMARINES',
  onTopic(article('Japan wants nuclear submarines, but can it overcome the obstacles?'), 'world'),
)
check(
  'world keeps denuclearization talks',
  onTopic(article('US says China agreed on talks to advance denuclearization'), 'world'),
)
check(
  'world keeps nuclear weapons',
  onTopic(article('Iran says it will never pursue nuclear weapons under the accord'), 'world'),
)

// ── On-page duplicates ────────────────────────────────────────────────────
// Both causes found by diffing rendered headlines on the live country pages.
{
  const withUrl = (headline: string, url: string): Article => ({ ...article(headline), url })
  const DW = 'Brazil electoral court fines Meta, sees no deliberate election bias'

  // 1. One article, two feed tags. These differ only after the "?".
  const a1 = withUrl(DW, 'https://www.dw.com/en/brazil-electoral-court-fines-meta/a-79920780?maca=en-rss-en-all-1573-rdf')
  const a2 = withUrl(DW, 'https://www.dw.com/en/brazil-electoral-court-fines-meta/a-79920780?maca=en-rss-en-world-4025-rdf')
  check('canonicalUrl strips feed campaign tags', canonicalUrl(a1.url) === canonicalUrl(a2.url))
  check('canonicalUrl strips utm_*', canonicalUrl('https://x.com/a?utm_source=rss&id=7') === canonicalUrl('https://x.com/a?id=7'))
  check('canonicalUrl keeps meaningful params', canonicalUrl('https://x.com/a?id=7') !== canonicalUrl('https://x.com/a?id=8'))

  const sieve1 = createShownStories()
  sieve1.add(a1)
  check('a page will not show the same article under two feed tags', sieve1.has(a2))

  // 2. Two genuinely different URLs for one story — a Google News redirect
  //    wrapper and the publisher's own link. Only the headline can catch this.
  const MUSEUM = 'A Museum’s ‘Wanted’ Poster Campaign Brings Looted Painting Back to France'
  const direct = withUrl(MUSEUM, 'https://www.nytimes.com/2026/11/11/world/europe/france-art-wanted-poster.html')
  const viaGoogle = withUrl(MUSEUM, 'https://news.google.com/rss/articles/CBMigwFBVV95cUxOR1NzdXZUMFFN?oc=5')
  const sieve2 = createShownStories()
  sieve2.add(direct)
  check('a page will not show one story via two different URLs', sieve2.has(viaGoogle))

  // ...but genuinely different stories must still both appear.
  const other = withUrl(
    'France summons Iranian ambassador over refrigeration cyberattack',
    'https://www.nytimes.com/2026/11/11/world/europe/france-iran-cyber.html',
  )
  check('two distinct stories are not collapsed', !sieve2.has(other))
}

// Vocabulary hygiene. A term listed under two segments would make `onTopic`'s
// `own >= best` tie meaningless — both sections would always score it equally
// and both would claim it, which is the duplication this gate exists to stop.
{
  const owners = new Map<string, string[]>()
  for (const [seg, terms] of Object.entries(TOPIC_TERMS)) {
    const seen = new Set<string>()
    const dups = terms.filter(t => seen.size === seen.add(t).size)
    check(`${seg} vocabulary has no duplicate terms`, dups.length === 0)
    for (const t of terms) owners.set(t, [...(owners.get(t) ?? []), seg])
  }
  const shared = [...owners.entries()].filter(([, segs]) => segs.length > 1)
  check(
    'no term is claimed by two segments',
    shared.length === 0,
  )
}

// Every segment id is routable.
for (const id of SEGMENT_IDS) {
  check(`${id} is a known segment`, SEGMENT_IDS.includes(id))
}

// ── 6. Headlines topic spread ─────────────────────────────────────────────
// Headlines is ungated, so for a country covered mainly by foreign desks it
// came back reading like a second copy of World. Ranking is preserved; repeats
// of a topic are pushed down to make room for the next-best story elsewhere.
console.log('\n6. Headlines topic spread')

const worldish = [
  'Ceasefire talks resume as the foreign minister flies in',
  'Troops withdraw from the border after the treaty is signed',
  'Ambassador recalled amid a diplomatic row over sanctions',
  'Refugees cross the border as the conflict widens',
  'Peace summit opens with the war high on the agenda',
]
const others = [
  'Inflation eases as GDP growth beats forecasts',
  'Stocks rally after the central bank signals a rate cut',
  'Parliament votes on the new cabinet',
  'Storm leaves thousands without power',
]
const spread = spreadTopics([...worldish, ...others].map(h => article(h)))

check('spread keeps every story', spread.length === worldish.length + others.length)
const leadTopics = spread.slice(0, 5).map(topicKey)
const topTopicRuns = Math.max(
  ...[...new Set(leadTopics)].map(t => leadTopics.filter(x => x === t).length),
)
check(
  'no more than 3 of one topic in the first five',
  topTopicRuns <= 3,
  `first five were ${leadTopics.join(', ')}`,
)
check(
  'the top-ranked story still leads',
  spread[0].headline === worldish[0],
  `led with "${spread[0].headline}"`,
)

// A single-topic country must still fill its page rather than be truncated.
const allWorld = spreadTopics(worldish.map(h => article(h)))
check('a single-topic list is not dropped', allWorld.length === worldish.length)

check('topicKey falls back to general', topicKey(article('Local choir wins a prize')) === 'general')

// ── 7. Newsroom identity and related-coverage ranking ─────────────────────
// Both of these shipped wrong once and were caught by eyeballing output, which
// is not a method.
console.log('\n7. Newsroom identity')

const sameOutlet: [string, string][] = [
  // A leading article is styling, not identity.
  ['The New York Times', 'New York Times'],
  ['The Guardian', 'Guardian'],
  // Syndication networks file under per-edition names.
  ['Investing.com UK', 'Investing.com India'],
  ['Investing.com', 'Investing.com Canada'],
]
for (const [a, b] of sameOutlet) {
  check(`"${a}" and "${b}" are one newsroom`, sourceKey(a) === sourceKey(b))
}

const differentOutlet: [string, string][] = [
  ['BBC', 'Sky News'],
  ['The Guardian', 'The Guardian Nigeria News'],
  ['Reuters', 'TradingView'],
]
for (const [a, b] of differentOutlet) {
  check(`"${a}" and "${b}" are different newsrooms`, sourceKey(a) !== sourceKey(b))
}

// A reader who hit a paywall wants somewhere they recognise, so the rows go to
// known newsrooms before syndication affiliates.
const ranked: [string, string][] = [
  ['BBC', 'Bozeman Daily Chronicle'],
  ['Reuters', 'KSMU Radio'],
  ['The Guardian', 'Wyoming Public Media'],
]
for (const [better, worse] of ranked) {
  check(
    `"${better}" outranks "${worse}" for a related row`,
    relatedRank(better) < relatedRank(worse),
  )
}

// ── Result ────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.\n`)
  process.exit(1)
}
console.log('\nAll checks passed.\n')
