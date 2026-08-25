import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { socket, connectSocketWithRetry } from '../lib/socket';
import { usePresence } from '../store/presence';
import { BoardEvent } from '@kanban/shared';
import { BoardFull, ColumnDto, CommentDto, TaskDto } from '../lib/types';

/**
 * Hook central del board: carga REST inicial + suscripción WebSocket.
 * Los eventos del socket son la fuente de verdad para converger la UI
 * de todos los clientes (incluido el que origina el cambio).
 */
export function useBoard(boardId: string) {
  const [board, setBoard] = useState<BoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { activeUserIds, setActive, markOnline, markOffline } = usePresence();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<BoardFull>(`/boards/${boardId}`)
      .then((data) => {
        if (cancelled) return;
        setBoard(data);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();

    function subscribe() {
      if (cancelled) return;
      void connectSocketWithRetry()
        .then(() => {
          if (!cancelled) socket.emit('board:subscribe', { boardId });
        })
        .catch(() => {});
    }

    const presence = (p: {
      userId: string;
      online: boolean;
      activeUsers?: string[];
    }) => {
      if (p.activeUsers) {
        setActive(p.activeUsers);
        return;
      }
      p.online ? markOnline(p.userId) : markOffline(p.userId);
    };

    const taskCreated = (t: TaskDto) => {
      setBoard((prev) => {
        if (!prev || prev.columns.some((c) => c.tasks.some((x) => x.id === t.id))) {
          return prev;
        }
        return {
          ...prev,
          columns: prev.columns.map((c) =>
            c.id === t.columnId ? { ...c, tasks: [...c.tasks, t] } : c,
          ),
        };
      });
    };

    const taskUpdated = (t: TaskDto) => {
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) => ({
                ...c,
                tasks: c.tasks.map((x) => (x.id === t.id ? t : x)),
              })),
            }
          : prev,
      );
    };

    const taskMoved = (p: {
      task?: TaskDto;
      orderedTaskIds?: string[];
      columnId?: string;
    }) => {
      setBoard((prev) => {
        if (!prev) return prev;

        if (p.orderedTaskIds && p.columnId) {
          const order = p.orderedTaskIds;
          return {
            ...prev,
            columns: prev.columns.map((c) =>
              c.id === p.columnId
                ? {
                    ...c,
                    tasks: order
                      .map((id) => c.tasks.find((t) => t.id === id))
                      .filter((t): t is TaskDto => Boolean(t)),
                  }
                : c,
            ),
          };
        }

        if (p.task) {
          const task = p.task;
          return {
            ...prev,
            columns: prev.columns.map((c) => {
              if (c.id === task.columnId) {
                const contains = c.tasks.some((t) => t.id === task.id);
                const tasks = contains
                  ? c.tasks.map((t) => (t.id === task.id ? task : t))
                  : [...c.tasks, task];
                return { ...c, tasks: tasks.sort((a, b) => a.position - b.position) };
              }
              return { ...c, tasks: c.tasks.filter((t) => t.id !== task.id) };
            }),
          };
        }
        return prev;
      });
    };

    const taskDeleted = (p: { taskId: string }) => {
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) => ({
                ...c,
                tasks: c.tasks.filter((t) => t.id !== p.taskId),
              })),
            }
          : prev,
      );
    };

    const commentEvent = (p: {
      taskId: string;
      comment?: CommentDto;
      deletedCommentId?: string;
    }) => {
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) => ({
                ...c,
                tasks: c.tasks.map((t) => {
                  if (t.id !== p.taskId) return t;
                  const comments = t.comments ?? [];
                  if (p.deletedCommentId) {
                    return { ...t, comments: comments.filter((cm) => cm.id !== p.deletedCommentId) };
                  }
                  if (p.comment && !comments.some((cm) => cm.id === p.comment!.id)) {
                    return { ...t, comments: [...comments, p.comment] };
                  }
                  return t;
                }),
              })),
            }
          : prev,
      );
    };

    const columnCreated = (col: ColumnDto) => {
      setBoard((prev) =>
        prev && !prev.columns.some((c) => c.id === col.id)
          ? { ...prev, columns: [...prev.columns, col] }
          : prev,
      );
    };

    const columnUpdated = (col: ColumnDto) => {
      setBoard((prev) =>
        prev
          ? { ...prev, columns: prev.columns.map((c) => (c.id === col.id ? col : c)) }
          : prev,
      );
    };

    const columnDeleted = (p: { columnId: string }) => {
      setBoard((prev) =>
        prev
          ? { ...prev, columns: prev.columns.filter((c) => c.id !== p.columnId) }
          : prev,
      );
    };

    socket.on(BoardEvent.PRESENCE, presence);
    socket.on(BoardEvent.TASK_CREATED, taskCreated);
    socket.on(BoardEvent.TASK_UPDATED, taskUpdated);
    socket.on(BoardEvent.TASK_MOVED, taskMoved);
    socket.on(BoardEvent.TASK_DELETED, taskDeleted);
    socket.on(BoardEvent.TASK_UPDATED + ':comment', commentEvent);
    socket.on(BoardEvent.COLUMN_CREATED, columnCreated);
    socket.on(BoardEvent.COLUMN_UPDATED, columnUpdated);
    socket.on(BoardEvent.COLUMN_DELETED, columnDeleted);

    return () => {
      cancelled = true;
      socket.emit('board:unsubscribe', { boardId });
      socket.off('connect', subscribe);
      socket.off(BoardEvent.PRESENCE, presence);
      socket.off(BoardEvent.TASK_CREATED, taskCreated);
      socket.off(BoardEvent.TASK_UPDATED, taskUpdated);
      socket.off(BoardEvent.TASK_MOVED, taskMoved);
      socket.off(BoardEvent.TASK_DELETED, taskDeleted);
      socket.off(BoardEvent.TASK_UPDATED + ':comment', commentEvent);
      socket.off(BoardEvent.COLUMN_CREATED, columnCreated);
      socket.off(BoardEvent.COLUMN_UPDATED, columnUpdated);
      socket.off(BoardEvent.COLUMN_DELETED, columnDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  return {
    board,
    loading,
    error,
    activeUserIds,
    /** Movimiento optimista: aplica el cambio en el board de inmediato.
     *  El evento del socket llega después y converge al estado real. */
    optimisticMove: (taskId: string, targetColumnId: string, position: number) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const all = prev.columns.flatMap((c) => c.tasks);
        const task = all.find((t) => t.id === taskId);
        if (!task) return prev;
        const moved = { ...task, columnId: targetColumnId, position };
        const targetTasks = prev.columns.find((c) => c.id === targetColumnId)?.tasks ?? [];
        const withoutSelf = targetTasks.filter((t) => t.id !== taskId);
        const idx = Math.min(Math.max(0, position), withoutSelf.length);
        const next = [...withoutSelf];
        next.splice(idx, 0, moved);
        return {
          ...prev,
          columns: prev.columns.map((c) => {
            if (c.id === targetColumnId) return { ...c, tasks: next };
            return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
          }),
        };
      });
    },
    /** Reorden optimista dentro de una columna. */
    optimisticReorder: (columnId: string, orderedTaskIds: string[]) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((c) =>
            c.id === columnId
              ? {
                  ...c,
                  tasks: orderedTaskIds
                    .map((id) => c.tasks.find((t) => t.id === id))
                    .filter((t): t is TaskDto => Boolean(t)),
                }
              : c,
          ),
        };
      });
    },
  };
}