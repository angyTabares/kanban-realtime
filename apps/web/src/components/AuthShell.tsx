export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 30, color: 'var(--primary)' }}>⬡</div>
          <h1 style={{ fontSize: 20, margin: '8px 0 0' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 0' }}>
            Gestión de proyectos con colaboración en tiempo real
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}