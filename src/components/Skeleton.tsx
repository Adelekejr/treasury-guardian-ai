export function Skeleton({ width = '100%', height = 12 }: { width?: string; height?: number }): React.JSX.Element {
  return <div className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3, label }: { lines?: number; label: string }): React.JSX.Element {
  return (
    <div className="card stack" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton width="40%" height={16} />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index % 2 === 0 ? '90%' : '70%'} />
      ))}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }): React.JSX.Element {
  return (
    <div className="empty stack" style={{ gap: 4 }}>
      <p style={{ fontWeight: 700, color: 'var(--ink)' }}>{title}</p>
      <p className="small">{detail}</p>
    </div>
  );
}
