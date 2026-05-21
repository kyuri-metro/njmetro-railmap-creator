type DropdownMenuChevronProps = {
  className?: string;
  /** 像素尺寸；省略时与文字按钮一致用 0.72em */
  size?: number;
};

export function DropdownMenuChevron({ className = 'dropdown-menu-chevron', size }: DropdownMenuChevronProps) {
  const width = size ?? '0.72em';
  const height = size ?? '0.72em';

  return (
    <svg className={className} viewBox="0 0 16 16" width={width} height={height} aria-hidden="true">
      <path
        d="M4 7 L8 11 L12 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
