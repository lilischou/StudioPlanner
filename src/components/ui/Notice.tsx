import React from 'react';

export interface NoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  message: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const Notice: React.FC<NoticeProps> = ({
  message,
  actionText,
  onAction,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div
      role="status"
      className={`bg-[var(--riso-p5-tint)] border-2 border-[var(--riso-ink)] shadow-riso rounded-[16px] px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-[var(--riso-ink)] min-h-[44px] ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-5 h-5 rounded-full border-2 border-[var(--riso-ink)] bg-white flex items-center justify-center shrink-0 text-xs font-bold">
          {icon || '✓'}
        </span>
        <span className="font-bold font-heading lowercase truncate">
          {message}
        </span>
      </div>

      {actionText && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 font-bold font-heading lowercase text-xs text-[var(--riso-p5-text)] hover:underline hover:opacity-80 transition-opacity cursor-pointer pl-2"
        >
          {actionText} →
        </button>
      )}
    </div>
  );
};
