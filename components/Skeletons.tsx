/**
 * Placeholders for the country pages while the server renders them.
 *
 * Only five countries are built ahead of time; the other 195 render on first
 * request, which takes a second or two of fetching feeds. Until now that was
 * spent looking at the previous page, with nothing to say a new one was on its
 * way. These are deliberately the same shape as the real thing — same card
 * proportions, same grid, same section rhythm — so the page doesn't jump when
 * the content lands.
 */
export function Bar({ w, h = 12, r = 6 }: { w: string; h?: number; r?: number }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'block', width: w, height: `${h}px`, borderRadius: `${r}px` }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 0 }} />
      <div style={{ padding: '14px 15px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Bar w="38%" h={9} />
        <Bar w="92%" h={13} />
        <Bar w="68%" h={13} />
        <Bar w="45%" h={9} />
      </div>
    </div>
  )
}

export function SkeletonSection({ cards = 4 }: { cards?: number }) {
  return (
    <section style={{ paddingTop: '34px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{
          width: '4px', height: '20px', borderRadius: '2px',
          background: 'var(--border-mid)',
        }} />
        <Bar w="120px" h={17} />
        <Bar w="150px" h={11} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
        gap: '15px',
      }}>
        {Array.from({ length: cards }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  )
}

/** The top bar is real chrome, not content — drawn solid so it doesn't blink. */
export function SkeletonTopBar() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 400,
      paddingTop: 'var(--safe-top)',
      background: 'rgba(8,8,12,.9)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '0 clamp(16px, 3vw, 28px)',
        height: '58px', display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <Bar w="74px" h={33} r={9} />
        <Bar w="112px" h={17} />
        <span style={{ marginLeft: 'auto', width: 'min(290px, 62vw)' }}>
          <Bar w="100%" h={36} r={10} />
        </span>
      </div>
    </header>
  )
}
