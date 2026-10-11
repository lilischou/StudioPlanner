import React from 'react';
import { IconGroupe } from './icons';

interface AssigneeAvatarProps {
  assignee?: string;
  color?: string;
  size?: number; // e.g. 16, 20, 24, 28
  className?: string;
}

// Helper to determine if hex is dark or light
function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return true;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  // Perceived luminance formula (ITU-R BT.709)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum >= 0.55;
}

// Preset color assignments for common names if not provided
const NAME_COLORS: Record<string, string> = {
  lilou: '#22408F',
  agathe: '#2E8B4A',
  catherine: '#F2D21B',
  marine: '#F0505A',
  antoine: '#2F6DBB',
  clara: '#7A4A9E',
  thomas: '#F2661F',
};

function resolveColor(name: string, customColor?: string): string {
  if (customColor) return customColor;
  const key = name.trim().toLowerCase();
  if (NAME_COLORS[key]) return NAME_COLORS[key];
  // Deterministic palette
  const palette = ['#22408F', '#2F6DBB', '#2E8B4A', '#F2D21B', '#F0505A', '#F2661F', '#7A4A9E'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

export const AssigneeAvatar: React.FC<AssigneeAvatarProps> = ({
  assignee = 'Tous',
  color,
  size = 28,
  className = '',
}) => {
  const cleanName = assignee.trim();
  const isAll =
    !cleanName ||
    cleanName.toLowerCase() === 'tous' ||
    cleanName.toLowerCase() === 'all' ||
    cleanName.toLowerCase() === 'groupe' ||
    cleanName.toLowerCase() === 'équipe';

  if (isAll) {
    const iconSize = Math.max(12, Math.round(size * 0.6));
    return (
      <div
        role="img"
        aria-label="Tous les membres"
        title="Tous les membres"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          backgroundColor: '#D1DFF0',
        }}
        className={`rounded-full border-2 border-[#22408F] flex items-center justify-center text-[#22408F] shrink-0 ${className}`}
      >
        <IconGroupe size={iconSize} />
      </div>
    );
  }

  const bgColor = resolveColor(cleanName, color);
  const light = isLightColor(bgColor);
  const textColor = light ? '#22408F' : '#FFFFFF';
  const initial = cleanName.charAt(0).toUpperCase();

  return (
    <div
      role="img"
      aria-label={cleanName}
      title={cleanName}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        backgroundColor: bgColor,
        color: textColor,
      }}
      className={`rounded-full border-2 border-[#22408F] flex items-center justify-center font-bold font-heading shrink-0 text-center select-none ${className}`}
    >
      <span
        style={{
          fontSize: Math.max(10, Math.round(size * 0.46)),
          lineHeight: 1,
        }}
      >
        {initial}
      </span>
    </div>
  );
};
