'use client'
import { useEffect, useRef, useState } from 'react'
import NewsCard from './NewsCard'
import StoryModal from './StoryModal'
import type { Article } from '@/lib/news'

interface Props {
  articles: Article[]
  color: string
  segmentLabel: string
  countryName: string
}

/**
 * A grid of story cards that open the popup instead of navigating away.
 *
 * The country pages are server components, so the popup's state has to live
 * somewhere; this is that somewhere. It also owns the element that was
 * clicked, so closing the popup puts focus back where it came from rather than
 * dropping it at the top of the document.
 */
export default function StoryDeck({ articles, color, segmentLabel, countryName }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const grid = useRef<HTMLDivElement>(null)

  // Cards below the fold rise into place as they are scrolled to.
  //
  // Only the ones below the fold: a card already on screen is left exactly as
  // the server rendered it, so nothing is hidden and then shown again a frame
  // later. Everything here is additive, so with JavaScript off the deck is
  // simply the deck.
  useEffect(() => {
    const node = grid.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      entries => {
        // Cards crossing the line together cascade rather than snapping in as
        // a block. The delay is per batch, so it tracks the real grid instead
        // of assuming a column count.
        let n = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.style.transitionDelay = `${Math.min(n, 5) * 55}ms`
          el.classList.add('is-visible')
          observer.unobserve(el)
          n++
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )

    for (const card of Array.from(node.children)) {
      if (card.getBoundingClientRect().top < window.innerHeight) continue
      card.classList.add('will-reveal')
      observer.observe(card)
    }

    return () => observer.disconnect()
  }, [articles])

  function close() {
    setOpen(null)
    trigger.current?.focus()
    trigger.current = null
  }

  return (
    <>
      <div ref={grid} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
        gap: '15px',
      }}>
        {articles.map((a, i) => (
          <NewsCard
            key={`${a.source}-${a.url}`}
            article={a}
            color={color}
            onOpen={el => { trigger.current = el; setOpen(i) }}
          />
        ))}
      </div>

      {open !== null && articles[open] && (
        <StoryModal
          article={articles[open]}
          color={color}
          segmentLabel={segmentLabel}
          countryName={countryName}
          position={`${open + 1} of ${articles.length}`}
          onClose={close}
          onPrev={open > 0 ? () => setOpen(open - 1) : undefined}
          onNext={open < articles.length - 1 ? () => setOpen(open + 1) : undefined}
        />
      )}
    </>
  )
}
