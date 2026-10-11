import React from 'react';

export interface ProgressRingProps {
  outerFraction: number; // 0 to 1
  innerFraction?: number; // 0 to 1
  size?: number;
  outerColor?: string;
  innerColor?: string;
  label?: React.ReactNode;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  outerFraction,
  innerFraction = 0,
  size = 130,
  outerColor = 'var(--riso-p1)',
  innerColor = 'var(--riso-p2)',
  label,
  className = '',
}) => {
  const strokeWidth = 11;
  const center = size / 2;
  const outerRadius = center - strokeWidth / 2 - 2;
  const innerRadius = outerRadius - strokeWidth - 5;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const safeOuter = Math.min(1, Math.max(0, outerFraction));
  const safeInner = Math.min(1, Math.max(0, innerFraction));

  const outerOffset = outerCircumference - safeOuter * outerCircumference;
  const innerOffset = innerCircumference - safeInner * innerCircumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Outer Background */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="var(--riso-line)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Outer Value */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke={outerColor}
          strokeWidth={strokeWidth}
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerOffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />

        {/* Inner Background */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="var(--riso-line)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Inner Value */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke={innerColor}
          strokeWidth={strokeWidth}
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerOffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
        {label !== undefined ? (
          label
        ) : (
          <span className="text-xs font-bold text-[var(--riso-ink)] font-heading tabular-nums">
            {Math.round(safeOuter * 100)}%
          </span>
        )}
      </div>
    </div>
  );
};
