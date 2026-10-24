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
a bug rather than as a quiet news day. A section whose stories all ran higher up
says exactly that and links to its full list, which beats both repeating and a
bare heading.

Repeated story links on a rendered country page: 3–4 → 0.

## Pictures are a section-level decision

Feeds carry images very unevenly. A UK section comes back mostly illustrated;
Kenya's, drawn from wire desks, had a picture on exactly **1 of 25** stories.
Rendering each card's image independently meant that one 16:9 banner sat among
two dozen text cards looking like a mistake, and stretched every other card in
its row into dead space.

So `StoryDeck` decides once per section: if at least half the stories have a
picture, every card gets a block — the few without get a tinted stand-in — and
otherwise none do. Cards in a section are then structurally identical either
way, which is what makes the grid read as a grid.

## Motion and loading states

`globals.css` had defined `.fade-up` and `.shimmer` for a while and used
neither; there was no loading state anywhere in the app. Three things now use
them, and all three are additive — turn JavaScript off and the pages are
unchanged.

**Loading.** `loading.tsx` under both country routes streams a skeleton the
moment a link is clicked. It matters more here than in most apps: only five
countries are prerendered, so for the other 195 the first visit renders on
demand while feeds are fetched, and until now that time was spent looking at
the previous page. The skeletons mirror the real layout — same hero height,
same card proportions, same grid — so nothing jumps when content lands. On the
dashboard, `WorldMap` shows a placeholder until the map's own `tilesloaded`
fires, which is a real signal rather than a guessed timeout.

**Cards rise in as you scroll.** `StoryDeck` adds `will-reveal` **only to cards
that start below the fold**, so a card already on screen is left exactly as the
server rendered it and nothing is hidden and then shown again a frame later.

Two jobs, two mechanisms, because each is bad at the other's:

- **Which cards start below the fold** is the IntersectionObserver's call,
  because it measures after layout. Measuring by hand on mount shipped broken:
  on a prerendered page the effect runs before card heights have settled, every
  card reads as above the fold, and the whole deck is skipped. The live site did
  exactly that while localhost, its images already cached, looked fine.
- **Revealing them** is a scroll handler's, because an observer cannot do it. A
  flick or an anchor jump moves a card from below the viewport to above it
  without ever intersecting — its state never changes, so no callback fires.
  Jumping to the bottom of a UK page left 16 of 25 cards sitting blank behind
  the reader. The handler is rAF-throttled and runs once after classification,
  so a restored scroll position settles too.

Cards crossing the line together get a staggered `transition-delay` computed per
pass, so the cascade follows the real grid instead of assuming a column count.

**The stats strip counts up.** `CountUp` starts at its final value — what the
server renders, what you get without JavaScript, and what anyone who asked for
reduced motion keeps — and animates only on the client. It sets no state in the
effect body; the first animation frame computes the value, which also avoids
the `react-hooks/set-state-in-effect` error this repo treats as fatal.

Every one of these honours `prefers-reduced-motion`, including the skeletons:
a loading state that pulses forever is worse than a still one for someone who
asked the system to stop moving things.

## The story popup

Clicking a headline opens `components/StoryModal.tsx` rather than leaving the
page: source and time, the headline, section and country chips, the blurb where
there is one, **Also reported by**, and a "Read full story" button to the
original. Esc, the X and the backdrop close it; arrow keys and the footer
buttons move through the section without closing; focus is trapped while it's
open and returned to the card that opened it. On a phone it's a bottom sheet
you can drag down to dismiss.

A plain left click opens the popup. A modified or middle click is left alone —
that gesture means "open the publisher in a new tab", and the `href` is still
there to do it.

### Also reported by, and the way past a paywall

A paywall on the outlet you happened to land on is not a paywall on the story.
`lib/sources.ts` records how much of each publisher's journalism is reachable
without paying (`free` / `metered` / `subscription`), every sibling row carries
that label, and when the outlet you're reading is paywalled and one that ran
the same story isn't, the popup says so and links there.

Two things this is **not**: it never routes around a publisher's paywall (no
archive mirrors, no AMP tricks, no referrer games), and the badge describes the
*publisher's* general policy, never a promise about one article.

### Clustering: two thresholds, not one

The clustering that powers this already existed — it was being used to *drop*
near-identical wire copy from the deck, and the duplicates were thrown away.
They're now kept and attached to the story that outranked them.

That alone wasn't enough. One threshold was doing two jobs and only doing the
first well: at `SAME_STORY` (0.6) the clustering caught near-verbatim reprints
and almost nothing else, so a sample of 357 stories had a sibling **7%** of the
time. Two newsrooms writing up the same event in their own words land well
below 0.6.

The two jobs can afford different error rates. Merging two distinct stories
removes one from the page, so that stays at 0.6. Listing a loosely-related
story costs a reader one glance, so `RELATED_STORY` (0.42) decides that, in a
second pass over the stories that each kept their place. Coverage went 7% →
**12%**, with the matches still being the same real events.

Three more things that had to be right, each of which shipped wrong first and
is now in `npm run check`:

- **Syndicated editions are one newsroom.** "Investing.com", "Investing.com
  UK" and "Investing.com India" were listed as three outlets.
- **A leading article is styling, not identity.** "New York Times" and "The New
  York Times" are the same paper; before `sourceKey` stripped the article, the
  NYT appeared in its own "Also reported by".
- **Known newsrooms take the rows first.** Syndication fans one piece across
  affiliates — an NPR story onto member stations, an AP story onto local
  papers. Those can't be spotted by name, but they can be outranked, so with
  only three rows a reader gets BBC before Wyoming Public Media.

Google News also sets each item's description to the title plus the publisher,
so cards and popups were printing the headline twice; a description that only
repeats the headline is now dropped.

## The dashboard's call to action

`components/CountryPanel.tsx` — a panel that slides out of the left edge,
collapsed by default to a labelled rectangle.

It was a centred hero, which put the product's own copy over the middle of the
map, the part people came to look at, and left nowhere on the screen to put
anything else. The middle is now free for whatever the dashboard grows next.

**It opens on a first visit and remembers the choice after that**, so nobody
has to discover the search behind a button, and nobody who collapses it has to
collapse it again. The preference lives in `localStorage` and is read through
`useSyncExternalStore` — the same shape `lib/useMediaQuery.ts` uses, and for
the same reason: the real value lives outside React and can't be read on the
server, so it needs a server snapshot rather than a state update fired from an
effect. Every access is wrapped, because the store throws in private mode and
an unreadable store should just look like a first visit.

Two consequences of the server not being able to read that store:

- The server's HTML always shows the collapsed panel, so with transitions live
  from the start everyone who left it open watched it slide in again on every
  load. The `.cta-slide` / `.cta-ready` pair in `globals.css` keeps transitions
  off until the restored state has been painted once; the class is added to the
  node a frame after mount, so restoring a preference costs no render and only
  the viewer's own toggles animate.
- The search is focused only when the viewer opened the panel themselves. A
  panel restored from a previous visit must not grab focus on load.

Both states stay mounted and cross-slide. The hidden one is `visibility:
hidden`, which also takes its input and links out of the tab order, so there is
never a focusable control behind the one that is showing. Escape collapses it;
there is deliberately **no** click-outside, because the surface behind the panel
is a draggable map and ending a pan would snap it shut.

The expanded card is deliberately **not** a scroll container. `CountrySearch`
hangs its results in an absolutely positioned list below the field, and any
`overflow` on the card clips that list to the card's bounds — a seven-country
result came back showing two.

The panel also owns the map scrim, which is sized to whichever state it is in:
a narrow wash along the left edge when collapsed, wider and darker when open.
The scrim used to be a radial centred on the hero, which darkened the middle of
the map for copy that no longer sits there.

## Page transitions, only where they can't hurt

A view transition freezes the old page until the new route commits. That is
fine toward a prerendered route and actively harmful toward one that renders on
demand — the first attempt at this wrapped every navigation (React's
`ViewTransition` behind `experimental.viewTransition`) and it hid the loading
skeletons on exactly the 195 country pages that need them, then aborted with
`TimeoutError: Transition was aborted because of timeout in DOM update` after
holding the page still for four seconds.

`components/NavTransition.tsx` is the scoped version, and it's safe for two
reasons:

- **It only runs toward prerendered routes** — `/`, `/dashboard` and the five
  `FEATURED_CODES` countries. `FastLink` falls through to an ordinary
  navigation for anything else, so on-demand pages still show their skeleton
  the instant they're clicked.
- **The freeze is capped.** The browser waits on the callback's promise, which
  resolves when the route commits *or* after `FREEZE_CAP` (220ms), whichever
  comes first. Being wrong about a route costs a fifth of a second rather than
  four seconds and an uncaught error.

It calls `document.startViewTransition` directly, so the app stays on stable
React instead of moving to the experimental channel for a cross-fade.

Measured: 1 transition on `/` → `/dashboard`, **0** on
`/country/IN` → `/country/IN/headline`, no console errors either way.

## The landing page shows its work

The hero said *"The world is happening. Track it live."* over a decorative map
with nothing on the page to back it up — a visitor had to search before seeing
that the product had any content at all.

A **Live now** strip above the stats carries the current top story from each
featured country: flag, headline, how long ago, linking into that country's
page. Three on desktop, one on a phone, each truncating rather than wrapping,
so the page stays exactly one screen at both sizes.

That meant splitting the route. `app/page.tsx` is now a thin server component
whose only job is fetching those stories; the page itself still renders in
`components/Landing.tsx`, which needs the viewport hook and so stays on the
client. It only asks for `FEATURED_CODES` and only their top story each —
those five country pages are prerendered anyway, so the feeds are already being
fetched and Next's cache makes this close to free.

The stats strip also counts up now, as the dashboard's already did.

## The map is one tab stop

Every marker used to carry `tabindex="0"`, so a keyboard user tabbed through
**200 bubbles** before reaching anything below the map. The dashboard had around
215 tab stops; it now has 16.

It works the way a composite widget should: exactly one marker is reachable by
Tab (a roving tabindex), and arrow keys move within the map to the nearest
country **in that direction** — not the next one in the list, because on a map
"next" means next on screen. Distance along the travel axis counts double
against distance across it, so pressing right from France reaches Germany
rather than wandering up to Norway. Measured: right from Algeria goes Libya,
Egypt, Israel.

Focus gets the same treatment as hover — the tooltip opens and the dot grows —
plus a `:focus-visible` ring, since there is no useful browser default on a
24px transparent box over a dark map. Arrow keys are also `preventDefault`ed,
because Google Maps pans on them by default and would otherwise fight the
navigation.

## The map arrives

Two pieces of motion, both on `components/WorldMap.tsx`.

**The bubbles sweep in west to east.** They used to appear in a single frame,
which read as a repaint rather than as the world reporting in. Each marker's
entrance delay comes from its longitude (`SWEEP_MS`, 850ms end to end, plus a
little jitter so neighbours on a meridian don't land in lockstep), and the
sweep starts on the map's own `tilesloaded` event — bubbles arriving over a
blank panel just look like a glitch.

**A bubble that lights up gets one ring.** The long tail fills in over about
nine batched requests, and those bubbles used to snap from grey to coloured
with nothing to mark it. `paint()` now plays a single expanding ring when a
country that was quiet gets a reading.

Only the batch fills announce themselves. The first pass lights around a
hundred countries at once, and a hundred simultaneous rings reads as a fault
rather than as news arriving — so `apply()` takes an `announce` flag that only
`fillQuiet` sets.

The ring's class is removed on `animationend`. Left on, it accumulated across
every marker ever filled — invisible, since the animation ends at zero opacity,
but it made the live count unreadable and is not a state to leave 200 nodes in.

## The map and the pages agree

The dashboard's bubbles come from `/api/pulse`, and that endpoint used to read
only the 15 curated newsrooms — while a country page reads those **plus** the
per-country Google News search. The search is the thing that gives the long
tail its coverage, so the map was looking at a narrower feed set than the pages
it links to, and reported half the world as quiet. Luxembourg's page carried 24
stories while its bubble sat grey, and so did 98 others.

Asking for all 200 searches in one request is what made that look like a
necessary trade-off: Google refuses a burst that size outright (see the
rate-limit note below). So the work is split by cost.

| Request | Covers | Cost |
|---|---|---|
| `/api/pulse` | all 200, scored against the curated wires | one set of feed fetches |
| `/api/pulse?codes=…` | up to `PULSE_BATCH` (12) countries, from the per-country search | one search per country |

The map makes the bare call, paints what comes back, then asks for the
countries that came back quiet in batches of 12 — about nine follow-up requests,
run one after another rather than at once. Each is cached server-side for the
usual 20 minutes, so the fill is paid for once and the next visitor gets it
warm. The route reports its own `batchSize` rather than the client hard-coding
it, because `WorldMap` is a client component and importing `lib/news.ts` for one
number would drag the whole news engine into the browser bundle.

The long-tail pulse runs **one** search per country, not one per section: the
unsegmented query is the broadest net, and the stories that come back are sorted
with `topicKey` — the same vocabulary the country pages file by. So a bubble's
colour and the sections behind it now come from one classifier instead of two.

Two things this got wrong on the first pass, both caught against the live
deployment:

- **Only classified stories vote.** Counting `general` alongside the rest let it
  win almost every time, because most headlines use none of the section
  vocabularies — every long-tail country came back "headlines", which would have
  painted that half of the map a single colour. Headlines is still the fallback
  when *nothing* classifies; it just can't outvote the sections that do.
- **The two halves are not on one scale.** A curated count is a share of a few
  hundred wire stories, so 4+ genuinely means a lot is happening. A search count
  is a share of the ~100 items Google returns for any country that exists, so it
  clears 4 for everywhere from Luxembourg to Tuvalu. Ranked together the long
  tail would outshout the countries actually leading the news, so the pulsing
  `hot` tier stays reserved for wire readings; a search reading renders
  `active` — a solid dot and a ring, no animation.

## Clicking a country answers immediately

Next keeps the **old** page on screen until the new route is ready, and its
`loading.tsx` boundary does not show on these navigations — measured on a
search-to-country jump, the URL and the content both appeared at 636ms with no
skeleton in between. On a country whose feeds are slow that is several seconds
of a page that looks like it ignored the click, which is what "lag" actually
was here.

So the pending state is owned rather than inferred. `NavTransition` runs every
in-app navigation inside a `useTransition`, and while it is pending shows a
full-screen wait naming the destination — flag, country, "Gathering the
latest". It names the country deliberately: the thing a reader wants confirmed
after clicking is that the click landed where they meant.

Every route into a country goes through that helper — `FastLink` for links,
`useSoftNav` for the search's imperative push, the map markers already did — so
the wait can never be bypassed.

Measured: wait screen up at the keypress, gone at 953ms exactly when the cards
render.

## One Google News search per country, not five

Each section used to add its own query terms, so a single country page made
**five** separate requests to Google News. Google rate-limits that endpoint,
and low-coverage countries are where it hurts: those pages lean on the search
almost entirely, so a throttled request both slows the render and thins the
page — and ISR then caches the thin result for twenty minutes. Algeria was
served as a 4-story page for exactly that reason while its API returned 60.

The bare country name is the broadest net anyway, every section now requests
the identical URL so Next's fetch cache collapses them into one, and the topic
gate already sorts what comes back. Cold low-coverage pages went from ~2–4s to
**0.8–1.4s** with content intact (Algeria 49 stories, DR Congo 51).

## Why clicking a country used to lag

Two separate costs, measured rather than guessed.

**The slowest feed sets the page's speed.** Every feed is fetched in parallel,
so a country page waits for whichever one answers last — which makes the
per-feed timeout the page's worst case, not one feed's budget. It was 8
seconds. Timing the feeds individually: most answer in under 2s, Euronews took
3.9s, and the Guardian hung past 20. `FEED_TIMEOUT_MS` is now **3s**; losing a
straggler costs one source out of fifteen and the section fills from the rest,
while waiting for it costs every reader.

**The click itself.** Only five countries are prerendered, so the rest render
on demand — measured live at 1.8–2.8s cold against 0.34s for a prerendered
one. Hovering a map bubble, or highlighting a country in the search, now calls
`router.prefetch` for that country (once per country — prefetch caches, and
re-asking on every mouseenter is noise). The work happens while the reader is
still aiming, so by the time they click there is nothing left to wait for.

Cold country pages measured 1.1–1.5s after the timeout change, down from
1.8–2.8s.

## Why only five countries are prerendered

`generateStaticParams` returns `FEATURED_CODES`, not all 200. Building every
country page was actively harmful.

Most of the 200 have no curated-wire coverage at all, so their only source is
the per-country Google News search — and Google rate-limits it. A build that
prerenders 200 country pages fires roughly a thousand of those searches in a
few seconds and gets a `302` to `google.com/sorry/`, which follows through to an
HTML page the feed parser reads as zero items. Whatever a page got at build is
then frozen until its next revalidation, so the small countries shipped as "no
coverage" pages while `/api/news` was returning plenty for them at that same
moment: Luxembourg, Slovenia, Paraguay and Uruguay all rendered empty, with
Malta at one story and Latvia at five.

Built on demand, one page per request, the searches are spread out and the
feeds answer. The build drops from 208 pages in ~26s to 13 in ~3s, and a cold
country page renders in 1–2s before being cached on the usual 20-minute cycle.
The `[segment]` pages were already on demand for a related reason.

> The rate limit is easy to trip from a dev machine too — if every country
> suddenly returns nothing locally, check for the `/sorry/` redirect before
> suspecting the matching code:
>
> ```bash
> curl -sI "https://news.google.com/rss/search?q=%22France%22" | head -1
> ```

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
