import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BoardFull } from '../lib/types';
import { Avatar } from './Avatar';
import { api } from '../lib/api';

export function BoardHeader({
  board,
  canEdit,
  activeUserIds,
}: {
  board: BoardFull;
  canEdit: boolean;
  activeUserIds: string[];
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const onlineMembers = useMemo(
    () => board.members.filter((m) => activeUserIds.includes(m.userId)),
    [board.members, activeUserIds],
  );
  const offlineMembers = useMemo(
    () => board.members.filter((m) => !activeUserIds.includes(m.userId)),
    [board.members, activeUserIds],
  );

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await api.post(`/boards/${board.id}/members`, { email: inviteEmail.trim() });
      setInviteEmail('');
      setShowInvite(false);
    } catch {
      /* convergerá */
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
                <Avatar name={m.user.name} size={30} />
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
                <Avatar name={m.user.name} size={30} />
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
        <form
          onSubmit={invite}
          style={{ maxWidth: 1300, margin: '12px auto 0', display: 'flex', gap: 8 }}
        >
          <input
            autoFocus
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
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
          <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            Invitar
          </button>
        </form>
      )}
    </div>
  );
}