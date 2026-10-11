import React from 'react';

export interface StateBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  state: 'done' | 'late' | 'upcoming';
  label?: React.ReactNode;
  rightBadge?: React.ReactNode;
}

export const StateBox: React.FC<StateBoxProps> = ({
  state,
  label,
  rightBadge,
  className = '',
  children,
  ...props
}) => {
  let stateClasses = '';

  if (state === 'done') {
    stateClasses = 'bg-white border-2 border-[var(--riso-ink)] shadow-riso';
  } else if (state === 'late') {
    stateClasses = 'bg-white border-2 border-dashed border-[var(--riso-ink)] shadow-none';
  } else {
    // upcoming
    stateClasses = 'riso-dots bg-[var(--riso-paper)] border-2 border-[var(--riso-ink)] shadow-none';
  }

  return (
    <div
      className={`p-4 rounded-[8px] text-[var(--riso-ink)] flex items-center justify-between gap-3 ${stateClasses} ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {state === 'done' && (
          <span className="font-bold text-sm text-[var(--riso-ink)] shrink-0">✓</span>
        )}
        <div className="truncate text-sm font-bold font-heading lowercase">
          {label || children}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {rightBadge ? (
          rightBadge
        ) : state === 'done' ? (
          <span className="text-xs font-bold text-[var(--riso-ink-secondary)]">contour plein</span>
        ) : state === 'late' ? (
          <span className="px-2 py-0.5 rounded-[999px] text-[11px] font-bold border-2 border-[var(--riso-ink)] bg-white text-[var(--riso-ink)]">
            échéance passée
          </span>
        ) : (
          <span className="text-xs font-bold text-[var(--riso-ink-secondary)]">trame de points</span>
        )}
      </div>
    </div>
  );
};
