/**
 * StudioPlanner - Thème Riso 4 couleurs · encre bleue
 * 
 * Fichier unique de centralisation des styles, couleurs, bordures, typographies,
 * et tokens graphiques selon les spécifications strictes :
 * 
 * 1. Couleurs de base :
 *    - Fond de page : #FBFAF6 (papier blanc naturel)
 *    - Cartes et panneaux : #FFFFFF
 *    - Encre dominante (texte, contours, icônes, ombres) : #22408F
 *    - Texte secondaire : #5A6A94
 * 
 * 2. 6 Phases du projet de design :
 *    - 1 Exploration : #2F6DBB (bleu)
 *    - 2 Cadrage : #2E8B4A (vert)
 *    - 3 Idéation : #F2D21B (jaune)
 *    - 4 Prototypage : #F0505A (rose)
 *    - 5 Prise de recul : #F2661F (orange)
 *    - 6 Rendu : #7A4A9E (violet)
 * 
 * 3. Contours, ombres, arrondis :
 *    - Contour unique : 2px #22408F
 *    - Ombre nette unique : 0 4px 0 #22408F (sur cartes et fenêtres)
 *    - Ombre bouton principal : 0 4px 0 #F0505A (sur fond #2F6DBB)
 *    - Arrondis stricts autorisés : 8px (cartes, champs), 16px (notifications), 999px (boutons, pastilles)
 * 
 * 4. Boutons :
 *    - Principal : fond #2F6DBB, texte blanc, contour 2px #22408F, ombre 0 4px 0 #F0505A
 *    - Secondaire : fond #FFFFFF, contour 2px #22408F, texte #22408F
 *    - Discret : texte seul #22408F souligné au survol
 */

export interface PhaseTheme {
  id: string;
  number: number;
  name: string;
  shortName: string;
  hex: string;
  bgLight: string;
  border: string;
  text: string;
  badgeStyle: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
}

export const RISO_THEME = {
  // Couleurs de base
  paper: '#FBFAF6',
  card: '#FFFFFF',
  ink: '#22408F',
  inkSecondary: '#5A6A94',
  inkSubtle: '#8C9BBD',
  accentPink: '#F0505A',
  accentYellow: '#F2D21B',
  accentBlue: '#2F6DBB',
  accentGreen: '#2E8B4A',
  accentOrange: '#F2661F',
  accentPurple: '#7A4A9E',

  // Style de bordures et ombres
  border: '2px solid #22408F',
  borderWidth: '2px',
  borderColor: '#22408F',
  shadowCard: '0 4px 0 #22408F',
  shadowButtonPrimary: '0 4px 0 #F0505A',

  // Arrondis autorisés : 8px, 16px, 999px
  radius: {
    card: '8px',
    field: '8px',
    notification: '16px',
    pill: '999px',
    button: '999px',
  },

  // 6 Phases
  phases: {
    p1: {
      id: 'p1',
      number: 1,
      name: 'Immersion & Exploration',
      shortName: 'Exploration',
      hex: '#2F6DBB',
      bgLight: '#EBF2FB',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#EBF2FB',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
    p2: {
      id: 'p2',
      number: 2,
      name: 'Cadrage & Problématique',
      shortName: 'Cadrage',
      hex: '#2E8B4A',
      bgLight: '#EAF6EE',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#EAF6EE',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
    p3: {
      id: 'p3',
      number: 3,
      name: 'Idéation & Variations',
      shortName: 'Idéation',
      hex: '#F2D21B',
      bgLight: '#FEFCE8',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#FEFCE8',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
    p4: {
      id: 'p4',
      number: 4,
      name: 'Prototypage & Expérimentation',
      shortName: 'Prototypage',
      hex: '#F0505A',
      bgLight: '#FDEEEF',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#FDEEEF',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
    p5: {
      id: 'p5',
      number: 5,
      name: 'Prise de recul & Positionnement',
      shortName: 'Prise de recul',
      hex: '#F2661F',
      bgLight: '#FEF0E9',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#FEF0E9',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
    p6: {
      id: 'p6',
      number: 6,
      name: 'Finalisation & Rendu',
      shortName: 'Rendu',
      hex: '#7A4A9E',
      bgLight: '#F3EEF8',
      border: '#22408F',
      text: '#22408F',
      badgeStyle: {
        backgroundColor: '#F3EEF8',
        borderColor: '#22408F',
        color: '#22408F',
      },
    },
  } as Record<string, PhaseTheme>,

  // Types de session
  sessionTypes: {
    individuelle: {
      label: 'Solo',
      bg: '#EBF1FF',
      hex: '#2F6DBB',
    },
    groupe: {
      label: 'Groupe',
      bg: '#FDEEEF',
      hex: '#F0505A',
    },
    encadree: {
      label: 'Tuteur',
      bg: '#FEFCE8',
      hex: '#F2D21B',
    },
  },
};

export function getSessionTypeLabel(type?: string): string {
  if (!type) return 'Solo';
  switch (type.toLowerCase()) {
    case 'individuelle':
    case 'solo':
      return 'Solo';
    case 'groupe':
    case 'collective':
      return 'Groupe';
    case 'encadree':
    case 'encadrée':
    case 'tuteur':
      return 'Tuteur';
    default:
      return type;
  }
}

export type PhaseColorKey =
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'green'
  | 'pink'
  | 'orange';

export interface PhasePaletteEntry {
  key: PhaseColorKey;
  label: string;
  hex: string;
  bgLight: string;
  text: string;
  bg: string;
}

/**
 * Les 6 encres Riso du thème autorisées pour les phases
 */
export const RISO_PHASE_PALETTE: Record<PhaseColorKey, PhasePaletteEntry> = {
  blue: {
    key: 'blue',
    label: 'Bleu',
    hex: '#2F6DBB',
    bgLight: '#EBF2FB',
    text: 'text-white',
    bg: 'bg-[#2F6DBB]',
  },
  yellow: {
    key: 'yellow',
    label: 'Jaune',
    hex: '#F2D21B',
    bgLight: '#FEFCE8',
    text: 'text-[#22408F]',
    bg: 'bg-[#F2D21B]',
  },
  purple: {
    key: 'purple',
    label: 'Violet',
    hex: '#7A4A9E',
    bgLight: '#F3EEF8',
    text: 'text-white',
    bg: 'bg-[#7A4A9E]',
  },
  green: {
    key: 'green',
    label: 'Vert',
    hex: '#2E8B4A',
    bgLight: '#EAF6EE',
    text: 'text-white',
    bg: 'bg-[#2E8B4A]',
  },
  pink: {
    key: 'pink',
    label: 'Rose',
    hex: '#F0505A',
    bgLight: '#FDEEEF',
    text: 'text-white',
    bg: 'bg-[#F0505A]',
  },
  orange: {
    key: 'orange',
    label: 'Orange',
    hex: '#F2661F',
    bgLight: '#FEF0E9',
    text: 'text-white',
    bg: 'bg-[#F2661F]',
  },
};

const LEGACY_PHASE_COLORS: Record<string, { bg: string; text: string; hex: string; bgLight: string }> = {
  p1: { bg: 'bg-[#2F6DBB]', text: 'text-white', hex: '#2F6DBB', bgLight: '#EBF2FB' },
  p2: { bg: 'bg-[#F2D21B]', text: 'text-[#22408F]', hex: '#F2D21B', bgLight: '#FEFCE8' },
  p3: { bg: 'bg-[#7A4A9E]', text: 'text-white', hex: '#7A4A9E', bgLight: '#F3EEF8' },
  p4: { bg: 'bg-[#F0505A]', text: 'text-white', hex: '#F0505A', bgLight: '#FDEEEF' },
  p5: { bg: 'bg-[#F2661F]', text: 'text-white', hex: '#F2661F', bgLight: '#FEF0E9' },
  p6: { bg: 'bg-[#7A4A9E]', text: 'text-white', hex: '#7A4A9E', bgLight: '#F3EEF8' },
};

/**
 * Résout la couleur exacte d'une phase à partir de son objet, de sa clé ou de son identifiant
 */
export function getPhaseColor(
  target?: { couleur?: string; color?: string; id?: string } | string | null,
  allPhases?: Array<{ id: string; couleur?: string; color?: string }>
): PhasePaletteEntry {
  if (!target) return RISO_PHASE_PALETTE.blue;

  if (typeof target === 'object') {
    const raw = (target.couleur || target.color || '') as string;
    if (raw && raw in RISO_PHASE_PALETTE) {
      return RISO_PHASE_PALETTE[raw as PhaseColorKey];
    }
    if (raw) {
      const match = (Object.values(RISO_PHASE_PALETTE) as PhasePaletteEntry[]).find(
        (p) => p.hex.toLowerCase() === raw.toLowerCase()
      );
      if (match) return match;
    }
    if (target.id) {
      if (allPhases && allPhases.length > 0) {
        const found = allPhases.find((p) => p.id === target.id);
        if (found && found !== target) return getPhaseColor(found);
      }
      if (target.id === 'p1') return RISO_PHASE_PALETTE.blue;
      if (target.id === 'p2') return RISO_PHASE_PALETTE.yellow;
      if (target.id === 'p3') return RISO_PHASE_PALETTE.purple;
      if (target.id === 'p4') return RISO_PHASE_PALETTE.pink;
      if (target.id === 'p5') return RISO_PHASE_PALETTE.orange;
      if (target.id === 'p6') return RISO_PHASE_PALETTE.purple;
    }
    return RISO_PHASE_PALETTE.blue;
  }

  const str = String(target).trim();
  if (str in RISO_PHASE_PALETTE) {
    return RISO_PHASE_PALETTE[str as PhaseColorKey];
  }
  const hexMatch = (Object.values(RISO_PHASE_PALETTE) as PhasePaletteEntry[]).find(
    (p) => p.hex.toLowerCase() === str.toLowerCase()
  );
  if (hexMatch) return hexMatch;

  if (allPhases && allPhases.length > 0) {
    const found = allPhases.find((p) => p.id === str);
    if (found) return getPhaseColor(found);
  }

  if (str === 'p1') return RISO_PHASE_PALETTE.blue;
  if (str === 'p2') return RISO_PHASE_PALETTE.yellow;
  if (str === 'p3') return RISO_PHASE_PALETTE.purple;
  if (str === 'p4') return RISO_PHASE_PALETTE.pink;
  if (str === 'p5') return RISO_PHASE_PALETTE.orange;
  if (str === 'p6') return RISO_PHASE_PALETTE.purple;

  return RISO_PHASE_PALETTE.blue;
}

/**
 * PHASE_COLORS rétrocompatible dynamique
 */
export const PHASE_COLORS: Record<string, { bg: string; text: string; hex: string; bgLight: string }> = new Proxy(
  LEGACY_PHASE_COLORS,
  {
    get(target, prop: string) {
      if (typeof prop === 'string') {
        if (prop in target) return target[prop];
        if (prop in RISO_PHASE_PALETTE) {
          const entry = RISO_PHASE_PALETTE[prop as PhaseColorKey];
          return { bg: entry.bg, text: entry.text, hex: entry.hex, bgLight: entry.bgLight };
        }
      }
      return target[prop] || target.p1;
    },
  }
);

export function getPhaseTheme(phaseId?: string): PhaseTheme {
  if (phaseId && RISO_THEME.phases[phaseId]) {
    return RISO_THEME.phases[phaseId];
  }
  return RISO_THEME.phases.p1;
}
