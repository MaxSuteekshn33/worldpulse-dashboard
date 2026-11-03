'use client'
import { X } from 'lucide-react'

/**
 * The shell every detail panel is built from.
 *
 * There are six of these panels across two layers — a chokepoint, a lane, a
 * ship, an aircraft, an air hub and a corridor — and they were separate
 * files each with their own copy of the same row and the same shell. They
 * read as one family because they were written in one week, not because
 * anything made them one, and they had already started to drift: the same
 * caveat block appeared with several slightly different margins.
 *
 * Nothing here is new design. It is the shape they already had, in one
 * place, so that a change to the family is a change to the family.
 */

/** A labelled figure. The unit of almost everything in these panels. */
export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '5px 0' }}>
      <span className="mono-label" style={{ color: 'var(--text-4)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

/**
 * The caveat that closes most of these panels.
 *
 * Its own component because it is the most important paragraph on several of
 * them — what the figures are not — and because it is exactly the part that
 * had drifted into three different spacings.
 */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono-label" style={{
      color: 'var(--text-4)', marginTop: '10px',
      borderTop: '1px solid var(--border)', paddingTop: '9px', lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

/** A titled block within a panel — a list of arrivals, ships, chokepoints. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
      <div className="mono-label" style={{ color: 'var(--text-4)', marginBottom: '6px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/** One line in a `Section`: a name on the left, figures on the right. */
export function Entry({ name, meta }: { name: React.ReactNode; meta: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: '12px',
      padding: '3px 0', fontSize: '12.5px', color: 'var(--text-2)',
    }}>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{meta}</span>
    </div>
  )
}

export function Shell({ title, sub, onClose, children }: {
  title: string
  sub: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="sea-detail">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-lg" style={{ fontSize: '20px', lineHeight: 1.15 }}>{title}</div>
          <div className="mono-label" style={{ color: 'var(--text-4)', marginTop: '5px' }}>{sub}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="sea-detail-close">
          <X size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      <div style={{ marginTop: '14px' }}>{children}</div>
    </div>
  )
}
