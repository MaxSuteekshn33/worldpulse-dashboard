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
  // Two jobs, two mechanisms, because each is bad at the other's.
  //
  // Deciding WHICH cards start below the fold is the observer's, because it
  // measures after layout. Measuring by hand on mount shipped broken: on a
  // prerendered page the effect runs before card heights have settled, every
  // card reads as above the fold, and the whole deck is skipped — which is
  // what the live site did while localhost, images already cached, looked
  // fine.
  //
  // REVEALING them is a scroll handler's, because an observer cannot do it. A
  // flick or an anchor jump moves a card from below the viewport to above it
  // without ever intersecting, so its state never changes and no callback
  // fires — leaving cards the reader has already scrolled past sitting blank
  // behind them. Measured: jumping to the bottom of a UK page left 16 of 25
  // blank.
  //
  // Everything here is additive: a card already on screen is left exactly as
  // the server rendered it, and with JavaScript off the deck is just the deck.
  useEffect(() => {
    const node = grid.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const pending = new Set<HTMLElement>()
    let queued = false

    function reveal() {
      queued = false
      // Cards crossing the line together cascade rather than snapping in as a
      // block. The delay is per pass, so it follows the real grid instead of
      // assuming a column count.
      let n = 0
      for (const el of Array.from(pending)) {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.94) continue
        el.style.transitionDelay = `${Math.min(n, 5) * 55}ms`
        el.classList.add('is-visible')
        pending.delete(el)
        n++
      }
    }

    function onScroll() {
      if (queued) return
      queued = true
      requestAnimationFrame(reveal)
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        observer.unobserve(el)
        // Below the fold, and not merely behind us: hide it until it is
        // reached. `top > 0` is what separates "not yet" from "already past".
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          el.classList.add('will-reveal')
          pending.add(el)
        }
      }
      // The page may already be scrolled — a restored position, a back
      // navigation — so settle once before waiting for any movement.
      reveal()
    })

    for (const card of Array.from(node.children)) observer.observe(card)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [articles])

  /**
   * Whether this section shows picture blocks at all.
   *
   * Feeds carry images very unevenly: a UK section comes back mostly
   * illustrated while a Kenya one, drawn from wire desks, had a picture on
   * exactly 1 of 25 stories. A single 16:9 banner among two dozen text cards
   * reads as a mistake and leaves every other card in its row stretched and
   * airy, so the decision is made once for the whole section rather than per
   * card: if most of the section has pictures, every card gets a block (the
   * few without get a tinted stand-in); if most doesn't, none do.
   */
  const illustrated = articles.filter(a => a.imageUrl).length
  const showImages = articles.length > 0 && illustrated * 2 >= articles.length

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
            showImage={showImages}
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
