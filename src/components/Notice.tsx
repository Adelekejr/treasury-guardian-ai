import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'positive';

const GLYPH: Record<NoticeTone, string> = {
  info: 'i',
  warning: '!',
  danger: 'x',
  positive: '✓',
};

export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: NoticeTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="notice__glyph" aria-hidden="true">
        [{GLYPH[tone]}]
      </span>
      <div className="stack" style={{ gap: 6, flex: 1 }}>
        <p className="notice__title">{title}</p>
        {children ? <div className="small muted">{children}</div> : null}
        {action ? <div className="row">{action}</div> : null}
      </div>
    </div>
  );
}
