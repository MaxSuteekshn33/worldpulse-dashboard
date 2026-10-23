# WorldPulse — Live News Intelligence

Interactive world news dashboard. Pick any of 200 countries and territories and get a
dedicated page with headlines, politics, world affairs, economy and finance —
refreshed every 20 minutes.

**Live:** https://worldpulse-dashboard-gov9.vercel.app

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page with search CTA + coverage stats |
| `/dashboard` | Static | World map, 200 pulse bubbles, centred country search |
| `/country/[code]` | ISR (20 min) | Per-country page: map backdrop + 5 sections, 5 stories each |
| `/country/[code]/[segment]` | ISR (20 min, on-demand) | Every story in one category |
| `/api/news` | Dynamic | Articles for one country + segment |
| `/api/pulse` | Dynamic | Dominant segment per country (powers bubble colours) |
| `/api/meta` | Dynamic | Coverage counts for the stats strip |

## Architecture

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Google Maps JS API** with `region=IN` so Indian borders render correctly
- **RSS only** — no API keys, no quotas, free forever

`lib/news.ts` is the single news engine. Both the API routes and the server-rendered
country page call `getSegmentNews()`, so caching and filtering behave identically.

### News freshness

Articles are cached for 20 minutes (`REVALIDATE_SECONDS`) and the country pages
revalidate on the same cadence. Three things keep the deck genuinely fresh:

1. **Sorted by real publish time.** Results from all feeds are merged and sorted
   newest-first. Previously they were concatenated per source and sliced, so a stale
   item from the first feed outranked a fresh one from the second.
2. **Stale items dropped.** Anything older than 7 days is filtered out, with a
   fallback to newest-available so a quiet country never renders blank.
3. **Relative time computed client-side.** Only the ISO timestamp is cached;
   `<TimeAgo>` derives "18m ago" live, so a cached page never reports a stale age.

### Section routing

A story's section used to be decided purely by which feed it arrived on, and
several feeds are wired into several sections at once — Arab News' site-wide
feed supplies headlines, politics, world AND finance; AllAfrica's supplies
three. So one story was filed three or four times and the tabs stopped meaning
anything: Headlines and World came back 9-of-12 identical for the US and
10-of-12 for France.

Every section except Headlines now gates on the text. `TOPIC_TERMS` in
`lib/news.ts` holds a broad vocabulary per section, and an article is kept only
if it scores for that section **and** scores at least as well there as in any
other. The second half is what matters: a single shared word shouldn't claim a
story when another desk's vocabulary is all over it, which is how a
cost-of-living piece stayed out of World and `share your views` stopped
registering as Finance.

Feeds that genuinely are one desk (`desk: true` — BBC Politics only ever files
politics) skip the check, but only when **no** section claims the story. The
Guardian's world feed carries UK domestic politics, and a `desk` bypass without
that condition put "UK politics live" under World.

Headlines is the catch-all top-stories view and stays ungated; it draws on
front-page feeds rather than desk feeds for the same reason. When gating leaves
a section under four items the ungated pool is used instead — most of the 200
countries have only a handful of stories at any moment, and a loose section
beats an empty one.

Across five countries this cut cross-section duplicates from 114 to 33 while
every section still filled.

When the gate leaves a section under four items the rest of the pool is added
back, but on-topic items still rank above it. Replacing the gated set outright,
as this first did, handed Brazil a World section that was nothing but election
coverage.

### Headlines, and not repeating itself

Two further things keep Headlines from reading like a second copy of World.

**Topic spread.** Headlines is ungated, so for a country covered mainly by
foreign desks its top five were five foreign-desk stories. Gating it would be
wrong — a war IS the top story — so ranking is preserved and repeats of a topic
are pushed down to make room for the next-best story on a different one. The
nth story of a topic may not appear before position `n * SPREAD_STRIDE`, which
puts at most three of any one topic in the first five and scales with the list
rather than imposing a fixed quota. A country with only one kind of news still
fills its page: when nothing else is left, ranked order resumes.

**Page-level preview dedupe.** Headlines is the front page and the four
sections below it are the detail, so `app/country/[code]/page.tsx` builds each
section's preview from the best items nothing above it has already shown. Only
the preview is deduplicated — section counts and the "see all" pages stay
complete, because World genuinely does contain the world story Headlines opened
with.

A thin section is shown short rather than padded back up to five with stories
the reader has just read. Padding was tried first and put three repeats on
Brazil's page on a build where its feeds came back nearly empty, which reads as
a bug rather than as a quiet news day. A section with nothing left at all still
shows its top story, so a heading never stands over nothing.

Repeated story links on a rendered country page: 3–4 → 0, with all 25 cards
still filled, Luxembourg and Mongolia included.

### Sources

Fifteen curated newsrooms, chosen for regional spread (`lib/sources.ts`):

| Region | Newsrooms |
|---|---|
| Global / UK / US | BBC, The Guardian, New York Times, Sky News |
| Europe | Euronews, Deutsche Welle |
| Middle East | Al Jazeera, Arab News |
| Africa | AllAfrica |
| Asia | Channel News Asia |
| Latin America | MercoPress |
| Australia | ABC News |
| India | Indian Express, Economic Times, Business Standard |

Plus a **per-country Google News search** feed, because even fifteen newsrooms
leave the long tail thin — Ireland and Lebanon both returned zero before it.
It uses the SEARCH endpoint, not the localised edition: Google only publishes
English editions for some countries and the rest silently fall back to the US
edition, which injected US stories into unrelated countries' pages.

Google News widens recall but hurts precision, so results are ranked rather than
sorted purely by time (`relevanceScore`): curated feed +4, reputable publisher
+3, country named in the headline +2, publish time breaks ties. Items whose
headline or publisher is mostly non-Latin are dropped.

> Dead or unusable, do not re-add without testing:
> - **CNN** (`rss.cnn.com/*`) — refuses connections outright.
> - **Sky News Australia** — every documented path returns 0 items or 404, which
>   is why Australian coverage comes from ABC News instead.
> - **Business Standard** topic feeds (`world-news`, `international`,
>   `current-affairs`) — frozen in 2023. Only `latest.rss`, `economy-102` and
>   `markets-106` are live.
> - **Reuters** (`feeds.reuters.com/*`) — refuses connections.

Deutsche Welle and Nikkei publish RSS 1.0 / RDF, where items sit at the document
root instead of under `<channel>`; the parser handles all three shapes.

Feeds that are inherently about one country (a national politics or business desk)
carry an `implies` code. A story on the Indian Express politics desk rarely contains
the word "India", so alias matching alone discarded most of them.

### Country matching

`lib/aliases.ts` holds match terms for all 200 countries. Matching is
**word-bounded, not substring** — naive `includes()` produced real false
positives at this scale ("Oman" inside "Romania"/"woman", "Mali" inside
"Somalia", "India" inside "Indiana", "US" inside "told us"). Because boundaries
are enforced, inflected forms no longer match implicitly, so every demonym is
listed explicitly ("India" will NOT match "Indian"). Short acronyms that collide
with ordinary words (`US`, `UK`, `UAE`, `DRC`) are matched case-sensitively.

Word boundaries alone cannot separate names nested inside other names, so
`excludes` handles those: "Guinea" sits inside "Equatorial Guinea" and "Papua
New Guinea", "Sudan" inside "South Sudan", "Ireland" inside "Northern Ireland",
"Mexico" inside "New Mexico", "Niger" inside "Niger Delta".

Excluded phrases are **scrubbed out of the text before matching**, not tested
against it. Vetoing the whole string threw away every legitimate hit that merely
shared a sentence with the longer name — an Ireland story that also mentioned
Northern Ireland, a Sudan story comparing it with South Sudan. Scrubbing removes
only the nested name, so "Papua New Guinea" still can't register as Guinea while
"Ireland and Northern Ireland" correctly matches Ireland.

### Checks

```bash
npm run check
```

Offline, no feeds fetched. Asserts every country has match terms, that each
matches its own name, and — the part worth having — walks all 200 x 199 ordered
country pairs asserting no country's name matches another country's matcher.
Then a set of known traps in both directions (Oman/Romania, Mali/Somalia,
India/Indiana, US/"told us", the nested-name pairs above), a set of section
routing cases, and the Headlines topic spread — that it keeps every story, puts
at most three of one topic in the first five, still leads with the top-ranked
story, and doesn't truncate a single-topic list. `scripts/ts-resolve.mjs` lets `node` run the TypeScript sources
directly, so there's no test runner to install.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
npm run check   # country + section matching regression checks
```

Requires `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local`. Pull it with:

```bash
vercel env pull .env.local --environment=preview
```

Note: the key is set for Preview and Production only — a plain `vercel env pull`
targets Development and will appear to be missing.

## Map rendering

Three things the Maps JS API will not do for you:

- **`backgroundColor: '#0B0B11'`.** Google paints the map div white until the
  first tile lands. On a dark page that reads as a map that failed to load, and
  tiles can take several seconds on a cold start.
- **`loading=async` plus the `callback` handshake.** Google warns on every load
  without `loading=async`, but under it the script's `onload` fires *before* the
  `google.maps` namespace is populated — resolving there hands callers a
  `google.maps` with no `Map` on it. `lib/loadGoogleMaps.ts` resolves on the
  documented callback instead.
- **Room for the attribution.** The Google logo is pinned to the map's
  bottom-left at `z-index: 1000000` and may not be hidden, so the stats strip
  gets out of its way — shifted right on desktop, lifted above it on compact.
  Before that, the "200" in "200 Countries" sat underneath it.

Pulse bubbles are drawn in three tiers by how much coverage a country has
(`TIERS` in `components/WorldMap.tsx`): quiet countries are a small dim dot with
no ring, active ones gain a static ring, and only the busiest pulse. With 200
markers on screen, ringing and animating all of them turned the map into one
undifferentiated shimmer and put 200 infinite animations behind the hero copy.

## Design tokens

Defined in `app/globals.css`. Accents are deliberately desaturated and glows are
kept low; raise contrast with weight and size rather than brightness.
