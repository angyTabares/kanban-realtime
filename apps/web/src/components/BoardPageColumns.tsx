import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { BoardFull, TaskDto } from '../lib/types';
import { api } from '../lib/api';
import { ColumnView, TaskCard } from './ColumnView';
import { useAuth } from '../store/auth';
import { toUserMessage, useToast } from '../store/toast';

export function BoardPageColumns({
  board,
  canEdit,
  addTask,
  removeTask,
  optimisticMove,
  optimisticReorder,
}: {
  board: BoardFull;
  canEdit: boolean;
  addTask: (task: TaskDto) => void;
  removeTask: (taskId: string) => void;
  optimisticMove: (taskId: string, targetColumnId: string, position: number) => void;
  optimisticReorder: (columnId: string, orderedTaskIds: string[]) => void;
}) {
  const me = useAuth((s) => s.user!);
  const toast = useToast((s) => s.push);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null);
  const [confirmColumn, setConfirmColumn] = useState<null | { id: string; title: string }>(null);
  const [deletingColumn, setDeletingColumn] = useState(false);
  const [confirmTask, setConfirmTask] = useState<TaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const tasksById = useMemo(() => {
    const map: Record<string, TaskDto> = {};
    board.columns.forEach((c) => c.tasks.forEach((t) => (map[t.id] = t)));
    return map;
  }, [board]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const columns = useMemo(
    () =>
      [...board.columns]
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          ...c,
          tasks: [...c.tasks].sort((a, b) => a.position - b.position),
        })),
    [board.columns],
  );

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasksById[e.active.id as string];
    setActiveTask(task ?? null);
    setActiveColumn(task?.columnId ?? null);
    setOverColumn(task?.columnId ?? null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (!e.over) return;
    const overId = e.over.id as string;
    const overIsColumn = board.columns.some((c) => c.id === overId);
    const overColumnId = overIsColumn ? overId : tasksById[overId]?.columnId;
    if (overColumnId) setOverColumn(overColumnId);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    setActiveColumn(null);
    setOverColumn(null);
    if (!over) return;

    const fromId = active.id as string;
    const toId = over.id as string;
    if (fromId === toId) return;

    const fromColumnId = activeColumn ?? tasksById[fromId]?.columnId;
    if (!fromColumnId) return;

    // ¿El "over" es una columna o una tarea?
    const toIsColumn = board.columns.some((c) => c.id === toId);
    const toColumnId = toIsColumn ? toId : (tasksById[toId]?.columnId ?? fromColumnId);

    if (fromColumnId === toColumnId) {
      // Reorden dentro de la misma columna: optimista + API.
      const fromIdx = columns.findIndex((c) => c.id === fromColumnId);
      const toIdx = columns[fromIdx]?.tasks.findIndex((t) => t.id === toId) ?? -1;
      if (fromIdx >= 0 && toIdx >= 0) {
        const ids = reorderTaskIds(columns[fromIdx].tasks, fromId, toId);
        optimisticReorder(fromColumnId, ids);
        void api
          .put(`/boards/${board.id}/columns/${fromColumnId}/tasks/reorder`, {
            orderedTaskIds: ids,
          })
          .catch((e) => toast(toUserMessage(e, 'No se pudo reordenar'), 'error'));
      }
      return;
    }

    // Movimiento entre columnas: optimista + API + socket converge.
    const targetTasks = board.columns.find((c) => c.id === toColumnId)?.tasks ?? [];
    const position = toIsColumn
      ? targetTasks.length
      : Math.max(
          0,
          targetTasks.findIndex((t) => t.id === toId),
        );
    optimisticMove(fromId, toColumnId, position);
    void api
      .post(`/boards/${board.id}/tasks/${fromId}/move`, {
        targetColumnId: toColumnId,
        position,
      })
      .catch((e) => toast(toUserMessage(e, 'No se pudo mover la tarjeta'), 'error'));
  };

  const onAddColumn = async (title: string) => {
    try {
      await api.post(`/boards/${board.id}/columns`, { title });
      toast('Columna creada', 'success');
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo crear la columna'), 'error');
    }
  };

  const onDeleteColumn = async (columnId: string) => {
    setDeletingColumn(true);
    try {
      await api.delete(`/boards/${board.id}/columns/${columnId}`);
      toast('Columna eliminada', 'success');
      setConfirmColumn(null);
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo eliminar la columna'), 'error');
    } finally {
      setDeletingColumn(false);
    }
  };

  const onRenameColumn = async (columnId: string, title: string) => {
    try {
      await api.patch(`/boards/${board.id}/columns/${columnId}`, { title });
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo renombrar'), 'error');
    }
  };

  const onAddTask = async (
    columnId: string,
    draft: { title: string; description?: string; labels?: string[]; dueDate?: string | null; assigneeId?: string | null },
  ) => {
    try {
      const created = await api.post<TaskDto>(`/boards/${board.id}/columns/${columnId}/tasks`, {
        title: draft.title,
        description: draft.description ?? null,
        labels: draft.labels ?? [],
        dueDate: draft.dueDate ?? null,
        assigneeId: draft.assigneeId ?? me.id,
      });
      // aparece inmediato sin esperar socket
      addTask(created);
      toast('Tarea creada', 'success');
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo crear la tarea'), 'error');
      throw e;
    }
  };

  const deleteTask = (task: TaskDto) => {
    setConfirmTask(task);
  };
  const confirmDeleteTask = async () => {
    if (!confirmTask) return;
    setDeletingTask(true);
    const id = confirmTask.id;
    removeTask(id);
    setConfirmTask(null);
    try {
      await api.delete(`/boards/${board.id}/tasks/${id}`);
      toast('Tarea eliminada', 'success');
    } catch (e) {
      toast(toUserMessage(e, 'No se pudo eliminar'), 'error');
    } finally {
      setDeletingTask(false);
    }
  };

  return (
    <div className="board-columns-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTask(null);
          setActiveColumn(null);
          setOverColumn(null);
        }}
      >
        <div className="board-columns">
          {columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              canEdit={canEdit}
              overColumn={overColumn}
              onAddTask={onAddTask}
              onDeleteColumn={async (id) => {
                const c = board.columns.find((x) => x.id === id);
                setConfirmColumn(c ? { id, title: c.title } : { id, title: 'esta columna' });
              }}
              onRenameColumn={onRenameColumn}
              onDeleteTask={deleteTask}
              isActiveColumn={activeColumn === column.id}
              members={board.members}
              removeTask={removeTask}
            />
          ))}
          {canEdit && (
            <AddColumnButton onAdd={onAddColumn} />
          )}
        </div>
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {confirmColumn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }} onClick={() => !deletingColumn && setConfirmColumn(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🗂</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>¿Eliminar columna?</h3>
            <p style={{ margin: '0 0 4px', color: 'var(--text)', fontWeight: 600 }}>{confirmColumn.title}</p>
            <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 13 }}>Se borrarán todas sus tareas. No se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmColumn(null)} disabled={deletingColumn} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '9px 14px', borderRadius: 8, fontSize: 14, flex: 1, opacity: deletingColumn ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={() => onDeleteColumn(confirmColumn.id)} disabled={deletingColumn} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, flex: 1, opacity: deletingColumn ? 0.6 : 1, cursor: deletingColumn ? 'not-allowed' : 'pointer' }}>{deletingColumn ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }} onClick={() => !deletingTask && setConfirmTask(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🗑</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>¿Eliminar tarea?</h3>
            <p style={{ margin: '0 0 4px', color: 'var(--text)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{confirmTask.title}</p>
            <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 13 }}>Se eliminará para todos los miembros.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmTask(null)} disabled={deletingTask} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '9px 14px', borderRadius: 8, fontSize: 14, flex: 1, opacity: deletingTask ? 0.6 : 1 }}>Cancelar</button>
              <button onClick={confirmDeleteTask} disabled={deletingTask} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, flex: 1, opacity: deletingTask ? 0.6 : 1, cursor: deletingTask ? 'not-allowed' : 'pointer' }}>{deletingTask ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reordena el arreglo para que `activeId` se inserte en la posición de `overId`. */
function reorderTaskIds(tasks: TaskDto[], activeId: string, overId: string): string[] {
  const ids = tasks.map((t) => t.id);
  const activeIndex = ids.indexOf(activeId);
  const overIndex = ids.indexOf(overId);
  if (activeIndex < 0 || overIndex < 0) return ids;
  ids.splice(activeIndex, 1);
  ids.splice(overIndex, 0, activeId);
  return ids;
}

function AddColumnButton({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  return open ? (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || loading) return;
        setLoading(true);
        try {
          await onAdd(title.trim());
          setTitle('');
          setOpen(false);
        } finally {
          setLoading(false);
        }
      }}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, width: 260 }}
    >
      <input
        autoFocus
        disabled={loading}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nombre de la columna"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, opacity: loading ? 0.6 : 1 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, flex: 1, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Añadiendo…' : 'Añadir'}
        </button>
        <button type="button" disabled={loading} onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 8, fontSize: 13, opacity: loading ? 0.6 : 1 }}>
          ✕
        </button>
      </div>
    </form>
  ) : (
    <button
      onClick={() => setOpen(true)}
      style={{
        background: 'transparent',
        border: '1px dashed var(--border)',
        borderRadius: 12,
        padding: '24px 20px',
        color: 'var(--muted)',
        fontSize: 14,
      }}
    >
      + Nueva columna
    </button>
  );
}