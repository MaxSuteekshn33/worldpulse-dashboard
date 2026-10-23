import { Bar, SkeletonSection, SkeletonTopBar } from '@/components/Skeletons'

/** Section pages are never prerendered, so every first visit sees this. */
export default function Loading() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <SkeletonTopBar />

      <section style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '30px clamp(16px, 3vw, 28px) 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '10px' }}>
          <Bar w="40px" h={34} r={7} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <Bar w="300px" h={34} r={8} />
            <Bar w="215px" h={12} />
          </div>
        </div>
      </section>

      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '8px clamp(16px, 3vw, 28px) 80px',
      }}>
        <SkeletonSection cards={8} />
      </div>
    </main>
  )
}
