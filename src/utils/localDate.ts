/**
 * Utilitaire de gestion stricte des dates locales en chaîne YYYY-MM-DD.
 * Évite les décalages de fuseau horaire causés par toISOString() et Date.UTC.
 * Les jours de semaine sont indexés de 1 (Lundi) à 7 (Dimanche).
 */

export const DAY_NAMES_FRENCH = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Formate un objet Date local en chaîne YYYY-MM-DD stricte en heure locale.
 * Évite les décalages de fuseau horaire causés par toISOString().
 */
export function toLocalYMD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const toLocalDateStr = toLocalYMD;

/**
 * Retourne la date locale d'aujourd'hui en format YYYY-MM-DD.
 */
export function getTodayLocalDateStr(): string {
  return toLocalYMD(new Date());
}

/**
 * Parse une chaîne YYYY-MM-DD en Date locale à midi (évite tout effet de bord DST).
 */
export function parseLocalDate(str: string): Date {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

/**
 * Ajoute un nombre de jours (positif ou négatif) à une date locale YYYY-MM-DD.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/**
 * Différence en jours entiers entre deux dates (to - from).
 */
export function getDaysDifference(fromStr: string, toStr: string): number {
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Retourne l'index du jour de la semaine selon la convention européenne :
 * 1 = Lundi, 2 = Mardi, ..., 6 = Samedi, 7 = Dimanche.
 */
export function getDayOfWeek(dateStr: string): number {
  const jsDay = parseLocalDate(dateStr).getDay(); // 0 = Dimanche, 1 = Lundi ... 6 = Samedi
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Libellé du jour de la semaine (1=Lundi .. 7=Dimanche).
 */
export function getDayName(dayIndex: number, short = false): string {
  const idx = Math.max(1, Math.min(7, dayIndex)) - 1;
  return short ? DAY_NAMES_SHORT[idx] : DAY_NAMES_FRENCH[idx];
}

/**
 * Formate une date YYYY-MM-DD en français lisible (ex: "Jeudi 9 octobre 2026").
 */
export function formatFrenchDateLocal(dateStr: string, withYear = true, withDayName = false): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    ...(withDayName ? { weekday: 'long' } : {}),
  };
  return d.toLocaleDateString('fr-FR', options);
}

/**
 * Vérifie si dateA <= dateB.
 */
export function isBeforeOrEqual(dateA: string, dateB: string): boolean {
  return dateA <= dateB;
}

/**
 * Vérifie si dateStr est comprise inclusivement entre startStr et endStr.
 */
export function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  return dateStr >= startStr && dateStr <= endStr;
}
