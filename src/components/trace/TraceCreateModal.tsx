import React, { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronRight, X, Check } from 'lucide-react';
import { LogbookEntry, Phase, TraceDoc } from '../../types/project';
import { compressImageFile, resizeImageToMax } from '../../utils/imageCompression';
import { dataUrlToBlob, putFile } from '../../utils/traceStorage';
import { PHASE_COLORS, getPhaseColor } from '../../utils/theme';
import { isAiEnabled, suggestFormulation, FormulationSuggestion } from '../../ai/gemini';
import { FormulationSuggestionsCard } from './FormulationSuggestionsCard';
import { DocAdder, DocList } from './DocAdder';
import { FIELD_CLS, LABEL_CLS } from './ui';

export type NewTrace = Omit<LogbookEntry, 'id'>;

interface Props {
  phases: Phase[];
  defaultPhaseId: string;
  defaultDate: string;
  author: string;
  availableTags: string[];
  /** Pré-remplissage depuis une session ou le mode focus. */
  draft?: Partial<LogbookEntry> | null;
  onSave: (trace: NewTrace) => void;
  onCancel: () => void;
  onReleaseFiles: (refs: string[]) => void;
}

const Fold: React.FC<{
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, count, open, onToggle, children }) => (
  <div className="border-2 border-[#22408F]/30 rounded-lg bg-white">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-[#22408F]">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
        {!!count && (
          <span className="text-[11px] font-mono text-[#5A6A94] bg-[#EBF1FF] rounded-full px-1.5">{count}</span>
        )}
      </span>
    </button>
    {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
  </div>
);

/** Création rapide d'une trace : UN seul écran (photo, titre, constat) + sections repliées. */
export const TraceCreateModal: React.FC<Props> = ({
  phases,
  defaultPhaseId,
  defaultDate,
  author,
  availableTags,
  draft,
  onSave,
  onCancel,
  onReleaseFiles,
}) => {
  const [photo, setPhoto] = useState<string>('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [title, setTitle] = useState(draft?.title ?? '');
  const [observed, setObserved] = useState(draft?.observed ?? draft?.whatWeNoticed ?? '');
  const [done, setDone] = useState(draft?.done ?? draft?.whatWeDid ?? '');
  const [decided, setDecided] = useState(draft?.decided ?? draft?.whatWeDecided ?? '');
  const [workDocs, setWorkDocs] = useState<TraceDoc[]>([]);
  const [resultText, setResultText] = useState('');
  const [resultDocs, setResultDocs] = useState<TraceDoc[]>([]);
  const [phaseId, setPhaseId] = useState(draft?.phaseId ?? defaultPhaseId);
  const [date, setDate] = useState(draft?.date ?? defaultDate);
  const [tags, setTags] = useState<string[]>(draft?.tags ?? []);
  const [saving, setSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<FormulationSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [openDone, setOpenDone] = useState(!!(done || decided));
  const [openWork, setOpenWork] = useState(false);
  const [openResult, setOpenResult] = useState(false);

  const photoInput = useRef<HTMLInputElement>(null);

  // Fichiers ajoutés pendant la création : libérés si on annule (ou si l'écran est fermé sans enregistrer).
  const saved = useRef(false);
  const refsRef = useRef<string[]>([]);
  refsRef.current = [...workDocs, ...resultDocs]
    .filter((d) => d.kind === 'file' && d.fileRef)
    .map((d) => d.fileRef as string);
  const releaseRef = useRef(onReleaseFiles);
  releaseRef.current = onReleaseFiles;
  useEffect(
    () => () => {
      if (!saved.current && refsRef.current.length) releaseRef.current(refsRef.current);
    },
    []
  );

  const onPhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhotoBusy(true);
      setPhoto(await compressImageFile(file, 1200, 900, 0.78));
    } catch (err) {
      console.error('Erreur compression image:', err);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleAiFormulate = async () => {
    if (!isAiEnabled() || aiLoading) return;
    if (!observed.trim() && !photo) {
      setAiError('Renseigne au moins un début de constat ou une photo pour obtenir de l’aide.');
      setTimeout(() => setAiError(null), 4000);
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const resizedPhoto = photo ? await resizeImageToMax(photo, 768) : undefined;
      const res = await suggestFormulation({
        constat: observed.trim(),
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

  const canSave = observed.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let cover: LogbookEntry['cover'];
      if (photo) {
        const ref = await putFile(dataUrlToBlob(photo));
        cover = { imageRef: ref, crop: { x: 50, y: 50, zoom: 1 } };
      }
      const now = new Date();
      saved.current = true;
      onSave({
        date,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        title: title.trim(),
        author,
        phaseId,
        done: done.trim(),
        observed: observed.trim(),
        decided: decided.trim(),
        whatWeDid: done.trim(),
        whatWeNoticed: observed.trim(),
        whatWeDecided: decided.trim(),
        cover,
        workDocs,
        results: { text: resultText.trim(), docs: resultDocs },
        tags,
        sessionId: draft?.sessionId,
        taskId: draft?.taskId,
      });
    } catch (err) {
      console.error('Erreur enregistrement trace', err);
      saved.current = false;
      setSaving(false);
    }
  };

  const phaseHex = getPhaseColor(phaseId, phases).hex;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/30 flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div
        className="riso-card w-full max-w-lg my-4 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-label="Nouvelle trace"
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#DCE2EF] shrink-0">
          <h2 className="font-heading font-bold text-base text-[#22408F]">Nouvelle trace</h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F] hover:bg-[#EBF1FF]"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
          {/* Photo (optionnelle) */}
          <div>
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={photoBusy}
              className="relative w-full aspect-[4/3] rounded-lg border-2 border-dashed border-[#22408F] overflow-hidden flex items-center justify-center text-[#22408F] bg-[#EBF1FF]"
              style={
                photo
                  ? undefined
                  : {
                      backgroundImage: `radial-gradient(${phaseHex} 1.5px, transparent 1.5px)`,
                      backgroundSize: '12px 12px',
                    }
              }
              aria-label={photo ? 'Changer la photo' : 'Ajouter une photo'}
            >
              {photo ? (
                <img src={photo} alt="Aperçu de la photo" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span className="btn-riso-secondary text-xs pointer-events-none">
                  <Camera className="w-3.5 h-3.5" />
                  {photoBusy ? 'Envoi…' : 'Ajouter une photo (facultatif)'}
                </span>
              )}
            </button>
            <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPhotoPicked} />
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto('')}
                className="mt-1.5 text-xs font-semibold text-[#22408F] underline underline-offset-2"
              >
                Retirer la photo
              </button>
            )}
          </div>

          {/* Titre */}
          <label className="block space-y-1">
            <span className={LABEL_CLS}>Titre</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. : Variation 3, copier sans original"
              className={FIELD_CLS}
            />
          </label>

          {/* Constat (seul champ requis) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="trace-create-observed" className={LABEL_CLS}>
                Ce que je constate <span className="text-[#F0505A]" aria-hidden="true">*</span>
              </label>
              {isAiEnabled() && (
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

            {suggestion && (
              <FormulationSuggestionsCard
                suggestion={suggestion}
                onApplyTitle={(t) => setTitle(t)}
                onApplyObserved={(c) => setObserved(c)}
                onApplyTags={(newTags) => {
                  setTags((prev) => Array.from(new Set([...prev, ...newTags])));
                  setOpenDone(true);
                }}
                onClose={() => setSuggestion(null)}
              />
            )}

            <textarea
              id="trace-create-observed"
              value={observed}
              onChange={(e) => setObserved(e.target.value)}
              rows={3}
              placeholder="Qu’as-tu remarqué ? Qu’est-ce qui marche, qu’est-ce qui bloque ?"
              className={`${FIELD_CLS} resize-y`}
              required
              autoFocus
            />
          </div>

          {/* Phase + date pré-remplies */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={LABEL_CLS}>Phase</span>
              <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={FIELD_CLS}>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom || p.name || p.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={LABEL_CLS}>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className={FIELD_CLS}
              />
            </label>
          </div>

          {/* Sections repliées */}
          <div className="space-y-2.5">
            <Fold title="Fait / Décision" open={openDone} onToggle={() => setOpenDone((v) => !v)}>
              <label className="block space-y-1">
                <span className={LABEL_CLS}>Ce que j’ai fait</span>
                <textarea
                  value={done}
                  onChange={(e) => setDone(e.target.value)}
                  rows={2}
                  className={`${FIELD_CLS} resize-y`}
                  placeholder="Qu’as-tu fait pendant cette session ?"
                />
              </label>
              <label className="block space-y-1">
                <span className={LABEL_CLS}>Ce que je décide</span>
                <textarea
                  value={decided}
                  onChange={(e) => setDecided(e.target.value)}
                  rows={2}
                  className={`${FIELD_CLS} resize-y`}
                  placeholder="Que vas-tu faire ensuite ?"
                />
              </label>
              {availableTags.length > 0 && (
                <div className="space-y-1">
                  <span className={LABEL_CLS}>Opérations (facultatif)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((t) => {
                      const on = tags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setTags((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border-2 ${
                            on
                              ? 'bg-[#EBF1FF] text-[#22408F] border-[#22408F]'
                              : 'bg-white text-[#5A6A94] border-[#22408F]/30 hover:border-[#22408F]'
                          }`}
                        >
                          {on ? '✓ ' : ''}#{t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Fold>

            <Fold
              title="Documents de travail"
              count={workDocs.length}
              open={openWork}
              onToggle={() => setOpenWork((v) => !v)}
            >
              <DocList
                docs={workDocs}
                editable
                emptyText="Aucun document pour l’instant."
                onRename={(id, name) => setWorkDocs((l) => l.map((d) => (d.id === id ? { ...d, name } : d)))}
                onRemove={(id) => {
                  const doc = workDocs.find((d) => d.id === id);
                  setWorkDocs((l) => l.filter((d) => d.id !== id));
                  if (doc?.fileRef) onReleaseFiles([doc.fileRef]);
                }}
              />
              <DocAdder onAdd={(d) => setWorkDocs((l) => [...l, d])} />
            </Fold>

            <Fold
              title="Ce que j’ai produit"
              count={resultDocs.length + (resultText.trim() ? 1 : 0)}
              open={openResult}
              onToggle={() => setOpenResult((v) => !v)}
            >
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                rows={2}
                className={`${FIELD_CLS} resize-y`}
                placeholder="Décris ce que tu as produit : une maquette, un schéma, un texte…"
                aria-label="Ce que j’ai produit"
              />
              <DocList
                docs={resultDocs}
                editable
                emptyText="Aucun document produit pour l’instant."
                onRename={(id, name) => setResultDocs((l) => l.map((d) => (d.id === id ? { ...d, name } : d)))}
                onRemove={(id) => {
                  const doc = resultDocs.find((d) => d.id === id);
                  setResultDocs((l) => l.filter((d) => d.id !== id));
                  if (doc?.fileRef) onReleaseFiles([doc.fileRef]);
                }}
              />
              <DocAdder onAdd={(d) => setResultDocs((l) => [...l, d])} />
            </Fold>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#DCE2EF] flex items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={onCancel} className="riso-text-link">
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave} className="btn-riso-primary text-sm">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Enregistrer la trace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
