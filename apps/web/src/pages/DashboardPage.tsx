import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { BoardSummary } from '../lib/types';
import { toUserMessage, useToast } from '../store/toast';
import { DashboardSkeleton } from '../components/Skeleton';

export function DashboardPage() {
  const toast = useToast((s) => s.push);
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [editing, setEditing] = useState<BoardSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setBoards(await api.get<BoardSummary[]>('/boards'));
  };

  const startEdit = (b: BoardSummary) => {
    setEditing(b);
    setEditName(b.name);
    setEditDesc(b.description ?? '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim()) {
      toast('El nombre es obligatorio', 'error');
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/boards/${editing.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      toast('Tablero actualizado', 'success');
      setEditing(null);
      await load();
    } catch (err) {
      toast(toUserMessage(err, 'No se pudo actualizar'), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeletingId(id);
    try {
      await api.delete(`/boards/${id}`);
      toast('Tablero eliminado', 'success');
      setBoards((prev) => prev?.filter((b) => b.id !== id) ?? null);
      setConfirmDelete(null);
    } catch (err) {
      toast(toUserMessage(err, 'No se pudo eliminar'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('El nombre es obligatorio', 'error');
      return;
    }
    setCreatingLoading(true);
    try {
      await api.post('/boards', { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      setCreating(false);
      toast('Tablero creado', 'success');
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : toUserMessage(err);
      setError(msg);
      toast(msg, 'error');
    } finally {
      setCreatingLoading(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<BoardSummary | null>(null);

  return (
    <div className="dashboard-container">
      <div
        style={{
          background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 45%, #60a5fa 100%)',
          borderRadius: 20,
          padding: '28px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800, letterSpacing: -0.5, display: 'flex', gap: 10, alignItems: 'center', color: '#fff' }}>
            <span style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)', width: 36, height: 36, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid rgba(255,255,255,0.3)' }}>⬡</span>
            Mis tableros
          </h1>
          <p style={{ fontSize: 14, margin: '8px 0 0', color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>
            {boards === null ? 'Cargando…' : `${boards.length} ${boards.length === 1 ? 'proyecto' : 'proyectos'} • Colabora en tiempo real`}
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          style={{
            background: '#fff',
            color: '#6366f1',
            border: 'none',
            padding: '12px 22px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
          }}
        >
          + Nuevo tablero
        </button>
      </div>

      {creating && (
        <form
          onSubmit={create}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: 20,
            borderRadius: 16,
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del tablero *"
            style={input}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            style={{ ...input, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setCreating(false)} style={btnSmallGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={creatingLoading} style={{ ...btnSmall, opacity: creatingLoading ? 0.6 : 1, cursor: creatingLoading ? 'not-allowed' : 'pointer' }}>
              {creatingLoading ? 'Creando…' : 'Crear tablero'}
            </button>
          </div>
        </form>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

      {boards === null && <DashboardSkeleton />}

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
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {boards?.map((b) => (
          <div
            key={b.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 22,
              position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(79,70,229,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#ddd6fe';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 22, right: 22, height: 3, background: 'linear-gradient(90deg, #4f46e5, #06b6d4)', borderRadius: '0 0 4px 4px' }} />
            <Link to={`/boards/${b.id}`} style={{ display: 'block', paddingTop: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {b.icon ?? '⬡'}
              </div>
              <h3 style={{ margin: '14px 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{b.name}</h3>
              {b.description ? (
                <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {b.description}
                </p>
              ) : (
                <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 14px', fontStyle: 'italic' }}>Sin descripción</p>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--bg)', padding: '6px 10px', borderRadius: 20, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>👥 {b.memberCount}</span>
                <span style={{ background: b.role === 'OWNER' ? '#fef3c7' : b.role === 'ADMIN' ? '#ede9fe' : '#e0f2fe', color: b.role === 'OWNER' ? '#92400e' : b.role === 'ADMIN' ? '#5b21b6' : '#0c4a6e', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{b.role}</span>
              </div>
            </Link>
            <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
              <button
                onClick={() => startEdit(b)}
                title="Editar tablero"
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#4b5563' }}
              >
                ✎
              </button>
              <button
                disabled={deletingId === b.id}
                onClick={() => setConfirmDelete(b)}
                title="Eliminar tablero"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, cursor: deletingId === b.id ? 'not-allowed' : 'pointer', opacity: deletingId === b.id ? 0.5 : 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {deletingId === b.id ? '…' : '🗑'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }} onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleUpdate} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 440, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Editar tablero</h3>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre del tablero *" autoFocus style={{ ...input, marginBottom: 12 }} />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción (opcional)" rows={3} style={{ ...input, width: '100%', resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" disabled={editSaving} onClick={() => setEditing(null)} style={{ ...btnSmallGhost, opacity: editSaving ? 0.6 : 1, cursor: editSaving ? 'not-allowed' : 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={editSaving} style={{ ...btnSmall, opacity: editSaving ? 0.6 : 1, cursor: editSaving ? 'not-allowed' : 'pointer' }}>{editSaving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }} onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🗑</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>¿Eliminar tablero?</h3>
            <p style={{ margin: '0 0 4px', color: 'var(--text)', fontWeight: 600 }}>{confirmDelete.name}</p>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>Esta acción no se puede deshacer. Se borrarán columnas y tareas.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={!!deletingId} style={{ ...btnSmallGhost, flex: 1, opacity: deletingId ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleDelete} disabled={!!deletingId} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, flex: 1, opacity: deletingId ? 0.6 : 1, cursor: deletingId ? 'not-allowed' : 'pointer' }}>{deletingId ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
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