import React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'ton carnet est vide',
  actionText,
  onAction,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`riso-dots bg-[var(--riso-paper)] border-2 border-[var(--riso-ink)] rounded-[16px] p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[160px] ${className}`}
      {...props}
    >
      <div className="bg-white border-2 border-[var(--riso-ink)] rounded-[999px] shadow-riso px-6 py-2.5 inline-flex items-center gap-2 select-none">
        <span className="text-sm font-bold font-heading lowercase text-[var(--riso-ink)]">
          {message}
        </span>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-1.5 rounded-[999px] border-2 border-[var(--riso-ink)] bg-[var(--riso-p1)] text-white shadow-riso-primary text-xs font-bold font-heading lowercase cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] transition-all"
        >
          {actionText}
        </button>
      )}

      {children}
    </div>
  );
};
