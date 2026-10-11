import React from 'react';
import { LogbookEntry, TraceCover as TraceCoverData } from '../../types/project';
import { useStoredFileUrl } from '../../utils/traceStorage';

export const DEFAULT_CROP: TraceCoverData['crop'] = { x: 50, y: 50, zoom: 1 };

/** Source affichable de la couverture : image IndexedDB, sinon ancienne photoUrl. */
export function useCoverSrc(entry: Pick<LogbookEntry, 'cover' | 'photoUrl'>): string | undefined {
  const stored = useStoredFileUrl(entry.cover?.imageRef || undefined);
  return stored ?? entry.photoUrl ?? undefined;
}

/** Image 4:3 recadrée : point focal (x, y en %) + zoom, sans librairie. */
export const CoverImage: React.FC<{
  src: string;
  crop?: TraceCoverData['crop'];
  alt?: string;
  className?: string;
}> = ({ src, crop = DEFAULT_CROP, alt = '', className = '' }) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    loading="lazy"
    className={`absolute inset-0 w-full h-full object-cover select-none ${className}`}
    style={{
      objectPosition: `${crop.x}% ${crop.y}%`,
      transform: crop.zoom > 1 ? `scale(${crop.zoom})` : undefined,
      transformOrigin: `${crop.x}% ${crop.y}%`,
    }}
  />
);

/** Trame de points de la couleur de phase (placeholder sans photo, aucun texte de phase). */
export const DotsFill: React.FC<{ hex: string; size?: number; children?: React.ReactNode }> = ({
  hex,
  size = 10,
  children,
}) => (
  <div
    className="absolute inset-0"
    style={{
      backgroundColor: `${hex}22`,
      backgroundImage: `radial-gradient(${hex} 1.5px, transparent 1.5px)`,
      backgroundSize: `${size}px ${size}px`,
    }}
  >
    {children}
  </div>
);

interface TraceCoverProps {
  entry: LogbookEntry;
  phaseHex: string;
  /** Classes de dimension. Par défaut : pleine largeur en 4:3. */
  className?: string;
  dotSize?: number;
  /** Contenu superposé au placeholder (uniquement quand il n'y a pas de photo). */
  placeholder?: React.ReactNode;
  alt?: string;
}

export const TraceCover: React.FC<TraceCoverProps> = ({
  entry,
  phaseHex,
  className = 'w-full aspect-[4/3]',
  dotSize = 10,
  placeholder,
  alt = '',
}) => {
  const src = useCoverSrc(entry);
  return (
    <div className={`relative overflow-hidden bg-riso-p1-light ${className}`}>
      {src ? (
        <CoverImage src={src} crop={entry.cover?.crop} alt={alt} />
      ) : (
        <DotsFill hex={phaseHex} size={dotSize}>
          {placeholder}
        </DotsFill>
      )}
    </div>
  );
};
