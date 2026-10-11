import React, { useState, useEffect } from 'react';
import { X, FolderPlus, CheckSquare, Square, Calendar, ListTodo, Flag } from 'lucide-react';
import { RawProjectInput, normalizeTemplateId } from '../../utils/projectImporter';
import { formatFrenchDate } from '../../utils/dateCalculations';

interface ImportProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawProjects: RawProjectInput[];
  onConfirmImport: (selected: RawProjectInput[]) => void;
}

export const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({
  isOpen,
  onClose,
  rawProjects,
  onConfirmImport,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Tous les projets sont cochés par défaut à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedIndices(new Set(rawProjects.map((_, idx) => idx)));
    }
  }, [isOpen, rawProjects]);

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || rawProjects.length === 0) return null;

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(rawProjects.map((_, idx) => idx)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleConfirm = () => {
    const selected = rawProjects.filter((_, idx) => selectedIndices.has(idx));
    if (selected.length === 0) return;
    onConfirmImport(selected);
    onClose();
  };

  const checkedCount = selectedIndices.size;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importer des projets"
      className="fixed inset-0 z-50 overflow-y-auto bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-[16px] max-w-2xl w-full border-2 border-riso-ink shadow-riso max-h-[90vh] flex flex-col overflow-hidden text-riso-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-riso-ink bg-riso-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-riso-p1-light text-riso-ink rounded-[16px] border-2 border-riso-ink">
              <FolderPlus className="w-5 h-5 text-riso-ink" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-riso-ink font-heading lowercase">
                importer des projets
              </h2>
              <p className="text-[12px] text-riso-ink-secondary">
                {rawProjects.length} projet{rawProjects.length > 1 ? 's' : ''} détecté{rawProjects.length > 1 ? 's' : ''} dans le fichier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] hover:bg-riso-p1-light transition-colors border border-transparent hover:border-riso-ink cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-6 py-3 bg-riso-p1-light border-b-2 border-riso-line text-[12px] text-riso-ink flex items-center justify-between">
          <span>
            Chaque projet coché sera créé comme un <strong>nouveau projet</strong>. Tes projets actuels resteront inchangés.
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="font-bold underline text-[11px] text-riso-p1 hover:text-riso-ink cursor-pointer"
            >
              Tout cocher
            </button>
            <span className="text-riso-ink-secondary">·</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="font-bold underline text-[11px] text-riso-ink-secondary hover:text-riso-ink cursor-pointer"
            >
              Tout décocher
            </button>
          </div>
        </div>

        {/* Project cards list */}
        <div className="p-6 space-y-3 flex-1 overflow-y-auto text-[13px] bg-riso-paper">
          {rawProjects.map((proj, idx) => {
            const isChecked = selectedIndices.has(idx);
            const nom = (proj.nom || proj.name || `Projet ${idx + 1}`).trim();
            const brief = (proj.brief || proj.description || '').trim();
            const rawModel = proj.modele || proj.modèle || proj.template || proj.templateId;
            const modelKey = normalizeTemplateId(rawModel);
            const modelLabel =
              modelKey === 'vierge'
                ? 'Vierge'
                : modelKey === 'semestre'
                ? 'Semestre'
                : modelKey === 'workshop'
                ? 'Workshop'
                : modelKey === 'memoire'
                ? 'Mémoire'
                : 'Concours';
            const modeLabel = (proj.mode || 'individuel').toLowerCase() === 'groupe' ? 'Groupe' : 'Solo';
            const jalonsCount = (proj.jalons || proj.milestones || []).length;
            const tachesCount = (proj.taches || proj.tasks || []).length;

            return (
              <div
                key={idx}
                onClick={() => toggleIndex(idx)}
                className={`p-3.5 bg-white border-2 border-riso-ink rounded-[16px] transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                  isChecked
                    ? 'shadow-riso'
                    : 'opacity-60 shadow-riso-press bg-riso-paper'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-riso-ink">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-riso-p1" />
                  ) : (
                    <Square className="w-5 h-5 text-riso-ink-secondary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-riso-ink text-sm">
                      {nom}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-riso-p1-light text-riso-ink border border-riso-line">
                      modèle : {modelLabel}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-riso-p2-tint text-riso-p2-text border border-riso-p2/30">
                      {modeLabel}
                    </span>
                  </div>

                  {brief && (
                    <p className="text-xs text-riso-ink-secondary line-clamp-2 mb-2 font-normal">
                      {brief}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-riso-ink-secondary font-medium pt-0.5">
                    {(proj.dateDebut || proj.dateRendu) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-riso-ink" />
                        <span>
                          {proj.dateDebut ? formatFrenchDate(proj.dateDebut, false) : 'Début libre'}
                          {' → '}
                          {proj.dateRendu ? formatFrenchDate(proj.dateRendu, false) : 'Échéance libre'}
                        </span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-bold text-riso-ink">
                      <Flag className="w-3 h-3 text-riso-p2" />
                      <span>{jalonsCount} jalon{jalonsCount > 1 ? 's' : ''}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 font-bold text-riso-ink">
                      <ListTodo className="w-3 h-3 text-riso-p1" />
                      <span>{tachesCount} tâche{tachesCount > 1 ? 's' : ''}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-riso-paper border-t-2 border-riso-ink flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-riso-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={checkedCount === 0}
            className="btn-riso-primary text-xs py-2 px-5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Créer {checkedCount} nouveau{checkedCount > 1 ? 'x' : ''} projet{checkedCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
