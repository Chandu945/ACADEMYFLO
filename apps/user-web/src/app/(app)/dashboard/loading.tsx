export default function DashboardLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6, 24px)',
        padding: 'var(--space-6, 24px)',
        maxWidth: 'var(--content-max-width, 1200px)',
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              width: '180px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-border, #e2e8f0)',
              animation: 'dashSkeletonPulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '220px',
              height: '16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-border, #e2e8f0)',
              animation: 'dashSkeletonPulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div
          style={{
            width: '80px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-border, #e2e8f0)',
            animation: 'dashSkeletonPulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* KPI grid skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--space-4, 16px)',
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              height: '90px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-border, #e2e8f0)',
              animation: 'dashSkeletonPulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Birthday section skeleton */}
      <div
        style={{
          height: '160px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-border, #e2e8f0)',
          animation: 'dashSkeletonPulse 1.5s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes dashSkeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
