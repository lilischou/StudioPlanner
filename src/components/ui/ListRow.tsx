import React from 'react';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  interactive = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`min-h-[52px] py-3 px-3.5 border-b border-[var(--riso-line)] last:border-b-0 flex items-center justify-between gap-3 text-sm text-[var(--riso-ink)] transition-colors duration-150 ease-out ${
        interactive
          ? 'cursor-pointer hover:bg-[var(--riso-p1-tint)]/25 focus-visible:outline-3 focus-visible:outline-[var(--riso-p3)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
