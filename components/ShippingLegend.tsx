'use client'
import { LANE_TIERS } from '@/lib/shippingLayer'

/**
 * What everything on the shipping layer means.
 *
 * The map had none of this, and it showed: three weights of line with no key,
 * so the honest reading of a pale grey line was "some line". A legend that
 * does not change with the layer is worse than no legend — the news colours
 * were still sitting under the shipping map, describing nothing on it.
 */
function Swatch({ color, opacity, weight, label }: {
  color: string; opacity: number; weight: number; label: string
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      <span style={{
        width: '20px', height: `${Math.max(1, weight)}px`,
        background: color, opacity, borderRadius: '1px', display: 'inline-block',
      }} />
      <span className="mono-label" style={{ color: 'var(--text-3)' }}>{label}</span>
    </span>
  )
}

function Dot({ color, label, shape = 'diamond' }: {
  color: string; label: string; shape?: 'diamond' | 'ship'
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      <span style={{
        width: shape === 'diamond' ? '8px' : '0',
        height: shape === 'diamond' ? '8px' : '0',
        background: shape === 'diamond' ? color : 'transparent',
        transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
        borderRadius: '2px',
        display: 'inline-block',
        borderLeft: shape === 'ship' ? '4px solid transparent' : undefined,
        borderRight: shape === 'ship' ? '4px solid transparent' : undefined,
        borderBottom: shape === 'ship' ? `9px solid ${color}` : undefined,
      }} />
      <span className="mono-label" style={{ color: 'var(--text-3)' }}>{label}</span>
    </span>
  )
}

export default function ShippingLegend({ compact }: { compact?: boolean }) {
  // Spread deliberately avoided: the tier objects carry a `key` field of their
  // own, and spreading one into JSX makes React read it as a React key — which
  // it warns about, correctly, since it is not one.
  const lane = (want: string, label: string) => {
    const t = LANE_TIERS.find(x => x.key === want)!
    return <Swatch color={t.color} opacity={t.opacity} weight={t.weight} label={label} />
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? '12px' : '18px',
      flexWrap: 'wrap',
    }}>
      {lane('major', 'Major route')}
      {!compact && lane('middle', 'Secondary')}
      {!compact && lane('minor', 'Minor')}

      <span style={{ width: '1px', height: '14px', background: 'var(--border-mid)' }} />

      {/* The chokepoint scale is the layer's actual argument, so it is spelled
          out rather than left to a hover. */}
      <Dot color="#C7553F" label="Far below last year" />
      {!compact && <Dot color="#D18A4E" label="Below" />}
      <Dot color="#6B7389" label="In line" />
      {!compact && <Dot color="#4EA3C2" label="Above" />}

      <span style={{ width: '1px', height: '14px', background: 'var(--border-mid)' }} />
      <Dot color="#CFE6F2" shape="ship" label="Ship, live" />
    </div>
  )
}
