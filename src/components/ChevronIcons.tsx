type ChevronIconProps = {
  className?: string;
};

const chevronPathProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

/** 几何 Chevron（与 DropdownMenuChevron 同风格，指向右侧） */
export function ChevronRightIcon({ className = 'chevron-icon' }: ChevronIconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M6 4 L10 8 L6 12" {...chevronPathProps} />
    </svg>
  );
}

/** 几何 Chevron（指向左侧，用于返回） */
export function ChevronLeftIcon({ className = 'chevron-icon' }: ChevronIconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path d="M10 4 L6 8 L10 12" {...chevronPathProps} />
    </svg>
  );
}
