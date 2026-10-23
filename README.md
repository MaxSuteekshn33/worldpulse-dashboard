# WorldPulse — Live News Intelligence

Interactive world news dashboard. Pick a country on the map, get a dedicated page with
headlines, politics, world affairs, economy and finance — refreshed every 20 minutes.

**Live:** https://worldpulse-dashboard-gov9.vercel.app

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page with search CTA + coverage stats |
| `/dashboard` | Static | World map, 50 pulse bubbles, centred country search |
| `/country/[code]` | ISR (20 min) | Per-country page: map backdrop + 5 news sections |
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

BBC, The Guardian, Al Jazeera, Indian Express, Sky News.

> Every CNN endpoint (`rss.cnn.com/*`) is dead — it refuses connections outright.
> It was one of only three original sources, which is why whole segments used to
> come back empty. Do not re-add it without testing.

Feeds that are inherently about one country (a national politics or business desk)
carry an `implies` code. A story on the Indian Express politics desk rarely contains
the word "India", so alias matching alone discarded most of them.

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
