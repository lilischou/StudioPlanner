/**
 * Détection du type d'un lien par son domaine / son extension.
 * Aucun appel réseau, aucune API Google : analyse purement syntaxique de l'URL.
 */
import { TraceDocType } from '../types/project';

export const DOC_TYPE_LABELS: Record<TraceDocType, string> = {
  'drive-folder': 'Dossier Drive',
  'drive-file': 'Fichier Drive',
  doc: 'Google Docs',
  sheet: 'Google Sheets',
  slide: 'Google Slides',
  figma: 'Figma',
  miro: 'Miro',
  pdf: 'PDF',
  image: 'Image',
  other: 'Lien',
};

/** Normalise une saisie (ajoute https:// si absent). Renvoie null si l'URL est invalide. */
export function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u;
  } catch {
    return null;
  }
}

export function detectDocType(raw: string): TraceDocType {
  const u = normalizeUrl(raw);
  if (!u) return 'other';
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname.toLowerCase();

  if (host === 'docs.google.com') {
    if (path.startsWith('/document')) return 'doc';
    if (path.startsWith('/spreadsheets')) return 'sheet';
    if (path.startsWith('/presentation')) return 'slide';
    return 'drive-file';
  }
  if (host === 'drive.google.com') {
    if (path.includes('/folders/') || path.startsWith('/drive/')) return 'drive-folder';
    return 'drive-file';
  }
  if (host === 'figma.com' || host.endsWith('.figma.com')) return 'figma';
  if (host === 'miro.com' || host.endsWith('.miro.com')) return 'miro';
  if (/\.pdf$/.test(path)) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|svg|avif|heic)$/.test(path)) return 'image';
  return 'other';
}

export function detectFileType(name: string, mime: string): TraceDocType {
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|heic)$/i.test(name)) return 'image';
  return 'other';
}

export function domainOf(raw: string): string {
  const u = normalizeUrl(raw);
  return u ? u.hostname.replace(/^www\./, '') : '';
}

/** Titre par défaut = type + domaine (ex. « Google Docs · docs.google.com »). */
export function defaultDocName(raw: string, type: TraceDocType): string {
  const domain = domainOf(raw);
  const label = DOC_TYPE_LABELS[type];
  return domain ? `${label} · ${domain}` : label;
}

/** URL d'aperçu intégrable en iframe — uniquement Docs, Slides, Figma. */
export function getPreviewUrl(raw: string, type: TraceDocType): string | null {
  const u = normalizeUrl(raw);
  if (!u) return null;
  if (type === 'doc' || type === 'slide') {
    const m = /^(\/(?:document|presentation)\/d\/(?:e\/)?[^/]+)/.exec(u.pathname);
    if (!m) return null;
    return `https://docs.google.com${m[1]}/${type === 'slide' ? 'embed' : 'preview'}`;
  }
  if (type === 'figma') {
    return `https://www.figma.com/embed?embed_host=studioplanner&url=${encodeURIComponent(u.toString())}`;
  }
  return null;
}
