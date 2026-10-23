import { Bar, SkeletonSection, SkeletonTopBar } from '@/components/Skeletons'

/**
 * Shown while a country page is being rendered on the server.
 *
 * Next streams this immediately, so a reader who clicks a bubble gets the page
 * frame at once instead of sitting on the dashboard wondering whether the
 * click registered. It matters here more than on most apps: only the five
 * featured countries are prerendered, so for the other 195 this is what the
 * first visit looks like while the feeds are fetched.
 */
export default function Loading() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <SkeletonTopBar />

      {/* Hero: same height as the real one, so nothing jumps when it lands. */}
      <section style={{
        position: 'relative',
        height: 'clamp(230px, 32vh, 340px)',
        overflow: 'hidden',
        background: 'var(--surface-1)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(8,8,12,.30) 0%, rgba(8,8,12,.58) 48%, rgba(8,8,12,.88) 82%, var(--bg) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 28px) 26px',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Bar w="52px" h={40} r={8} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Bar w="260px" h={38} r={9} />
              <Bar w="190px" h={12} />
            </div>
          </div>
        </div>
      </section>

      {/* Category nav */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 clamp(16px, 3vw, 28px)',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          height: '48px', display: 'flex', alignItems: 'center', gap: '18px',
        }}>
          {['66px', '54px', '48px', '62px', '56px'].map(w => (
            <Bar key={w} w={w} h={11} />
          ))}
        </div>
      </div>

      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '8px clamp(16px, 3vw, 28px) 80px',
      }}>
        <SkeletonSection />
        <SkeletonSection />
      </div>
    </main>
  )
}
