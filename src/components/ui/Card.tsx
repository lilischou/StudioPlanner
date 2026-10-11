import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'flat';
  tint?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  radius?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const TINT_BG: Record<string, string> = {
  p1: 'var(--riso-p1-tint)',
  p2: 'var(--riso-p2-tint)',
  p3: 'var(--riso-p3-tint)',
  p4: 'var(--riso-p4-tint)',
  p5: 'var(--riso-p5-tint)',
  p6: 'var(--riso-p6-tint)',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  tint = 'p4',
  radius = 'sm',
  interactive = false,
  className = '',
  style,
  children,
  ...props
}) => {
  const radiusClass = {
    sm: 'rounded-[8px]',
    md: 'rounded-[16px]',
    lg: 'rounded-[24px]',
  }[radius];

  let variantStyle: React.CSSProperties = {};
  let variantClass = '';

  if (variant === 'highlight') {
    // fond teinte de phase + ombre jaune 4px 4px 0 #F2D21B
    variantStyle = {
      backgroundColor: TINT_BG[tint] || 'var(--riso-p4-tint)',
      boxShadow: '4px 4px 0 var(--riso-p3)',
    };
    variantClass = 'border-2 border-riso-ink';
  } else if (variant === 'flat') {
    variantClass = 'bg-white border-2 border-riso-ink shadow-none';
  } else {
    // default
    variantClass = 'bg-white border-2 border-riso-ink shadow-riso';
  }

  const interactiveClass = interactive
    ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] transition-all duration-150 ease-out'
    : '';

  return (
    <div
      className={`p-5 text-riso-ink relative overflow-hidden ${radiusClass} ${variantClass} ${interactiveClass} ${className}`}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
