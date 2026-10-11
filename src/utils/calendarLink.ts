/**
 * Générateur de lien Google Agenda direct (sans API ni OAuth)
 * Format : https://calendar.google.com/calendar/render?action=TEMPLATE
 * Dates : début et fin au format AAAAMMJJTHHMMSS (heure locale)
 */

export interface CalendarEventParams {
  title: string;
  durationMinutes?: number;
  date?: string; // Format YYYY-MM-DD ou ISO
  projectName?: string;
  phaseName?: string;
}

/**
 * Formate une date en chaîne locale AAAAMMJJTHHMMSS
 */
export function formatLocalGCalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Retourne la date de l'heure suivante arrondie pour aujourd'hui
 */
export function getNextRoundedHour(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
}

/**
 * Construit l'URL Google Agenda avec action=TEMPLATE
 */
export function buildGoogleCalendarUrl({
  title,
  durationMinutes = 25,
  date,
  projectName,
  phaseName,
}: CalendarEventParams): string {
  const dur = durationMinutes && durationMinutes > 0 ? durationMinutes : 25;
  const now = new Date();

  let start: Date;
  if (date) {
    if (date.includes('T')) {
      const parsed = new Date(date);
      start = isNaN(parsed.getTime()) ? getNextRoundedHour(now) : parsed;
    } else {
      const parts = date.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [year, month, day] = parts;
        const isToday =
          year === now.getFullYear() &&
          month === now.getMonth() + 1 &&
          day === now.getDate();
        if (isToday) {
          start = new Date(year, month - 1, day, now.getHours() + 1, 0, 0);
        } else {
          start = new Date(year, month - 1, day, 9, 0, 0);
        }
      } else {
        start = getNextRoundedHour(now);
      }
    }
  } else {
    start = getNextRoundedHour(now);
  }

  const end = new Date(start.getTime() + dur * 60 * 1000);

  const textParam = encodeURIComponent(title.trim() || 'Séance StudioPlanner');
  const datesParam = `${formatLocalGCalDate(start)}/${formatLocalGCalDate(end)}`;

  const detailsParts = [projectName, phaseName].filter(Boolean);
  const detailsParam = encodeURIComponent(
    detailsParts.length > 0 ? detailsParts.join(' · ') : 'StudioPlanner'
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${textParam}&dates=${datesParam}&details=${detailsParam}`;
}
