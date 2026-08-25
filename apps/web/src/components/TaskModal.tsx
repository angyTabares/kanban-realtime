import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CommentDto, TaskDto } from '../lib/types';
import { Avatar } from './Avatar';
import { useBoardState } from '../store/board';

const LABELS = [
  'red', 'orange', 'amber', 'green', 'emerald',
  'sky', 'blue', 'violet', 'pink',
];

export function TaskModal({
  task: initial,
  boardId,
  onClose,
}: {
  task: TaskDto;
  boardId: string;
  onClose: () => void;
}) {
  const board = useBoardState((s) => s.current);
  const [task, setTask] = useState<TaskDto>(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [dueDate, setDueDate] = useState(initial.dueDate?.slice(0, 10) ?? '');
  const [labels, setLabels] = useState<string[]>(initial.labels ?? []);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setTask(initial);
    setTitle(initial.title);
    setDescription(initial.description ?? '');
    setDueDate(initial.dueDate?.slice(0, 10) ?? '');
    setLabels(initial.labels ?? []);
    setAssigneeId(initial.assigneeId ?? '');
    setSaved(false);
    setSaving(false);
  }, [initial]);

  const persist = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<{ id: string }>(`/boards/${boardId}/tasks/${task.id}`, {
        title,
        description,
        dueDate: dueDate || null,
        labels,
        assigneeId: assigneeId || null,
      });
      const next = { ...task, ...updated };
      setTask(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* convergerá */
    } finally {
      setSaving(false);
    }
  };

  const toggleLabel = (label: string) => {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const created = await api.post<CommentDto>(`/boards/${boardId}/tasks/${task.id}/comments`, { body: comment.trim() });
      setTask((prev) => ({ ...prev, comments: [...(prev.comments ?? []), created] }));
      setComment('');
    } catch {
      /* convergerá */
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LABELS.map((l) => (
              <button
                key={l}
                onClick={() => toggleLabel(l)}
                title={l}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: labelColor(l),
                  border: labels.includes(l) ? '3px solid #333' : '2px solid transparent',
                  opacity: labels.includes(l) ? 1 : 0.4,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button onClick={onClose} style={ghostBtn}>✕</button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...field, fontSize: 17, fontWeight: 700, marginBottom: 12 }}
        />

        <label style={fieldLabel}>
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...field, resize: 'vertical' }}
          />
        </label>

        <div className="task-modal-row">
          <label style={fieldLabel}>
            Fecha límite
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={field}
            />
          </label>
          <label style={fieldLabel}>
            Asignada a
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={field}
            >
              <option value="">Sin asignar</option>
              {(board?.members ?? []).map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={() => void persist()} disabled={saving} style={primaryBtn}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onClose} style={ghostBtn2}>Cancelar</button>
          {saved && <span style={{ color: '#16a34a', fontSize: 13, alignSelf: 'center' }}>✓ Guardado</span>}
        </div>

        <h4 style={{ margin: '20px 0 10px', fontSize: 14 }}>Comentarios</h4>
        <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Añade un comentario…"
            style={{ ...field, flex: 1 }}
          />
          <button type="submit" style={primaryBtn}>Enviar</button>
        </form>

        <div style={{ display: 'grid', gap: 10 }}>
          {task.comments?.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Sin comentarios.</p>
          )}
          {task.comments?.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={c.author?.name ?? '?'} size={28} />
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.author?.name}</div>
                <div style={{ fontSize: 13.5 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  color: 'var(--text)',
  fontFamily: 'inherit',
};

const fieldLabel: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--muted)',
  flex: 1,
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  fontSize: 16,
  padding: 4,
};

const ghostBtn2: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  padding: '9px 14px',
  borderRadius: 8,
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '9px 14px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
};

const labelColor = (l: string): string =>
  ({
    red: '#ef4444', orange: '#f97316', amber: '#f59e0b', green: '#22c55e',
    emerald: '#10b981', sky: '#0ea5e9', blue: '#3b82f6', violet: '#8b5cf6', pink: '#ec4899',
  }[l] ?? '#6b7280');