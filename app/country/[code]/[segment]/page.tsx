import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { getCountryByCode } from '@/lib/countries'
import { SEGMENTS, SEGMENT_IDS, getSegment, type Segment } from '@/lib/segments'
import { getSegmentNews, REVALIDATE_SECONDS } from '@/lib/news'
import CountrySearch from '@/components/CountrySearch'
import StoryDeck from '@/components/StoryDeck'
import TimeAgo from '@/components/TimeAgo'

export const revalidate = 1200

/**
 * Rendered on demand rather than prerendered: 100 countries × 5 segments is 500
 * extra pages, which would dominate build time for routes most users never open.
 * Each one is cached for 20 minutes after its first hit.
 */
export const dynamicParams = true
export function generateStaticParams() { return [] }

/** Everything the deck has for this segment, not just the 5-item preview. */
const FULL_LIMIT = 40

type Params = Promise<{ code: string; segment: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code, segment } = await params
  const country = getCountryByCode(code.toUpperCase())
  if (!country || !SEGMENT_IDS.includes(segment as Segment)) {
    return { title: 'Not found — WorldPulse' }
  }
  const seg = getSegment(segment)
  return {
    title: `${country.name} ${seg.label.toLowerCase()} — WorldPulse`,
    description: `All ${seg.label.toLowerCase()} coverage for ${country.name}, refreshed every 20 minutes.`,
  }
}

export default async function SegmentPage({ params }: { params: Params }) {
  const { code, segment } = await params
  const country = getCountryByCode(code.toUpperCase())
  if (!country) notFound()
  if (!SEGMENT_IDS.includes(segment as Segment)) notFound()

  const meta = getSegment(segment)
  const { articles } = await getSegmentNews(country.code, segment as Segment, FULL_LIMIT)

  const newest = articles
    .map(a => Date.parse(a.publishedAt))
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => b - a)[0]

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* ── STICKY TOP BAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 400,
        paddingTop: 'var(--safe-top)',
        background: 'rgba(8,8,12,.9)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 28px)',
          height: '58px', display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <Link
            href={`/country/${country.code}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 13px', borderRadius: '9px',
              border: '1px solid var(--border-mid)',
              background: 'var(--surface-1)',
              fontSize: '13px', fontWeight: 600, color: 'var(--text-2)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
            {country.name}
          </Link>

          <Link href="/" className="hide-sm" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: '17px',
              color: 'var(--text)', letterSpacing: '-.03em',
            }}>
              WORLD<span style={{ color: 'var(--accent)' }}>PULSE</span>
            </span>
          </Link>

          <div style={{ marginLeft: 'auto', width: 'min(290px, 62vw)', flexShrink: 1, minWidth: 0 }}>
            <CountrySearch size="compact" placeholder="Another country…" />
          </div>
        </div>
      </header>

      {/* ── SECTION HEADER ── */}
      <section style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '30px clamp(16px, 3vw, 28px) 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '10px' }}>
          <span style={{ fontSize: '34px', lineHeight: 1 }} aria-hidden>{country.flag}</span>
          <div>
            <h1 className="display-lg" style={{ marginBottom: '3px' }}>
              {country.name} <span style={{ color: meta.color }}>{meta.label}</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 450, color: 'var(--text-3)' }}>
                {meta.blurb}
              </span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span className="mono-meta" style={{ color: 'var(--text-3)' }}>
                {articles.length} {articles.length === 1 ? 'story' : 'stories'}
              </span>
              {newest && (
                <>
                  <span style={{ color: 'var(--text-4)' }}>·</span>
                  <span className="mono-meta" style={{ color: 'var(--text-3)' }}>
                    latest <TimeAgo iso={new Date(newest).toISOString()} />
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sibling categories */}
        <nav
          aria-label="Other categories"
          className="no-scrollbar"
          style={{
            display: 'flex', gap: '7px', overflowX: 'auto',
            paddingBottom: '4px', marginTop: '18px',
          }}
        >
          {SEGMENTS.map(s => {
            const active = s.id === meta.id
            return (
              <Link
                key={s.id}
                href={`/country/${country.code}/${s.id}`}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '8px 13px', borderRadius: '999px', whiteSpace: 'nowrap',
                  background: active ? s.tint : 'var(--surface-1)',
                  border: `1px solid ${active ? s.color + '55' : 'var(--border)'}`,
                  fontSize: '13px', fontWeight: 600,
                  color: active ? 'var(--text)' : 'var(--text-3)',
                  textDecoration: 'none', letterSpacing: '-.01em',
                }}
              >
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: s.color, opacity: active ? 1 : .6,
                }} />
                {s.label}
              </Link>
            )
          })}
        </nav>
      </section>

      {/* ── ALL ARTICLES ── */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '26px clamp(16px, 3vw, 28px) 80px',
      }}>
        {articles.length === 0 ? (
          <div style={{
            border: '1px dashed var(--border-mid)', borderRadius: '13px',
            padding: '44px 22px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px',
          }}>
            <Newspaper size={22} strokeWidth={2} color="var(--text-4)" />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-2)' }}>
              No {meta.label.toLowerCase()} coverage for {country.name} right now
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--text-4)', maxWidth: '430px' }}>
              None of our newsrooms have filed a matching story in the last few days.
              This page refreshes every {Math.round(REVALIDATE_SECONDS / 60)} minutes.
            </p>
          </div>
        ) : (
          <StoryDeck
            articles={articles}
            color={meta.color}
            segmentLabel={meta.label}
            countryName={country.name}
          />
        )}
      </div>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px clamp(16px, 3vw, 28px) calc(20px + var(--safe-bottom))',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span className="mono-label" style={{ color: 'var(--text-4)' }}>
            WorldPulse · refreshed every {Math.round(REVALIDATE_SECONDS / 60)} min
          </span>
          <Link
            href={`/country/${country.code}`}
            style={{
              marginLeft: 'auto', fontSize: '13px', fontWeight: 600,
              color: 'var(--accent-bright)', textDecoration: 'none',
            }}
          >
            ← All {country.name} news
          </Link>
        </div>
      </footer>
    </main>
  )
}
