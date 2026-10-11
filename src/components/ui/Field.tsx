import React from 'react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  helper,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold font-heading uppercase tracking-wider text-[var(--riso-ink)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-h-[44px] px-3.5 py-2.5 bg-white text-[var(--riso-ink)] border-2 rounded-[8px] text-sm font-medium transition-colors duration-150 ease-out focus:outline-3 focus:outline-[var(--riso-p3)] focus:outline-offset-1 focus:border-[var(--riso-ink)] ${
          error
            ? 'border-[var(--riso-p4)] bg-[var(--riso-p4-tint)]/20'
            : 'border-[var(--riso-ink)]'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs font-bold text-[var(--riso-p4-text)] pt-0.5">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-[var(--riso-ink-secondary)] pt-0.5">
          {helper}
        </p>
      )}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helper,
  id,
  className = '',
  children,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold font-heading uppercase tracking-wider text-[var(--riso-ink)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full min-h-[44px] px-3.5 py-2.5 bg-white text-[var(--riso-ink)] border-2 rounded-[8px] text-sm font-bold appearance-none transition-colors duration-150 ease-out focus:outline-3 focus:outline-[var(--riso-p3)] focus:outline-offset-1 focus:border-[var(--riso-ink)] cursor-pointer pr-10 ${
            error
              ? 'border-[var(--riso-p4)] bg-[var(--riso-p4-tint)]/20'
              : 'border-[var(--riso-ink)]'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--riso-ink)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-xs font-bold text-[var(--riso-p4-text)] pt-0.5">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-[var(--riso-ink-secondary)] pt-0.5">
          {helper}
        </p>
      )}
    </div>
  );
};
