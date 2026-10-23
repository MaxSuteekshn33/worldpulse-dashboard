export type Segment = 'headline' | 'politics' | 'world' | 'economy' | 'finance'

export interface SegmentMeta {
  id: Segment
  label: string
  blurb: string
  /** Toned-down accent — desaturated for a calmer dark UI */
  color: string
  /** Low-alpha wash used for section chrome */
  tint: string
}

export const SEGMENTS: SegmentMeta[] = [
  { id: 'headline', label: 'Headlines', blurb: 'Top stories right now',      color: '#5B8DEF', tint: 'rgba(91,141,239,.13)' },
  { id: 'politics', label: 'Politics',  blurb: 'Government & policy',        color: '#C86FA6', tint: 'rgba(200,111,166,.13)' },
  { id: 'world',    label: 'World',     blurb: 'Diplomacy & global affairs',  color: '#D18A4E', tint: 'rgba(209,138,78,.13)' },
  { id: 'economy',  label: 'Economy',   blurb: 'Growth, trade & industry',    color: '#8C7CD0', tint: 'rgba(140,124,208,.13)' },
  { id: 'finance',  label: 'Finance',   blurb: 'Markets & money',             color: '#4FA97C', tint: 'rgba(79,169,124,.13)' },
]

export const SEGMENT_IDS = SEGMENTS.map(s => s.id)

export function getSegment(id: string): SegmentMeta {
  return SEGMENTS.find(s => s.id === id) ?? SEGMENTS[0]
}
