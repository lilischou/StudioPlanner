import { LogbookEntry, TraceDoc } from '../types/project';

/** Lecture des 3 champs : nouveaux champs d'abord, sinon anciens champs (traces existantes). */
export const getDone = (e: LogbookEntry) => e.done ?? e.whatWeDid ?? '';
export const getObserved = (e: LogbookEntry) => e.observed ?? e.whatWeNoticed ?? '';
export const getDecided = (e: LogbookEntry) => e.decided ?? e.whatWeDecided ?? '';
export const getWorkDocs = (e: LogbookEntry): TraceDoc[] => e.workDocs ?? [];
export const getResultDocs = (e: LogbookEntry): TraceDoc[] => e.results?.docs ?? [];
export const getResultText = (e: LogbookEntry) => e.results?.text ?? '';

/** Titre affiché : trace.title (hors titre générique historique), sinon début du constat. */
export function getTraceTitle(e: LogbookEntry): string {
  const t = e.title?.trim();
  if (t && t !== "Trace d'atelier") return t;
  const fallback = (getObserved(e) || getDone(e) || '').trim();
  if (!fallback) return 'Trace sans titre';
  const words = fallback.split(/\s+/);
  const short = words.slice(0, 8).join(' ');
  return words.length > 8 ? `${short}…` : short;
}

export function getDocCount(e: LogbookEntry): number {
  return getWorkDocs(e).length + getResultDocs(e).length;
}

export function hasResult(e: LogbookEntry): boolean {
  return getResultText(e).trim().length > 0 || getResultDocs(e).length > 0;
}

/**
 * Migration douce d'une trace : ne supprime ni ne remplace rien.
 * Complète seulement les champs absents (done/observed/decided recopiés depuis les anciens champs,
 * listes de documents et résultats vides). photoUrl et cover ne sont pas touchés.
 */
export function normalizeTrace(e: LogbookEntry): LogbookEntry {
  return {
    ...e,
    done: e.done ?? e.whatWeDid ?? '',
    observed: e.observed ?? e.whatWeNoticed ?? '',
    decided: e.decided ?? e.whatWeDecided ?? '',
    workDocs: Array.isArray(e.workDocs) ? e.workDocs : [],
    results: {
      text: e.results?.text ?? '',
      docs: Array.isArray(e.results?.docs) ? e.results!.docs : [],
    },
  };
}

/** Mise à jour partielle qui garde les anciens champs synchronisés avec les nouveaux. */
export function withLegacyMirror(patch: Partial<LogbookEntry>): Partial<LogbookEntry> {
  const out = { ...patch };
  if (patch.done !== undefined) out.whatWeDid = patch.done;
  if (patch.observed !== undefined) out.whatWeNoticed = patch.observed;
  if (patch.decided !== undefined) out.whatWeDecided = patch.decided;
  return out;
}

/** Références IndexedDB utilisées par une trace. */
export function getFileRefs(e: LogbookEntry): string[] {
  const refs: string[] = [];
  if (e.cover?.imageRef) refs.push(e.cover.imageRef);
  [...getWorkDocs(e), ...getResultDocs(e)].forEach((d) => {
    if (d.kind === 'file' && d.fileRef) refs.push(d.fileRef);
  });
  return refs;
}
