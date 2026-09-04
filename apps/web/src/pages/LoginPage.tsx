import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ApiError } from '../lib/api';
import { AuthShell } from '../components/AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    document.title = 'Inicia sesión | Kanban Live';
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Inicia sesión">
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="tu@email.com"
          />
        </label>
        <label style={labelStyle}>
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
          />
        </label>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            ...primaryBtn,
            opacity: loading ? 0.6 : 1,
            marginTop: 6,
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
        ¿No tienes cuenta?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}

export const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text)',
};

export const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
};

export const primaryBtn: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '12px',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
};