import React from 'react';
import { IconJalon } from '../icons';

export interface MilestoneCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  title,
  subtitle,
  badge,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--riso-p2-tint)] border-2 border-[var(--riso-ink)] shadow-[0_4px_0_var(--riso-ink)] rounded-[8px] p-3.5 flex items-center justify-between gap-3 text-[var(--riso-ink)] ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] transition-all duration-150 ease-out'
          : ''
      } ${className}`}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[var(--riso-ink)] text-white flex items-center justify-center shrink-0 border-2 border-[var(--riso-ink)]">
          <IconJalon size={18} className="text-white" />
        </div>

        <div className="min-w-0 truncate">
          <h4 className="font-bold font-heading text-sm text-[var(--riso-ink)] lowercase truncate">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-[var(--riso-ink-secondary)] truncate tabular-nums">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {badge && <div className="shrink-0">{badge}</div>}
    </div>
  );
};
