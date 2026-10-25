'use client'
import { Flame, Newspaper, Plane, Ship } from 'lucide-react'

/**
 * What the map is showing.
 *
 * The dashboard is one map that can be read several ways, not several maps.
 * The countries, the lanes and whatever comes next are all the same world
 * with a different question asked of it, so they are tabs over one surface
 * rather than separate pages — and switching keeps the camera, the
 * projection, and the view you had chosen.
 */
export type Layer = 'news' | 'shipping' | 'flights' | 'conflict'

const TABS: { id: Layer; label: string; hint: string; Icon: typeof Ship }[] = [
  { id: 'news', label: 'News', hint: 'What every country is reporting', Icon: Newspaper },
  { id: 'shipping', label: 'Shipping', hint: 'Lanes and chokepoint traffic', Icon: Ship },
  { id: 'flights', label: 'Flights', hint: 'Live aircraft, military highlighted', Icon: Plane },
  { id: 'conflict', label: 'Conflict', hint: 'Reported violence and unrest', Icon: Flame },
]

export default function LayerTabs({
  value,
  onChange,
  compact,
}: {
  value: Layer
  onChange: (next: Layer) => void
  compact?: boolean
}) {
  return (
    <div className="layer-tabs" role="tablist" aria-label="Map layer">
      {TABS.map(({ id, label, hint, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          title={hint}
          className={value === id ? 'is-on' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={14} strokeWidth={2} aria-hidden />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}
