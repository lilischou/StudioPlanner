import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'flat';
  tint?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  radius?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const TINT_BG: Record<string, string> = {
  p1: '#D3E0F2',
  p2: '#D3E8DA',
  p3: '#FCF3C4',
  p4: '#FAD7DA',
  p5: '#FCDCCB',
  p6: '#E2D8EE',
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
      backgroundColor: TINT_BG[tint] || '#FAD7DA',
      boxShadow: '4px 4px 0 #F2D21B',
    };
    variantClass = 'border-2 border-[#22408F]';
  } else if (variant === 'flat') {
    variantClass = 'bg-white border-2 border-[#22408F] shadow-none';
  } else {
    // default
    variantClass = 'bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F]';
  }

  const interactiveClass = interactive
    ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] transition-all duration-150 ease-out'
    : '';

  return (
    <div
      className={`p-5 text-[#22408F] relative overflow-hidden ${radiusClass} ${variantClass} ${interactiveClass} ${className}`}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
