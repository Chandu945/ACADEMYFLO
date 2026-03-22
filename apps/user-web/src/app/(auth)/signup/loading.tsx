export default function SignupLoading() {
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
          gap: '24px',
        }}
      >
        {/* Icon placeholder */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'var(--color-border, #e2e8f0)',
            animation: 'signupSkeletonPulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Card placeholder — matches actual form height (~540px with ToS) */}
        <div
          style={{
            width: '100%',
            height: '540px',
            borderRadius: '16px',
            backgroundColor: 'var(--color-border, #e2e8f0)',
            animation: 'signupSkeletonPulse 1.5s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes signupSkeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </main>
  );
}
