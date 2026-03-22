export default function LoginLoading() {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        {/* Logo placeholder */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '22px',
            backgroundColor: 'var(--color-border, #e2e8f0)',
            animation: 'loginSkeletonPulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Card placeholder — matches actual form height */}
        <div
          style={{
            width: '100%',
            height: '380px',
            borderRadius: '16px',
            backgroundColor: 'var(--color-border, #e2e8f0)',
            animation: 'loginSkeletonPulse 1.5s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes loginSkeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </main>
  );
}
