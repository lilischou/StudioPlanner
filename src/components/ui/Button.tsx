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
      'bg-[#2F6DBB] text-white border-2 border-[#22408F] shadow-[0_4px_0_#F0505A] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#F0505A] active:translate-y-[2px] active:shadow-[0_2px_0_#F0505A]',
    secondary:
      'bg-white text-[#22408F] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] hover:bg-[#D3E0F2]/30 hover:-translate-y-0.5 hover:shadow-[0_6px_0_#22408F] active:translate-y-[2px] active:shadow-[0_2px_0_#22408F]',
    danger:
      'bg-white text-[#C4111C] border-2 border-[#F0505A] shadow-[0_4px_0_#F0505A] hover:bg-[#FAD7DA]/30 hover:-translate-y-0.5 hover:shadow-[0_6px_0_#F0505A] active:translate-y-[2px] active:shadow-[0_2px_0_#F0505A]',
    ghost:
      'bg-transparent text-[#22408F] border-2 border-transparent hover:bg-[#D3E0F2]/40 active:translate-y-[1px]',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none shadow-none transform-none'
    : 'cursor-pointer';

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[999px] font-bold font-heading lowercase tracking-tight transition-all duration-150 ease-out select-none focus-visible:outline-3 focus-visible:outline-[#F2D21B] focus-visible:outline-offset-2 ${sizeClasses} ${variantClasses} ${disabledClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
