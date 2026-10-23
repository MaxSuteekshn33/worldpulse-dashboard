'use client'
import { ExternalLink, Layers } from 'lucide-react'
import TimeAgo from './TimeAgo'
import type { Article } from '@/lib/news'

interface Props {
  article: Article
  color: string
  /** Given, a plain click opens the story popup instead of leaving the page. */
  onOpen?: (trigger: HTMLElement) => void
}

export default function NewsCard({ article, color, onOpen }: Props) {
  const related = article.alsoReportedBy?.length ?? 0

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => {
        if (!onOpen) return
        // A modified or middle click means "open the publisher in a new tab",
        // and the href is right there to do it. Only the plain left click is
        // taken over by the popup.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        onOpen(e.currentTarget)
      }}
      className="news-card"
      style={{
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', textDecoration: 'none', height: '100%',
      }}
    >
      {article.imageUrl && (
        // Remote RSS thumbnails from many hosts — plain <img> avoids per-domain
        // next.config image allowlisting for every newsroom CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt=""
          loading="lazy"
          style={{
            width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
            background: 'var(--surface-3)', display: 'block',
          }}
        />
      )}

      <div style={{
        padding: '14px 15px 15px',
        display: 'flex', flexDirection: 'column', gap: '8px', flex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
          <span className="mono-label" style={{ color: 'var(--text-2)' }}>
            {article.source}
          </span>
          <span className="mono-meta" style={{ color: 'var(--text-4)', marginLeft: 'auto' }}>
            <TimeAgo iso={article.publishedAt} />
          </span>
        </div>

        <h3 className="headline-text" style={{ margin: 0 }}>
          {article.headline}
        </h3>

        {article.description && (
          <p style={{
            fontSize: '13.5px', fontWeight: 450, lineHeight: 1.5,
            color: 'var(--text-3)', margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {article.description}
          </p>
        )}

        <span style={{
          marginTop: 'auto', paddingTop: '4px',
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          fontSize: '12px', fontWeight: 600, color: 'var(--text-4)',
        }}>
          {onOpen ? 'Read' : <>Read <ExternalLink size={11} strokeWidth={2.5} /></>}
          {/* Says the popup has something the card doesn't, so the extra
              newsrooms aren't hidden behind a click nobody takes. */}
          {related > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={11} strokeWidth={2.5} />
              {related + 1} sources
            </span>
          )}
        </span>
      </div>
    </a>
  )
}
