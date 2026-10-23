'use client'
import { useRef, useState } from 'react'
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

  function close() {
    setOpen(null)
    trigger.current?.focus()
    trigger.current = null
  }

  return (
    <>
      <div style={{
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
