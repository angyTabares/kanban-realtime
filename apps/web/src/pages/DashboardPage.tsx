import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { BoardSummary } from '../lib/types';

export function DashboardPage() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setBoards(await api.get<BoardSummary[]>('/boards'));
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/boards', { name: name.trim(), icon: icon.trim() || null });
      setName('');
      setIcon('');
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Mis tableros</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '6px 0 0' }}>
            Proyectos donde colaboras en tiempo real
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Nuevo tablero
        </button>
      </div>

      {creating && (
        <form
          onSubmit={create}
          style={{
            display: 'flex',
            gap: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <input
            autoFocus
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Ícono"
            maxLength={4}
            style={{ width: 90, ...input }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del tablero"
            style={{ flex: 1, ...input }}
          />
          <button type="submit" style={btnSmall}>
            Crear
          </button>
          <button type="button" onClick={() => setCreating(false)} style={btnSmallGhost}>
            Cancelar
          </button>
        </form>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

      {boards === null && (
        <p style={{ color: 'var(--muted)' }}>Cargando tableros…</p>
      )}

      {boards?.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          <p style={{ fontSize: 40, margin: '0 0 8px' }}>⬡</p>
          <p style={{ margin: 0, fontSize: 15 }}>
            Crea tu primer tablero para comenzar.
          </p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}
      >
        {boards?.map((b) => (
          <Link
            key={b.id}
            to={`/boards/${b.id}`}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              display: 'block',
              transition: 'border-color .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: 32 }}>{b.icon ?? '⬡'}</div>
            <h3 style={{ margin: '12px 0 4px', fontSize: 16 }}>{b.name}</h3>
            {b.description && (
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
                {b.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>👥 {b.memberCount}</span>
              <span style={{ textTransform: 'capitalize' }}>{b.role.toLowerCase()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  color: 'var(--text)',
};

const btnSmall: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
};

const btnSmallGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  padding: '10px 14px',
  borderRadius: 8,
  fontSize: 14,
};