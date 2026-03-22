export default function ForgotPasswordLoading() {
  return (
    <div
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
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '300px',
            borderRadius: '16px',
            backgroundColor: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}
