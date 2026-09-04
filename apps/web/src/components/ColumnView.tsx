import { useState } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ColumnDto, TaskDto } from '../lib/types';
import { TaskModal } from './TaskModal';
import { ModernAssigneeSelect, ModernDatePicker } from './ModernPickers';

export function ColumnView({
  column,
  canEdit,
  overColumn,
  onAddTask,
  onDeleteColumn,
  onRenameColumn,
  onDeleteTask,
  isActiveColumn,
  members,
  removeTask,
}: {
  column: ColumnDto;
  canEdit: boolean;
  overColumn: string | null;
  onAddTask: (columnId: string, draft: { title: string; description?: string; labels?: string[]; dueDate?: string | null; assigneeId?: string | null }) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onRenameColumn: (columnId: string, title: string) => Promise<void>;
  onDeleteTask: (task: TaskDto) => void;
  isActiveColumn: boolean;
  members?: { userId: string; user: { name: string } }[];
  removeTask?: (taskId: string) => void;
}) {
  const [deletingColumn, setDeletingColumn] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDue, setCreateDue] = useState('');
  const [createLabels, setCreateLabels] = useState<string[]>([]);
  const [createAssignee, setCreateAssignee] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const highlight = overColumn === column.id || isActiveColumn;

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="kanban-column"
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        boxShadow: highlight || isOver ? '0 0 0 2px var(--primary), 0 8px 24px rgba(99,102,241,0.12)' : '0 2px 10px rgba(0,0,0,0.04)',
        transition: 'all .2s',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f5',
        }}
        onDoubleClick={() => {
          if (canEdit) {
            setRenameValue(column.title);
            setRenaming(true);
          }
        }}
      >
        {renaming ? (
          <input
            autoFocus
            disabled={renameLoading}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={async () => {
              if (renameLoading) return;
              if (renameValue.trim() && renameValue !== column.title) {
                setRenameLoading(true);
                try {
                  await onRenameColumn(column.id, renameValue.trim());
                } finally {
                  setRenameLoading(false);
                  setRenaming(false);
                }
                return;
              }
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
            style={{ ...input, opacity: renameLoading ? 0.6 : 1, background: '#fff' }}
          />
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 3, height: 18, borderRadius: 2, background: column.color || 'var(--primary)', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{column.title}</span>
            <span style={{ background: '#fff', border: '1px solid #e5e7eb', color: 'var(--muted)', fontWeight: 600, fontSize: 11, padding: '2px 7px', borderRadius: 20, minWidth: 22, textAlign: 'center' }}>
              {(column.tasks ?? []).length}
            </span>
          </div>
        )}
        {canEdit && (
          <button
            disabled={deletingColumn}
            onClick={async () => {
              setDeletingColumn(true);
              try {
                await onDeleteColumn(column.id);
              } finally {
                setDeletingColumn(false);
              }
            }}
            style={{ background: '#fff', border: '1px solid #e5e7eb', width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, cursor: deletingColumn ? 'not-allowed' : 'pointer', opacity: deletingColumn ? 0.5 : 1 }}
            title="Eliminar columna"
          >
            {deletingColumn ? '…' : '✕'}
          </button>
        )}
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
        {(column.tasks ?? []).length > 0 ? (
          <SortableContext items={(column.tasks ?? []).map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {(column.tasks ?? []).map((task) => (
              <SortableTaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} onDelete={onDeleteTask} />
            ))}
          </SortableContext>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 12px', color: '#9ca3af' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📋</div>
            <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Sin tareas</p>
            <p style={{ fontSize: 11, margin: '4px 0 0' }}>Arrastra o crea una</p>
          </div>
        )}
      </div>

      {canEdit && (
        <button
          onClick={() => {
            setCreateTitle('');
            setCreateDesc('');
            setCreateDue('');
            setCreateLabels([]);
            setCreateAssignee('');
            setShowCreate(true);
          }}
          style={{ margin: '0 10px 12px', background: '#fff', border: '1px dashed #e5e7eb', borderRadius: 10, color: '#6b7280', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: '9px', width: 'calc(100% - 20px)', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span style={{ width: 18, height: 18, borderRadius: 6, background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>+</span> Añadir tarea
        </button>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, paddingTop: 40, zIndex: 100, overflowY: 'auto' }} onClick={() => setShowCreate(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!createTitle.trim() || createLoading) return;
              setCreateLoading(true);
              try {
                await onAddTask(column.id, {
                  title: createTitle.trim(),
                  description: createDesc.trim() || undefined,
                  labels: createLabels,
                  dueDate: createDue || null,
                  assigneeId: createAssignee || null,
                });
                setShowCreate(false);
              } catch {
                // toast ya en BoardPageColumns
              } finally {
                setCreateLoading(false);
              }
            }}
            style={{ background: '#fff', borderRadius: 16, padding: 20, width: 560, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'visible', margin: 'auto 0' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nueva tarea en {column.title}</h3>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <input autoFocus value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Título *" style={{ ...input, marginBottom: 10, fontWeight: 600 }} />
            <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Descripción (opcional)" rows={3} style={{ ...input, resize: 'vertical', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['red', 'orange', 'amber', 'green', 'emerald', 'sky', 'blue', 'violet', 'pink'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCreateLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))}
                  title={l}
                  style={{ width: 22, height: 22, borderRadius: 6, background: labelColor(l), border: createLabels.includes(l) ? '2px solid #111827' : '2px solid transparent', opacity: createLabels.includes(l) ? 1 : 0.5, cursor: 'pointer' }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>🗓 Fecha límite</div>
                <ModernDatePicker value={createDue} onChange={setCreateDue} />
              </div>
              <div style={{ flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>👤 Asignada a</div>
                <ModernAssigneeSelect value={createAssignee} onChange={setCreateAssignee} members={(members ?? []) as never} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" disabled={createLoading} onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '9px 14px', borderRadius: 8, fontSize: 14, opacity: createLoading ? 0.6 : 1 }}>Cancelar</button>
              <button type="submit" disabled={createLoading || !createTitle.trim()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, opacity: createLoading || !createTitle.trim() ? 0.6 : 1, cursor: createLoading ? 'not-allowed' : 'pointer' }}>{createLoading ? 'Creando…' : 'Crear tarea'}</button>
            </div>
          </form>
        </div>
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} boardId={column.boardId} onClose={() => setSelectedTask(null)} onDeleted={removeTask ? () => removeTask(selectedTask.id) : undefined} />
      )}
    </div>
  );
}

function SortableTaskCard({
  task,
  onClick,
  onDelete,
}: {
  task: TaskDto;
  onClick: () => void;
  onDelete: (task: TaskDto) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDelete(task);
      }}
    >
      <TaskCard task={task} />
    </div>
  );
}

/** Cuerpo visual de la tarjeta, reutilizado por la lista y por el DragOverlay. */
export function TaskCard({ task }: { task: TaskDto }) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && task.dueDate.slice(0, 10) !== new Date().toISOString().slice(0, 10) : false;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '12px 12px 10px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        transition: 'box-shadow .15s, transform .15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {task.labels.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
          {task.labels.map((l) => (
            <span key={l} style={{ width: 28, height: 6, borderRadius: 3, background: labelColor(l), display: 'inline-block' }} title={l} />
          ))}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: '#1f2937', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</p>
      {(task.dueDate || task.assignee || (task as unknown as { comments?: unknown[] }).comments?.length) && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {task.dueDate && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 6, background: isOverdue ? '#fef2f2' : '#f3f4f6', color: isOverdue ? '#dc2626' : '#6b7280', border: `1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'}`, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              🗓 {new Date(task.dueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {(task as unknown as { comments?: unknown[] }).comments?.length ? (
            <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', gap: 3, alignItems: 'center' }}>💬 {(task as unknown as { comments: unknown[] }).comments.length}</span>
          ) : null}
          {task.assignee && (
            <span style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title={task.assignee.name}>
              {task.assignee.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  color: 'var(--text)',
};

const labelColor = (l: string): string =>
  ({
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    green: '#22c55e',
    emerald: '#10b981',
    sky: '#0ea5e9',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    pink: '#ec4899',
  }[l] ?? '#6b7280');