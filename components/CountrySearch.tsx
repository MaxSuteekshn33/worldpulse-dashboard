'use client'
import { useState, useRef, useMemo, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'

interface Props {
  /** Visually larger treatment for the map hero. */
  size?: 'hero' | 'compact'
  placeholder?: string
  autoFocus?: boolean
}

export default function CountrySearch({
  size = 'hero',
  placeholder = 'Search a country…',
  autoFocus = false,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const isHero = size === 'hero'

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const starts = COUNTRIES.filter(c => c.name.toLowerCase().startsWith(q))
    const contains = COUNTRIES.filter(
      c => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q),
    )
    return [...starts, ...contains].slice(0, 7)
  }, [query])

  // Keep the highlighted row in range as the result list shrinks.
  const activeIndex = active < results.length ? active : 0

  // Warm whichever country is highlighted, so picking it lands on a page the
  // server has already started. Most countries render on demand and that is a
  // second or two cold; this spends it while the reader is still choosing.
  // Once per country — prefetch caches, but re-asking on every hover is noise.
  const warmed = useRef(new Set<string>())
  function warm(code: string) {
    if (warmed.current.has(code)) return
    warmed.current.add(code)
    router.prefetch(`/country/${code}`)
  }

  function pick(code: string) {
    setOpen(false)
    setQuery('')
    router.push(`/country/${code}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (activeIndex + 1) % results.length
      setActive(next)
      warm(results[next].code)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (activeIndex - 1 + results.length) % results.length
      setActive(next)
      warm(results[next].code)
    }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[activeIndex].code) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: isHero ? '14px' : '10px',
          background: 'rgba(18,18,26,.92)',
          border: '1px solid var(--border-mid)',
          borderRadius: isHero ? '14px' : '10px',
          padding: isHero ? '0 18px' : '0 14px',
          height: isHero ? '60px' : '46px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-md)',
          transition: 'border-color .2s ease',
        }}
        onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-line)' }}
        onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-mid)' }}
      >
        <Search size={isHero ? 20 : 17} strokeWidth={2.4} color="var(--accent)" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          inputMode="search"
          aria-label="Search for a country"
          role="combobox"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: isHero ? '17px' : '16px',
            fontWeight: 500, color: 'var(--text)',
            letterSpacing: '-.01em', width: '100%', minWidth: 0,
          }}
        />
      </div>

      {open && results.length > 0 && (
        <div
          id={listId}
          role="listbox"
          style={{
            position: 'absolute', top: isHero ? '68px' : '54px', left: 0, right: 0,
            background: 'rgba(14,14,20,.98)',
            border: '1px solid var(--border-mid)',
            borderRadius: '13px', overflow: 'hidden', zIndex: 50,
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {results.map((c, i) => (
            <div
              key={c.code}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => pick(c.code)}
              onMouseEnter={() => { setActive(i); warm(c.code) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '13px',
                padding: '13px 17px', cursor: 'pointer',
                background: i === activeIndex ? 'rgba(78,163,194,.11)' : 'transparent',
                borderBottom: i === results.length - 1 ? 'none' : '1px solid rgba(255,255,255,.05)',
                transition: 'background .12s ease',
              }}
            >
              <span style={{ fontSize: '19px', lineHeight: 1 }} aria-hidden>{c.flag}</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-.01em' }}>
                {c.name}
              </span>
              <span className="mono-label" style={{ marginLeft: 'auto', color: 'var(--text-4)', fontSize: '10px' }}>
                {c.code}
              </span>
              <ArrowRight size={15} strokeWidth={2.4} color={i === activeIndex ? 'var(--accent-bright)' : 'var(--text-4)'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
