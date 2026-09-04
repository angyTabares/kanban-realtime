import { useToast } from '../store/toast';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 9999,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => dismiss(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: t.type === 'error' ? '#fef2f2' : t.type === 'success' ? '#f0fdf4' : '#fff',
            border: `1px solid ${t.type === 'error' ? '#fecaca' : t.type === 'success' ? '#bbf7d0' : 'var(--border)'}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            color: t.type === 'error' ? '#991b1b' : t.type === 'success' ? '#166534' : 'var(--text)',
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.4,
            cursor: 'pointer',
            animation: 'toastIn .2s ease',
            minWidth: 280,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {t.type === 'error' ? '⚠️' : t.type === 'success' ? '✓' : 'ℹ️'}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <span style={{ color: 'var(--muted)', fontSize: 14, flexShrink: 0 }}>✕</span>
        </div>
      ))}
      <style>{`@keyframes toastIn { from { opacity:0; transform: translateY(8px) scale(.98); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
