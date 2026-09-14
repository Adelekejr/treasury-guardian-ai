/**
 * Icon set.
 *
 * Every risk icon has a deliberately different silhouette — octagon, triangle,
 * dashed circle, shield — so the four verdicts stay distinguishable with the
 * colour removed, and remain paired with their text label everywhere.
 */
export interface IconProps {
  readonly size?: number;
  readonly className?: string;
}

function svgProps(size: number): Record<string, string | number> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
}

/**
 * Blocked — a solid octagon with the bar knocked out. Filled, so its
 * silhouette cannot be mistaken for the outlined circle or shield, and it
 * carries the most visual weight of the four verdicts.
 */
export function IconBlocked({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className} stroke="none">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.2 1.6h7.6l6.6 6.6v7.6l-6.6 6.6H8.2l-6.6-6.6V8.2zM7.2 10.8h9.6v2.4H7.2z"
      />
    </svg>
  );
}

/** Review required — triangle with a bang. */
export function IconReview({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 3.2 22 20.4H2z" />
      <path d="M12 9.6v4.2" />
      <path d="M12 17.1h.01" />
    </svg>
  );
}

/** Insufficient data — dashed circle with a query mark. */
export function IconUnknown({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" strokeDasharray="3 2.6" />
      <path d="M9.4 9.5a2.7 2.7 0 1 1 3.4 2.7c-.7.2-1 .8-1 1.6v.3" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

/** Low risk — shield with a check. */
export function IconLow({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 2.6 20 5.6v6c0 4.5-3.2 8.1-8 9.8-4.8-1.7-8-5.3-8-9.8v-6z" />
      <path d="m8.6 12 2.5 2.5 4.3-4.6" />
    </svg>
  );
}

/** Information — solid circle with an i. Distinct from the dashed circle. */
export function IconInfo({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M12 11.2v5" />
      <path d="M12 7.8h.01" />
    </svg>
  );
}

export function IconCheck({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="m8 12.2 2.7 2.7L16.2 9" />
    </svg>
  );
}

export function IconCross({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function IconPending({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" strokeDasharray="2.4 2.6" />
    </svg>
  );
}

export function IconRunning({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" opacity="0.35" />
      <path d="M12 2.6a9.4 9.4 0 0 1 9.4 9.4" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconDash({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9.4" opacity="0.5" />
      <path d="M8.4 12h7.2" />
    </svg>
  );
}

export function IconWallet({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3.4 7.6a2 2 0 0 1 2-2h11.2a2 2 0 0 1 2 2v9.8a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z" />
      <path d="M18.6 10.6h2.2v3.4h-2.2a1.7 1.7 0 0 1 0-3.4z" />
    </svg>
  );
}

export function IconOverview({ size = 18, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3.4 15.4a9 9 0 1 1 17.2 0" />
      <path d="m12 12.6 4.2-4" />
      <path d="M3.4 19h17.2" />
    </svg>
  );
}

export function IconHistory({ size = 18, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
    </svg>
  );
}

export function IconSettings({ size = 18, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2.2" />
      <circle cx="9" cy="16.5" r="2.2" />
    </svg>
  );
}

export function IconChevron({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}
