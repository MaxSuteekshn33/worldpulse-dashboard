'use client'
import { useEffect, useState } from 'react'
import { SEGMENTS } from '@/lib/segments'

/** Sticky in-page category nav that highlights the section currently in view. */
export default function SegmentNav({ counts }: { counts: Record<string, number> }) {
  const [active, setActive] = useState<string>(SEGMENTS[0].id)

  useEffect(() => {
    const sections = SEGMENTS
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-130px 0px -55% 0px', threshold: 0 },
    )

    sections.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      aria-label="News categories"
      style={{
        position: 'sticky', top: 'calc(58px + var(--safe-top))', zIndex: 350,
        background: 'rgba(8,8,12,.92)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 28px)',
          display: 'flex', gap: '6px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}
      >
        {SEGMENTS.map(s => {
          const isActive = active === s.id
          const n = counts[s.id] ?? 0
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={isActive ? 'true' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 13px', whiteSpace: 'nowrap',
                fontSize: '14px', fontWeight: 650, letterSpacing: '-.01em',
                color: isActive ? 'var(--text)' : 'var(--text-3)',
                textDecoration: 'none',
                borderBottom: `2px solid ${isActive ? s.color : 'transparent'}`,
                transition: 'color .18s ease, border-color .18s ease',
              }}
            >
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: s.color,
                opacity: isActive ? 1 : .55,
                boxShadow: isActive ? `0 0 7px ${s.color}` : 'none',
                transition: 'opacity .18s ease',
              }} />
              {s.label}
              <span
                className="mono-meta"
                style={{
                  color: isActive ? 'var(--text-3)' : 'var(--text-4)',
                  fontSize: '10.5px',
                }}
              >
                {n}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
