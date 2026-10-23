import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { COUNTRIES, getCountryByCode, getCountryZoom } from '@/lib/countries'
import { SEGMENTS } from '@/lib/segments'
import { getSegmentNews, REVALIDATE_SECONDS } from '@/lib/news'
import CountryMapBg from '@/components/CountryMapBg'
import CountrySearch from '@/components/CountrySearch'
import NewsCard from '@/components/NewsCard'
import SegmentNav from '@/components/SegmentNav'
import TimeAgo from '@/components/TimeAgo'

/** Re-render from fresh feeds every 20 minutes. */
export const revalidate = 1200

export function generateStaticParams() {
  return COUNTRIES.map(c => ({ code: c.code }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> },
): Promise<Metadata> {
  const { code } = await params
  const country = getCountryByCode(code.toUpperCase())
  if (!country) return { title: 'Country not found — WorldPulse' }
  return {
    title: `${country.name} news — WorldPulse`,
    description: `Live headlines, politics, world, economy and finance coverage for ${country.name}.`,
  }
}

export default async function CountryPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const country = getCountryByCode(code.toUpperCase())
  if (!country) notFound()

  const results = await Promise.all(
    SEGMENTS.map(async seg => ({
      meta: seg,
      ...(await getSegmentNews(country.code, seg.id, 9)),
    })),
  )

  const totalArticles = results.reduce((n, r) => n + r.articles.length, 0)
  const newest = results
    .flatMap(r => r.articles)
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
            href="/dashboard"
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
            Map
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

      {/* ── HERO: country map backdrop ── */}
      <section style={{ position: 'relative', height: 'clamp(230px, 32vh, 340px)', overflow: 'hidden' }}>
        <CountryMapBg lat={country.lat} lng={country.lng} zoom={getCountryZoom(country.code)} />

        {/* Legibility scrim */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(8,8,12,.30) 0%, rgba(8,8,12,.58) 48%, rgba(8,8,12,.88) 82%, var(--bg) 100%)',
        }} />

        <div style={{
          position: 'absolute', inset: 0,
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 28px) 26px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <span style={{ fontSize: 'clamp(34px, 5vw, 46px)', lineHeight: 1 }} aria-hidden>
              {country.flag}
            </span>
            <div>
              <h1 className="display-xl" style={{ marginBottom: '4px' }}>{country.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="mono-label" style={{ color: 'var(--accent-bright)' }}>
                  {country.code}
                </span>
                <span style={{ color: 'var(--text-4)' }}>·</span>
                <span className="mono-meta" style={{ color: 'var(--text-3)' }}>
                  {totalArticles} {totalArticles === 1 ? 'story' : 'stories'}
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
        </div>
      </section>

      {/* ── CATEGORY NAV ── */}
      <SegmentNav counts={Object.fromEntries(results.map(r => [r.meta.id, r.articles.length]))} />

      {/* ── NEWS SECTIONS ── */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '8px clamp(16px, 3vw, 28px) 80px',
      }}>
        {results.map(({ meta, articles }) => (
          <section
            key={meta.id}
            id={meta.id}
            style={{ scrollMarginTop: '120px', paddingTop: '34px' }}
          >
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '12px',
              marginBottom: '16px', flexWrap: 'wrap',
            }}>
              <span style={{
                width: '4px', height: '20px', borderRadius: '2px',
                background: meta.color, alignSelf: 'center',
              }} />
              <h2 className="heading-md">{meta.label}</h2>
              <span style={{ fontSize: '13.5px', fontWeight: 450, color: 'var(--text-3)' }}>
                {meta.blurb}
              </span>
              <span className="mono-meta" style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>
                {articles.length}
              </span>
            </div>

            {articles.length === 0 ? (
              <div style={{
                border: '1px dashed var(--border-mid)', borderRadius: '13px',
                padding: '30px 22px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
                <Newspaper size={19} strokeWidth={2} color="var(--text-4)" />
                <p style={{ fontSize: '14.5px', fontWeight: 500, color: 'var(--text-2)' }}>
                  No {meta.label.toLowerCase()} coverage for {country.name} right now
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-4)', maxWidth: '420px' }}>
                  Our newsrooms haven&apos;t filed a matching story in the last few days.
                  This refreshes every 20 minutes.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
                gap: '15px',
              }}>
                {articles.map(a => (
                  <NewsCard key={`${a.source}-${a.url}`} article={a} color={meta.color} />
                ))}
              </div>
            )}
          </section>
        ))}
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
            href="/dashboard"
            style={{
              marginLeft: 'auto', fontSize: '13px', fontWeight: 600,
              color: 'var(--accent-bright)', textDecoration: 'none',
            }}
          >
            ← Back to world map
          </Link>
        </div>
      </footer>
    </main>
  )
}
