import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  className = '',
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px] min-w-[44px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-6 h-6 rounded-full border-2 border-[var(--riso-ink)] flex items-center justify-center transition-all duration-150 ease-out focus-visible:outline-3 focus-visible:outline-[var(--riso-p3)] focus-visible:outline-offset-2 shrink-0 cursor-pointer ${
          checked
            ? 'bg-[var(--riso-ink)] text-white shadow-[0_2px_0_var(--riso-ink)]'
            : 'bg-white hover:bg-[var(--riso-p1-tint)]/40 shadow-none'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
      </button>
      {label && (
        <span className="text-sm font-medium text-[var(--riso-ink)]">
          {label}
        </span>
      )}
    </label>
  );
};
