import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { Avatar } from './Avatar';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { connectSocketWithRetry, disconnectSocket } from '../lib/socket';

export function Layout() {
  const user = useAuth((s) => s.user!);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    // Conecta el socket en tiempo real mientras haya sesión activa.
    // Si el token está expirado, refresca la sesión y reconecta.
    void connectSocketWithRetry();
    return () => disconnectSocket();
  }, []);

  const handleLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <Link to="/" style={{ fontWeight: 700, fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--primary)' }}>⬡</span> Kanban Live
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={user.name} size={30} />
            <span className="user-name" style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              border: '1px solid var(--border)',
              background: 'transparent',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--muted)',
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}