import type { ReactNode } from 'react';
import { IconBlocked, IconCheck, IconInfo, IconReview } from './Icons';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'positive';

const ICON: Record<NoticeTone, (props: { size?: number }) => React.JSX.Element> = {
  info: IconInfo,
  warning: IconReview,
  danger: IconBlocked,
  positive: IconCheck,
};

const COLOUR: Record<NoticeTone, string> = {
  info: 'var(--muted)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  positive: 'var(--lime)',
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
  const Icon = ICON[tone];
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="notice__glyph" style={{ color: COLOUR[tone] }}>
        <Icon size={15} />
      </span>
      <div className="stack" style={{ gap: 5, flex: 1 }}>
        <p className="notice__title">{title}</p>
        {children ? <div className="small muted">{children}</div> : null}
        {action ? <div className="row">{action}</div> : null}
      </div>
    </div>
  );
}
