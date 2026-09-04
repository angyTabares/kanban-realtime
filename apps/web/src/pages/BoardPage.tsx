import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBoard } from '../hooks/useBoard';
import { usePresence } from '../store/presence';
import { useAuth } from '../store/auth';
import { useBoardState } from '../store/board';
import { BoardPageColumns } from '../components/BoardPageColumns';
import { BoardHeader } from '../components/BoardHeader';
import { BoardFull } from '../lib/types';
import { BoardSkeleton } from '../components/Skeleton';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const me = useAuth((s) => s.user!);
  const { board, loading, error, activeUserIds, addTask, removeTask, addMember, optimisticMove, optimisticReorder } =
    useBoard(boardId!);
  const clearPresence = usePresence((s) => s.clear);
  const setBoardState = useBoardState((s) => s.setBoardState);
  const clearBoard = useBoardState((s) => s.clear);
  const [myRole, setMyRole] = useState<null | string>(null);

  useEffect(() => {
    if (board) {
      setBoardState(board);
      document.title = `${board.name} | Kanban Live`;
    } else {
      document.title = 'Tablero | Kanban Live';
    }
  }, [board, setBoardState]);

  useEffect(() => {
    if (!board) return;
    const role = (board.members ?? []).find((m) => m.userId === me.id)?.role ?? 'VIEWER';
    setMyRole(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, me.id]);

  useEffect(() => {
    return () => {
      clearPresence();
      clearBoard();
    };
  }, [clearPresence, clearBoard]);

  if (loading && !board) {
    return <BoardSkeleton />;
  }

  if (error && !board) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <Link to="/" style={{ color: 'var(--primary)' }}>
          Volver a mis tableros
        </Link>
      </div>
    );
  }

  if (!board) return null;

  const canEdit = ['OWNER', 'ADMIN', 'MEMBER'].includes(myRole ?? 'VIEWER');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BoardHeader board={board} canEdit={canEdit} activeUserIds={activeUserIds} onMemberAdded={addMember} />
      <BoardPageColumns
        board={board as BoardFull}
        canEdit={canEdit}
        addTask={addTask}
        removeTask={removeTask}
        optimisticMove={optimisticMove}
        optimisticReorder={optimisticReorder}
      />
    </div>
  );
}