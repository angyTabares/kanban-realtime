import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BoardFull } from '../lib/types';
import { Avatar } from './Avatar';
import { api } from '../lib/api';
import { toUserMessage, useToast } from '../store/toast';

export function BoardHeader({
  board,
  canEdit,
  activeUserIds,
  onMemberAdded,
}: {
  board: BoardFull;
  canEdit: boolean;
  activeUserIds: string[];
  onMemberAdded?: (member: { id: string; userId: string; role: string; user: { id: string; name: string } }) => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const toast = useToast((s) => s.push);
  const [inviting, setInviting] = useState(false);

  const onlineMembers = useMemo(
    () => (board.members ?? []).filter((m) => activeUserIds.includes(m.userId)),
    [board.members, activeUserIds],
  );
  const offlineMembers = useMemo(
    () => (board.members ?? []).filter((m) => !activeUserIds.includes(m.userId)),
    [board.members, activeUserIds],
  );

  const invite = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
    const email = inviteEmail.trim();
    if (!email) {
      toast('Email requerido', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Email no válido', 'error');
      return;
    }
    setInviting(true);
    try {
      const res = await api.post<BoardFull>(`/boards/${board.id}/members`, { email });
      // El backend devuelve el Board con members; extrae el nuevo
      const newMember = (res as unknown as BoardFull)?.members?.find((m) => m.user?.email?.toLowerCase() === email.toLowerCase() || m.userId === (res as unknown as { userId?: string }).userId);
      if (newMember) onMemberAdded?.(newMember as never);
      // Fallback: si el socket ya emitió MEMBER_ADDED con user, el círculo aparecerá igual
      setInviteEmail('');
      setShowInvite(false);
      toast('Invitación enviada', 'success');
    } catch (err) {
      toast(toUserMessage(err, 'No se pudo invitar'), 'error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="board-header">
      <div className="board-header-row">
        <Link to="/" style={{ color: 'var(--muted)', fontSize: 13 }}>← Tableros</Link>
        <h1 style={{ fontSize: 18, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{board.icon ?? '⬡'}</span> {board.name}
        </h1>
        <span style={{ background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, fontSize: 12, color: 'var(--muted)' }}>
          {board.columns.length} columnas · {board.columns.reduce((a, c) => a + c.tasks.length, 0)} tareas
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {onlineMembers.map((m) => (
              <div key={m.userId} style={{ marginRight: -8, position: 'relative' }}>
                <Avatar name={m.user?.name ?? '?'} size={30} />
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    bottom: 2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--success)',
                    border: '2px solid #fff',
                  }}
                />
              </div>
            ))}
            {offlineMembers.slice(0, 3).map((m) => (
              <div key={m.userId} style={{ marginRight: -8, opacity: 0.55 }}>
                <Avatar name={m.user?.name ?? '?'} size={30} />
              </div>
            ))}
            {offlineMembers.length > 3 && (
              <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', background: 'var(--bg)', borderRadius: '50%', width: 30, height: 30, justifyContent: 'center', fontSize: 11 }}>
                +{offlineMembers.length - 3}
              </div>
            )}
          </div>

          {canEdit && (
            <button
              onClick={() => setShowInvite((s) => !s)}
              style={{
                border: '1px solid var(--border)',
                background: 'transparent',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              + Invitar
            </button>
          )}
        </div>
      </div>

      {showInvite && canEdit && (
        <div
          style={{ maxWidth: 1300, margin: '12px auto 0', display: 'flex', gap: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void invite(e);
              if (e.key === 'Escape') setShowInvite(false);
            }}
            placeholder="email del colaborador"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              flex: 1,
              maxWidth: 320,
            }}
          />
          <button type="button" onClick={(e) => void invite(e)} disabled={inviting} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, opacity: inviting ? 0.6 : 1, cursor: inviting ? 'not-allowed' : 'pointer' }}>
            {inviting ? 'Enviando…' : 'Invitar'}
          </button>
          <button type="button" onClick={() => setShowInvite(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>✕</button>
        </div>
      )}
    </div>
  );
}