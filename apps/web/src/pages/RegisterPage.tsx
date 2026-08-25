import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ApiError } from '../lib/api';
import { AuthShell } from '../components/AuthShell';
import { labelStyle, inputStyle, primaryBtn } from './LoginPage';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrarte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Crea tu cuenta">
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={labelStyle}>
          Nombre
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Tu nombre"
          />
        </label>
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
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, marginTop: 6 }}
        >
          {loading ? 'Creando…' : 'Registrarme'}
        </button>
      </form>
      <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}