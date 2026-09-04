import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CommentDto, TaskDto } from '../lib/types';
import { Avatar } from './Avatar';
import { useBoardState } from '../store/board';
import { toUserMessage, useToast } from '../store/toast';
import { ModernAssigneeSelect, ModernDatePicker } from './ModernPickers';

const LABELS = [
  'red', 'orange', 'amber', 'green', 'emerald',
  'sky', 'blue', 'violet', 'pink',
];

export function TaskModal({
  task: initial,
  boardId,
  onClose,
  onDeleted,
}: {
  task: TaskDto;
  boardId: string;
  onClose: () => void;
  onDeleted?: (taskId: string) => void;
}) {
  const board = useBoardState((s) => s.current);
  const toast = useToast((s) => s.push);
  const [task, setTask] = useState<TaskDto>(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [dueDate, setDueDate] = useState(initial.dueDate?.slice(0, 10) ?? '');
  const [labels, setLabels] = useState<string[]>(initial.labels ?? []);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (!title.trim()) {
      toast('El título es obligatorio', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<{ id: string }>(`/boards/${boardId}/tasks/${task.id}`, {
        title: title.trim(),
        description,
        dueDate: dueDate || null,
        labels,
        assigneeId: assigneeId || null,
      });
      const next = { ...task, ...updated };
      setTask(next);
      setSaved(true);
      toast('Cambios guardados', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo guardar'), 'error');
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
    if (!comment.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const created = await api.post<CommentDto>(`/boards/${boardId}/tasks/${task.id}/comments`, { body: comment.trim() });
      setTask((prev) => ({ ...prev, comments: [...(prev.comments ?? []), created] }));
      setComment('');
      toast('Comentario añadido', 'success');
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo añadir el comentario'), 'error');
    } finally {
      setCommentSending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    // optimista: quita de la columna inmediato
    onDeleted?.(task.id);
    try {
      await api.delete(`/boards/${boardId}/tasks/${task.id}`);
      toast('Tarea eliminada', 'success');
      onClose();
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo eliminar'), 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto', maxHeight: '100dvh' }}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 560, maxWidth: 'calc(100% - 16px)', maxHeight: 'min(92vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, margin: 'auto' }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0, overflowY: 'auto', maxHeight: 'min(55vh, 420px)' }}>
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

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>🗓 Fecha límite</div>
            <ModernDatePicker value={dueDate} onChange={setDueDate} />
          </div>
          <div style={{ flex: 1, minWidth: 160, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>👤 Asignada a</div>
            <ModernAssigneeSelect value={assigneeId} onChange={setAssigneeId} members={(board?.members ?? []) as never} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setConfirmDelete(true)} disabled={deleting} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, opacity: deleting ? 0.6 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}>
            🗑 Eliminar
          </button>
          <div style={{ flex: 1 }} />
          {saved && <span style={{ color: '#16a34a', fontSize: 13, alignSelf: 'center' }}>✓ Guardado</span>}
          <button onClick={onClose} disabled={saving || commentSending} style={{ ...ghostBtn2, opacity: saving || commentSending ? 0.6 : 1, cursor: saving || commentSending ? 'not-allowed' : 'pointer' }}>Cancelar</button>
          <button onClick={() => void persist()} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        </div>
        <div className="task-comments" style={{ flex: 1, padding: '0 24px 20px', borderTop: '1px solid #f3f4f6', marginTop: 16, overflowY: 'auto', minHeight: 120, maxHeight: '38vh' }}>
        <h4 style={{ margin: '16px 0 10px', fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Comentarios</h4>
        <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Añade un comentario…"
            style={{ ...field, flex: 1 }}
            disabled={commentSending}
          />
          <button type="submit" disabled={commentSending} style={{ ...primaryBtn, opacity: commentSending ? 0.6 : 1 }}>
            {commentSending ? 'Enviando…' : 'Enviar'}
          </button>
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
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 110 }} onClick={() => setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 360, maxWidth: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>🗑</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>¿Eliminar tarea?</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 13 }}>“{task.title}” se eliminará para todos.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '9px 14px', borderRadius: 8, fontSize: 14, flex: 1, opacity: deleting ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, flex: 1, opacity: deleting ? 0.6 : 1 }}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
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