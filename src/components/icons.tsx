type IconProps = {
  className?: string;
};

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...commonProps} aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg className={className} {...commonProps} aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} {...commonProps} aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...commonProps} aria-hidden="true">
      <path d="M5 5v6" />
      <path d="M5 15v4" />
      <circle cx="5" cy="12.5" r="1.6" />
      <path d="M12 5v3" />
      <path d="M12 12v7" />
      <circle cx="12" cy="9.5" r="1.6" />
      <path d="M19 5v9" />
      <path d="M19 18v1" />
      <circle cx="19" cy="16" r="1.6" />
    </svg>
  );
}
