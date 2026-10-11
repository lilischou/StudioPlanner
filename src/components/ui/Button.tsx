import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  // Base sizing and typography
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 min-h-[36px]',
    md: 'text-sm py-2.5 px-5 min-h-[44px]',
    lg: 'text-base py-3 px-6 min-h-[48px]',
  }[size];

  // Variants according to StudioPlanner charte
  // Appui : translateY(2px) + shadow 0 2px 0 (shadow-press)
  // Transition : 150ms ease-out
  const variantClasses = {
    primary:
      'bg-riso-p1 text-white border-2 border-riso-ink shadow-riso-primary hover:-translate-y-0.5 hover:shadow-riso-primary active:translate-y-[2px] active:shadow-riso-primary',
    secondary:
      'bg-white text-riso-ink border-2 border-riso-ink shadow-riso hover:bg-riso-p1-tint/30 hover:-translate-y-0.5 hover:shadow-riso active:translate-y-[2px] active:shadow-riso-press',
    danger:
      'bg-white text-riso-p4-text border-2 border-riso-p4 shadow-riso-primary hover:bg-riso-p4-tint/30 hover:-translate-y-0.5 hover:shadow-riso-primary active:translate-y-[2px] active:shadow-riso-primary',
    ghost:
      'bg-transparent text-riso-ink border-2 border-transparent hover:bg-riso-p1-tint/40 active:translate-y-[1px]',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none shadow-none transform-none'
    : 'cursor-pointer';

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[999px] font-bold font-heading lowercase tracking-tight transition-all duration-150 ease-out select-none focus-visible:outline-3 focus-visible:outline-riso-p3 focus-visible:outline-offset-2 ${sizeClasses} ${variantClasses} ${disabledClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
