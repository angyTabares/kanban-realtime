import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';

export function ModernDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const display = value ? new Date(value + 'T00:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';
  const [cursor, setCursor] = useState(() => (value ? new Date(value + 'T00:00:00') : new Date()));

  useEffect(() => {
    if (value) setCursor(new Date(value + 'T00:00:00'));
  }, [value]);

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    }
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const start = (first + 6) % 7;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: '9px 12px',
          fontSize: 13.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: value ? 'var(--text)' : '#9ca3af',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>📅 {display}</span>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxWidth: '90vw', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 12, zIndex: 9999 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button type="button" onClick={() => setCursor(new Date(y, m - 1, 1))} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{cursor.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setCursor(new Date(y, m + 1, 1))} style={navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {Array.from({ length: start }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const selected = value === iso;
              const today = new Date().toISOString().slice(0, 10) === iso;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={{
                    height: 30,
                    borderRadius: 8,
                    border: 'none',
                    background: selected ? 'var(--primary)' : today ? '#ede9fe' : 'transparent',
                    color: selected ? '#fff' : today ? '#6d28d9' : 'var(--text)',
                    fontWeight: selected || today ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} style={{ marginTop: 10, width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
              Quitar fecha
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = { background: '#f3f4f6', border: 'none', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14 };

export function ModernAssigneeSelect({
  value,
  onChange,
  members,
}: {
  value: string;
  onChange: (v: string) => void;
  members: { userId: string; user: { name: string } }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = members.find((m) => m.userId === value);

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    }
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 13.5,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontWeight: 500,
          color: value ? 'var(--text)' : '#9ca3af',
        }}
      >
        {selected ? <Avatar name={selected.user.name} size={22} /> : <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>?</span>}
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected ? selected.user.name : 'Sin asignar'}</span>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxWidth: '90vw', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', zIndex: 9999, padding: 6 }}>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8, border: 'none', background: !value ? '#ede9fe' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>?</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Sin asignar</span>
          </button>
          {members.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => { onChange(m.userId); setOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: value === m.userId ? '#ede9fe' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Avatar name={m.user.name} size={22} />
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.user.name}</span>
              {value === m.userId && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
