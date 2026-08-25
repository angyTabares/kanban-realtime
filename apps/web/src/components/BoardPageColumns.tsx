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

export function BoardPageColumns({
  board,
  canEdit,
  optimisticMove,
  optimisticReorder,
}: {
  board: BoardFull;
  canEdit: boolean;
  optimisticMove: (taskId: string, targetColumnId: string, position: number) => void;
  optimisticReorder: (columnId: string, orderedTaskIds: string[]) => void;
}) {
  const me = useAuth((s) => s.user!);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null);

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
          .catch(() => {});
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
      .catch(() => {});
  };

  const onAddColumn = async (title: string) => {
    try {
      await api.post(`/boards/${board.id}/columns`, { title });
    } catch {
      /* el evento de socket hace converger */
    }
  };

  const onDeleteColumn = async (columnId: string) => {
    if (!confirm('¿Eliminar columna y todas sus tareas?')) return;
    try {
      await api.delete(`/boards/${board.id}/columns/${columnId}`);
    } catch {
      /* convergerá */
    }
  };

  const onRenameColumn = async (columnId: string, title: string) => {
    try {
      await api.patch(`/boards/${board.id}/columns/${columnId}`, { title });
    } catch {
      /* convergerá */
    }
  };

  const onAddTask = async (columnId: string, title: string) => {
    try {
      await api.post(`/boards/${board.id}/columns/${columnId}/tasks`, {
        title,
        assigneeId: me.id,
      });
      // El evento TASK_CREATED publica el board completo actualizado
    } catch {
      /* convergerá */
    }
  };

  const deleteTask = (task: TaskDto) => {
    if (!confirm(`¿Eliminar "${task.title}"?`)) return;
    void api.delete(`/boards/${board.id}/tasks/${task.id}`).catch(() => {});
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
              onDeleteColumn={onDeleteColumn}
              onRenameColumn={onRenameColumn}
              onDeleteTask={deleteTask}
              isActiveColumn={activeColumn === column.id}
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

function AddColumnButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  return open ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onAdd(title.trim());
        setTitle('');
        setOpen(false);
      }}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, width: 260 }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nombre de la columna"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, flex: 1 }}>
          Añadir
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
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