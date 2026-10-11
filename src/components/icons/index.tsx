import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Bibliothèque de pictos StudioPlanner
 * Style identique à lucide-react : viewBox 24 x 24, trait 2px, extrémités et angles arrondis,
 * pas de remplissage, couleur = currentColor (encre bleue par défaut).
 */

export const IconGroupe: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="7" r="3" />
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="5" cy="9" r="2" />
    <path d="M1.5 20c0-2.2 1.6-4 3.7-4.2" />
    <circle cx="19" cy="9" r="2" />
    <path d="M18.8 15.8c2.1.2 3.7 2 3.7 4.2" />
  </svg>
);

export const IconBinome: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="8" cy="8" r="2.5" />
    <path d="M3.5 20c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5" />
    <circle cx="16" cy="8" r="2.5" />
    <path d="M11.5 20c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5" />
  </svg>
);

export const IconSeanceEncadree: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="7" cy="8" r="2.5" />
    <path d="M3 20c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5" />
    <rect x="14" y="5" width="7" height="6" rx="1.5" />
    <path d="M17.5 11v6" />
    <path d="M15 17h5" />
  </svg>
);

export const IconJalon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <line x1="5" y1="21" x2="5" y2="4" />
    <path d="M5 4h14l-3 4.5 3 4.5H5" />
  </svg>
);

export const IconRendu: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <polyline points="7 9 12 4 17 9" />
    <line x1="12" y1="4" x2="12" y2="16" />
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const IconCarnet: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="6" y="3" width="14" height="18" rx="2" />
    <line x1="4" y1="7" x2="8" y2="7" />
    <line x1="4" y1="11" x2="8" y2="11" />
    <line x1="4" y1="15" x2="8" y2="15" />
    <line x1="4" y1="19" x2="8" y2="19" />
  </svg>
);

export const IconTrace: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2.5h5L16 6h3a2 2 0 0 1 2 2v11z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

export const IconSource: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M3 6.5C3 5 4.5 4 7 4c2.5 0 5 1.5 5 2.5v13.5c0-1-2.5-2.5-5-2.5-2.5 0-4 1-4 2V6.5z" />
    <path d="M21 6.5C21 5 19.5 4 17 4c-2.5 0-5 1.5-5 2.5v13.5c0-1 2.5-2.5 5-2.5 2.5 0 4 1 4 2V6.5z" />
  </svg>
);

export const IconEntretien: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="8" y1="21" x2="16" y2="21" />
  </svg>
);

export const IconImpression: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M6 8V3h12v5" />
    <rect x="3" y="8" width="18" height="9" rx="2" />
    <path d="M6 14h12v7H6z" />
    <circle cx="17.5" cy="11.5" r="0.5" fill="currentColor" />
  </svg>
);

export const IconVariation: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="8" y="4" width="12" height="12" rx="2.5" />
    <rect x="4" y="8" width="12" height="12" rx="2.5" />
  </svg>
);
