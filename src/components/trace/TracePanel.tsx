import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Check, Camera } from 'lucide-react';
import { LogbookEntry, Phase, TraceDoc } from '../../types/project';
import { formatFrenchDate } from '../../utils/dateCalculations';
import { compressImageFile, resizeImageToMax } from '../../utils/imageCompression';
import { dataUrlToBlob, putFile } from '../../utils/traceStorage';
import {
  getDecided,
  getDone,
  getObserved,
  getResultDocs,
  getResultText,
  getTraceTitle,
  getWorkDocs,
} from '../../utils/trace';
import { PHASE_COLORS, getPhaseColor } from '../../utils/theme';
import { isAiEnabled, suggestFormulation, FormulationSuggestion } from '../../ai/gemini';
import { FormulationSuggestionsCard } from './FormulationSuggestionsCard';
import { TraceCover, useCoverSrc, DEFAULT_CROP } from './TraceCover';
import { CoverCropper } from './CoverCropper';
import { DocAdder, DocList } from './DocAdder';
import { FIELD_CLS, LABEL_CLS, TEXT_LINK_CLS } from './ui';

interface Props {
  entry: LogbookEntry;
  phases: Phase[];
  availableTags?: string[];
  onUpdate: (patch: Partial<LogbookEntry>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Fichiers devenus inutiles (supprimés seulement s'ils ne sont plus référencés). */
  onReleaseFiles: (refs: string[]) => void;
  /** Lien vers la session / tâche associée. */
  onOpenLinked?: () => void;
}

const SAVE_DELAY = 500;

export const TracePanel: React.FC<Props> = ({
  entry,
  phases,
  availableTags = [],
  onUpdate,
  onDelete,
  onClose,
  onReleaseFiles,
  onOpenLinked,
}) => {
  const phase = phases.find((p) => p.id === entry.phaseId);
  const colors = getPhaseColor(phase || entry.phaseId, phases);

  const [editing, setEditing] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<FormulationSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setSuggestion(null);
      setAiError(null);
    }
  }, [editing]);

  // Brouillon local pour les champs texte (sauvegarde automatique différée)
  const [draft, setDraft] = useState(() => ({
    title: entry.title && entry.title !== "Trace d'atelier" ? entry.title : '',
    done: getDone(entry),
    observed: getObserved(entry),
    decided: getDecided(entry),
    resultText: getResultText(entry),
  }));
  const pending = useRef<Partial<LogbookEntry> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const resultsRef = useRef(entry.results);
  resultsRef.current = entry.results;

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      onUpdateRef.current(pending.current);
      pending.current = null;
      setSaved(true);
    }
  };

  const queue = (patch: Partial<LogbookEntry>) => {
    pending.current = { ...(pending.current || {}), ...patch };
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  // Sauvegarde finale au démontage (fermeture du panneau)
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key: 'title' | 'done' | 'observed' | 'decided', value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    queue({ [key]: value } as Partial<LogbookEntry>);
  };
  const setResultText = (value: string) => {
    setDraft((d) => ({ ...d, resultText: value }));
    queue({ results: { text: value, docs: resultsRef.current?.docs ?? [] } });
  };

  // --- Documents (sauvegarde immédiate) ---
  const workDocs = getWorkDocs(entry);
  const resultDocs = getResultDocs(entry);

  const saveWorkDocs = (docs: TraceDoc[]) => onUpdate({ workDocs: docs });
  const saveResultDocs = (docs: TraceDoc[]) => {
    const text = pending.current?.results?.text ?? draft.resultText;
    flush(); // évite qu'une sauvegarde différée du texte n'écrase la liste de documents
    onUpdate({ results: { text, docs } });
  };

  const removeDoc = (list: TraceDoc[], id: string, save: (d: TraceDoc[]) => void) => {
    const doc = list.find((d) => d.id === id);
    save(list.filter((d) => d.id !== id));
    if (doc?.kind === 'file' && doc.fileRef) onReleaseFiles([doc.fileRef]);
  };
  const renameDoc = (list: TraceDoc[], id: string, name: string, save: (d: TraceDoc[]) => void) =>
    save(list.map((d) => (d.id === id ? { ...d, name } : d)));

  // --- Couverture ---
  const coverSrc = useCoverSrc(entry);

  const onPhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhotoBusy(true);
      const dataUrl = await compressImageFile(file, 1200, 900, 0.78);
      const ref = await putFile(dataUrlToBlob(dataUrl));
      const old = entry.cover?.imageRef;
      onUpdate({ cover: { imageRef: ref, crop: { ...DEFAULT_CROP } }, photoUrl: undefined });
      if (old) onReleaseFiles([old]);
    } catch (err) {
      console.error('Erreur photo', err);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removeCover = () => {
    const old = entry.cover?.imageRef;
    onUpdate({ cover: undefined, photoUrl: undefined });
    if (old) onReleaseFiles([old]);
  };

  const handleAiFormulate = async () => {
    if (!isAiEnabled() || aiLoading) return;
    const currentObserved = draft.observed || getObserved(entry);
    if (!currentObserved.trim() && !coverSrc) {
      setAiError('Renseigne au moins un début de constat ou une photo pour obtenir de l’aide.');
      setTimeout(() => setAiError(null), 4000);
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const resizedPhoto = coverSrc ? await resizeImageToMax(coverSrc, 768) : undefined;
      const res = await suggestFormulation({
        constat: currentObserved.trim(),
        photo: resizedPhoto,
        tagsExistants: availableTags || [],
      });

      if (res.data) {
        setSuggestion(res.data);
      } else {
        setAiError(res.error || 'Impossible de proposer une reformulation pour le moment.');
        setTimeout(() => setAiError(null), 5000);
      }
    } catch {
      setAiError('Erreur de connexion à Gemini.');
      setTimeout(() => setAiError(null), 5000);
    } finally {
      setAiLoading(false);
    }
  };

  const boxes: { key: 'done' | 'observed' | 'decided'; label: string; hint: string }[] = [
    { key: 'done', label: 'Ce que j’ai fait', hint: 'Qu’as-tu fait pendant cette session ?' },
    { key: 'observed', label: 'Ce que je constate', hint: 'Qu’as-tu remarqué, qu’est-ce qui bloque ?' },
    { key: 'decided', label: 'Ce que je décide', hint: 'Que vas-tu faire ensuite ?' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[#22408F]/25 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-[#FBFAF6] border-l-2 border-[#22408F] flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="Fiche de la trace"
      >
        {/* A. En-tête */}
        <header className="px-5 pt-4 pb-3 border-b border-[#DCE2EF] bg-white shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {editing ? (
                <select
                  value={entry.phaseId}
                  onChange={(e) => onUpdate({ phaseId: e.target.value })}
                  className="text-xs font-bold text-[#22408F] bg-white border-2 border-[#22408F] rounded-full px-2.5 py-0.5"
                  aria-label="Phase"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom || p.name || p.shortName}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22408F] border-2 border-[#22408F] rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: colors.bgLight }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.hex }} />
                  {phase?.nom || phase?.name || phase?.shortName || 'Phase'}
                </span>
              )}
              {editing ? (
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => e.target.value && onUpdate({ date: e.target.value })}
                  className="text-xs font-mono text-[#22408F] bg-white border-2 border-[#22408F] rounded-lg px-2 py-0.5"
                  aria-label="Date"
                />
              ) : (
                <span className="text-xs text-[#5A6A94] font-mono">
                  {formatFrenchDate(entry.date)}
                  {entry.time ? ` · ${entry.time}` : ''}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (editing) flush();
                setEditing((v) => !v);
              }}
              className="btn-riso-secondary text-xs px-3 py-1 shrink-0"
              aria-pressed={editing}
            >
              {editing ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Pencil className="w-3.5 h-3.5" />}
              <span>{editing ? 'Terminé' : 'Modifier'}</span>
            </button>
          </div>

          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Donne un titre à ta trace"
              className={`${FIELD_CLS} font-heading font-bold text-base`}
              aria-label="Titre de la trace"
            />
          ) : (
            <h2 className="font-heading font-bold text-lg text-[#22408F] leading-tight">
              {getTraceTitle(entry)}
            </h2>
          )}
          {editing && (
            <p className="text-[11px] text-[#5A6A94]">
              {saved ? 'Enregistré ✓' : 'Tes modifications s’enregistrent automatiquement.'}
            </p>
          )}
        </header>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* B. Couverture */}
          <section className="space-y-2" aria-label="Couverture">
            <div className="rounded-lg border-2 border-[#22408F] overflow-hidden">
              <TraceCover
                entry={entry}
                phaseHex={colors.hex}
                className="w-full aspect-[4/3]"
                dotSize={12}
                alt={getTraceTitle(entry)}
                placeholder={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      className="btn-riso-secondary text-xs"
                      disabled={photoBusy}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{photoBusy ? 'Envoi…' : 'Ajouter une photo'}</span>
                    </button>
                  </div>
                }
              />
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoPicked}
              aria-label="Choisir une photo"
            />
            {coverSrc && (
              <div className="flex items-center gap-2 text-[#5A6A94]" role="group" aria-label="Menu de la couverture">
                <button type="button" className={TEXT_LINK_CLS} onClick={() => photoInput.current?.click()} disabled={photoBusy}>
                  Remplacer
                </button>
                <span aria-hidden="true">·</span>
                <button type="button" className={TEXT_LINK_CLS} onClick={() => setCropping(true)}>
                  Recadrer
                </button>
                <span aria-hidden="true">·</span>
                <button type="button" className={TEXT_LINK_CLS} onClick={removeCover}>
                  Retirer
                </button>
              </div>
            )}
          </section>

          {/* C. Ma démarche */}
          <section className="space-y-3" aria-label="Ma démarche">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading font-bold text-sm text-[#22408F]">Ma démarche</h3>
              {editing && isAiEnabled() && (
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleAiFormulate}
                  className="btn-riso-secondary py-0.5 px-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{aiLoading ? 'Gemini réfléchit…' : '✦ Aide à formuler'}</span>
                </button>
              )}
            </div>

            {aiError && (
              <div className="p-2 bg-[#FFF0F0] border-2 border-[#F0505A] rounded-[8px] text-[11px] font-bold text-[#F0505A]">
                {aiError}
              </div>
            )}

            {editing && suggestion && (
              <FormulationSuggestionsCard
                suggestion={suggestion}
                onApplyTitle={(t) => setField('title', t)}
                onApplyObserved={(c) => setField('observed', c)}
                onApplyTags={(newTags) => {
                  const merged = Array.from(new Set([...(entry.tags || []), ...newTags]));
                  onUpdate({ tags: merged });
                }}
                onClose={() => setSuggestion(null)}
              />
            )}

            {boxes.map((b) => {
              const value = draft[b.key];
              return (
                <div
                  key={b.key}
                  className="riso-info-box p-3.5 space-y-1.5"
                  style={{ backgroundColor: colors.bgLight }}
                >
                  <span className={`${LABEL_CLS} block`}>{b.label}</span>
                  {editing ? (
                    <textarea
                      value={value}
                      onChange={(e) => setField(b.key, e.target.value)}
                      placeholder={b.hint}
                      rows={3}
                      className={`${FIELD_CLS} text-xs leading-relaxed resize-y`}
                      aria-label={b.label}
                    />
                  ) : value.trim() ? (
                    <p className="text-xs text-[#22408F] leading-relaxed whitespace-pre-wrap">{value}</p>
                  ) : (
                    <p className="text-xs text-[#8C9BBD] italic">Pas encore renseigné.</p>
                  )}
                </div>
              );
            })}
          </section>

          {/* D. Documents de travail */}
          <section className="space-y-2.5" aria-label="Documents de travail">
            <h3 className="font-heading font-bold text-sm text-[#22408F]">Documents de travail</h3>
            <DocList
              docs={workDocs}
              editable={editing}
              emptyText="Aucun document pour l’instant."
              onRename={(id, name) => renameDoc(workDocs, id, name, saveWorkDocs)}
              onRemove={(id) => removeDoc(workDocs, id, saveWorkDocs)}
            />
            <DocAdder onAdd={(doc) => saveWorkDocs([...workDocs, doc])} />
          </section>

          {/* E. Ce que j'ai produit */}
          <section className="space-y-2.5" aria-label="Ce que j'ai produit">
            <h3 className="font-heading font-bold text-sm text-[#22408F]">Ce que j’ai produit</h3>
            {editing ? (
              <textarea
                value={draft.resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Décris ce que tu as produit : une maquette, un schéma, un texte…"
                rows={3}
                className={`${FIELD_CLS} text-xs leading-relaxed resize-y`}
                aria-label="Ce que j’ai produit"
              />
            ) : draft.resultText.trim() ? (
              <p className="text-xs text-[#22408F] leading-relaxed whitespace-pre-wrap">{draft.resultText}</p>
            ) : null}
            <DocList
              docs={resultDocs}
              editable={editing}
              emptyText={draft.resultText.trim() || editing ? 'Aucun document produit pour l’instant.' : 'Pas encore de résultat.'}
              onRename={(id, name) => renameDoc(resultDocs, id, name, saveResultDocs)}
              onRemove={(id) => removeDoc(resultDocs, id, saveResultDocs)}
            />
            <DocAdder onAdd={(doc) => saveResultDocs([...resultDocs, doc])} />
          </section>

          {/* Étiquettes & lien avec session / tâche (conservés) */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {entry.tags.map((t) => (
                <span key={t} className="text-xs text-[#5A6A94] font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}
          {(entry.sessionId || entry.taskId) && onOpenLinked && (
            <div className="riso-info-box bg-white p-3 flex items-center justify-between text-xs">
              <span className="text-[#5A6A94]">
                {entry.sessionId ? 'Liée à une session de travail' : 'Liée à une tâche'}
              </span>
              <button type="button" onClick={onOpenLinked} className="riso-text-link">
                Voir →
              </button>
            </div>
          )}
        </div>

        {/* F. Pied */}
        <footer className="px-5 py-3.5 bg-white border-t border-[#DCE2EF] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Supprimer cette trace du carnet de bord ?')) onDelete();
            }}
            className="text-xs text-[#5A6A94] underline underline-offset-2 hover:text-[#F0505A] bg-transparent border-none p-1"
          >
            Supprimer
          </button>
          <button type="button" onClick={onClose} className="btn-riso-secondary text-xs">
            Fermer
          </button>
        </footer>
      </aside>

      {cropping && coverSrc && (
        <CoverCropper
          src={coverSrc}
          initial={entry.cover?.crop ?? DEFAULT_CROP}
          onCancel={() => setCropping(false)}
          onSave={(crop) => {
            onUpdate({ cover: { imageRef: entry.cover?.imageRef ?? '', crop } });
            setCropping(false);
          }}
        />
      )}
    </div>
  );
};
