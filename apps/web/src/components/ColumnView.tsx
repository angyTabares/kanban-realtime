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

export function ColumnView({
  column,
  canEdit,
  overColumn,
  onAddTask,
  onDeleteColumn,
  onRenameColumn,
  onDeleteTask,
  isActiveColumn,
}: {
  column: ColumnDto;
  canEdit: boolean;
  overColumn: string | null;
  onAddTask: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteTask: (task: TaskDto) => void;
  isActiveColumn: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);

  const highlight = overColumn === column.id || isActiveColumn;

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="kanban-column"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        boxShadow: highlight || isOver ? '0 0 0 2px var(--primary)' : 'none',
        transition: 'box-shadow .12s',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
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
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (renameValue.trim() && renameValue !== column.title) {
                onRenameColumn(column.id, renameValue.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
            style={input}
          />
        ) : (
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            {column.color && (
              <span style={{ width: 10, height: 10, borderRadius: 3, background: column.color, display: 'inline-block' }} />
            )}
            {column.title}
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>
              {column.tasks.length}
            </span>
          </div>
        )}
        {canEdit && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 14, padding: 2 }}
            title="Eliminar columna"
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
        {column.tasks.length > 0 ? (
          <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {column.tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} onDelete={onDeleteTask} />
            ))}
          </SortableContext>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', margin: '24px 0' }}>
            Sin tareas
          </p>
        )}
      </div>

      {canEdit && addSection({ adding, title, setTitle, setAdding, onAdd: () => {
        if (title.trim()) onAddTask(column.id, title.trim());
        setTitle('');
        setAdding(false);
      }})}

      {selectedTask && (
        <TaskModal task={selectedTask} boardId={column.boardId} onClose={() => setSelectedTask(null)} />
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
        if (confirm(`¿Eliminar "${task.title}"?`)) onDelete(task);
      }}
    >
      <TaskCard task={task} />
    </div>
  );
}

/** Cuerpo visual de la tarjeta, reutilizado por la lista y por el DragOverlay. */
export function TaskCard({ task }: { task: TaskDto }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{task.title}</p>
      {task.labels.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {task.labels.map((l) => (
            <span key={l} style={{ fontSize: 11, background: labelColor(l), color: '#fff', padding: '2px 8px', borderRadius: 6 }}>
              {l}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        {task.dueDate ? (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            🗓 {new Date(task.dueDate).toLocaleDateString('es')}
          </span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{task.assignee.name}</span>
        )}
      </div>
    </div>
  );
}

function addSection({
  adding,
  title,
  setTitle,
  setAdding,
  onAdd,
}: {
  adding: boolean;
  title: string;
  setTitle: (s: string) => void;
  setAdding: (b: boolean) => void;
  onAdd: () => void;
}) {
  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        style={{ margin: '0 10px 12px', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 13, textAlign: 'left', padding: '8px 4px' }}
      >
        + Añadir tarea
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
      style={{ padding: '0 10px 12px' }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la tarea"
        style={{ ...input, marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, flex: 1 }}>
          Añadir
        </button>
        <button type="button" onClick={() => setAdding(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
          ✕
        </button>
      </div>
    </form>
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