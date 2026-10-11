import React from 'react';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  dotColor?: string;
  variant?: 'default' | 'danger' | 'phase';
  size?: 'sm' | 'md';
}

export const Pill: React.FC<PillProps> = ({
  dotColor,
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  let variantClass = 'bg-white text-[var(--riso-ink)] border-2 border-[var(--riso-ink)]';
  if (variant === 'danger') {
    variantClass = 'bg-[var(--riso-p4-tint)] text-[var(--riso-p4-text)] border-2 border-[var(--riso-p4)]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[999px] font-bold font-heading lowercase tracking-tight select-none tabular-nums ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full shrink-0 border border-[var(--riso-ink)]"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
