# WorldPulse — Live News Intelligence

Interactive world news dashboard. Pick any of 100 countries on the map and get a
dedicated page with headlines, politics, world affairs, economy and finance —
refreshed every 20 minutes.

**Live:** https://worldpulse-dashboard-gov9.vercel.app

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page with search CTA + coverage stats |
| `/dashboard` | Static | World map, 100 pulse bubbles, centred country search |
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

### Sources

Ten curated newsrooms: BBC, The Guardian, Al Jazeera, New York Times, Euronews,
ABC News (Australia), Indian Express, Economic Times, Business Standard, Sky News.

Plus a **per-country Google News search** feed, because the curated ten skew
UK/US/India/Australia — Ireland and Lebanon both returned zero before it.
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

Feeds that are inherently about one country (a national politics or business desk)
carry an `implies` code. A story on the Indian Express politics desk rarely contains
the word "India", so alias matching alone discarded most of them.

### Country matching

`lib/aliases.ts` holds match terms for all 100 countries. Matching is
**word-bounded, not substring** — naive `includes()` produced real false
positives at this scale ("Oman" inside "Romania"/"woman", "Mali" inside
"Somalia", "India" inside "Indiana", "US" inside "told us"). Because boundaries
are enforced, inflected forms no longer match implicitly, so every demonym is
listed explicitly ("India" will NOT match "Indian"). Short acronyms that collide
with ordinary words (`US`, `UK`, `UAE`, `DRC`) are matched case-sensitively.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
```

Requires `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local`. Pull it with:

```bash
vercel env pull .env.local --environment=preview
```

Note: the key is set for Preview and Production only — a plain `vercel env pull`
targets Development and will appear to be missing.

## Design tokens

Defined in `app/globals.css`. Accents are deliberately desaturated and glows are
kept low; raise contrast with weight and size rather than brightness.
