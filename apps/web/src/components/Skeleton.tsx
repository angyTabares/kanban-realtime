export function Skeleton({ width, height, radius = 8 }: { width?: string | number; height?: string | number; radius?: number }) {
  return (
    <div
      className="skeleton"
      style={{
        width: width ?? '100%',
        height: height ?? 14,
        borderRadius: radius,
      }}
    />
  );
}

export function BoardCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      <Skeleton width={32} height={32} radius={8} />
      <Skeleton width="60%" height={16} radius={6} />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="90%" height={12} />
        <Skeleton width="50%" height={12} />
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
        <Skeleton width={50} height={12} radius={6} />
        <Skeleton width={60} height={12} radius={6} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <BoardCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div className="kanban-column" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <Skeleton width={100} height={14} />
        <Skeleton width={20} height={20} radius={6} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
          <Skeleton width="85%" height={14} />
          <Skeleton width="60%" height={12} />
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton width={60} height={10} />
            <Skeleton width={70} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="board-header" style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 24px' }}>
        <div className="board-header-row">
          <Skeleton width={80} height={14} radius={6} />
          <Skeleton width={180} height={18} radius={8} />
          <Skeleton width={120} height={20} radius={6} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Skeleton width={30} height={30} radius={15} />
            <Skeleton width={30} height={30} radius={15} />
            <Skeleton width={80} height={30} radius={8} />
          </div>
        </div>
      </div>
      <div className="board-columns-wrapper">
        <div className="board-columns">
          {Array.from({ length: 3 }).map((_, i) => (
            <ColumnSkeleton key={i} />
          ))}
          <div style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: 12, padding: '24px 20px', width: 180, height: 80 }}>
            <Skeleton width="70%" height={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
