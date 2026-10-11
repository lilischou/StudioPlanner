import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[var(--riso-ink)]/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-2xl rounded-t-[24px] border-t-2 border-x-2 border-[var(--riso-ink)] shadow-[0_-4px_0_var(--riso-ink)] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-150 ease-out overflow-hidden text-[var(--riso-ink)] pb-20 md:pb-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée centrale */}
        <div className="w-12 h-1 bg-[var(--riso-ink)]/30 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* En-tête */}
        {(title || subtitle) && (
          <div className="px-6 py-3 border-b-2 border-[var(--riso-ink)] flex items-start justify-between gap-4 shrink-0 bg-[var(--riso-paper)]">
            <div>
              {subtitle && (
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--riso-ink-secondary)] block">
                  {subtitle}
                </span>
              )}
              {title && (
                <h3 className="text-lg font-bold font-heading lowercase tracking-tight text-[var(--riso-ink)] mt-0.5">
                  {title}
                </h3>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 rounded-[8px] text-[var(--riso-ink-secondary)] hover:text-[var(--riso-ink)] hover:bg-[var(--riso-p1-tint)]/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Contenu avec défilement interne */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
