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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full border-2 border-[#22408F] shadow-[0_4px_0_#22408F] max-h-[90vh] flex flex-col overflow-hidden text-[#22408F]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EBF1FF] text-[#22408F] rounded-xl border-2 border-[#22408F]">
              <FolderPlus className="w-5 h-5 text-[#22408F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#22408F] font-heading lowercase">
                importer des projets
              </h2>
              <p className="text-[12px] text-[#5A6A94]">
                {rawProjects.length} projet{rawProjects.length > 1 ? 's' : ''} détecté{rawProjects.length > 1 ? 's' : ''} dans le fichier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors border border-transparent hover:border-[#22408F] cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-6 py-3 bg-[#EBF1FF] border-b-2 border-[#22408F]/20 text-[12px] text-[#22408F] flex items-center justify-between">
          <span>
            Chaque projet coché sera créé comme un <strong>nouveau projet</strong>. Tes projets actuels resteront inchangés.
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="font-bold underline text-[11px] text-[#2F6DBB] hover:text-[#22408F] cursor-pointer"
            >
              Tout cocher
            </button>
            <span className="text-[#5A6A94]">·</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="font-bold underline text-[11px] text-[#5A6A94] hover:text-[#22408F] cursor-pointer"
            >
              Tout décocher
            </button>
          </div>
        </div>

        {/* Project cards list */}
        <div className="p-6 space-y-3 flex-1 overflow-y-auto text-[13px] bg-[#FBFAF6]">
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
                className={`p-3.5 bg-white border-2 border-[#22408F] rounded-xl transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                  isChecked
                    ? 'shadow-[0_4px_0_#22408F]'
                    : 'opacity-60 shadow-[0_2px_0_#22408F] bg-[#FBFAF6]'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-[#22408F]">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-[#2F6DBB]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#5A6A94]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-[#22408F] text-sm">
                      {nom}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1FF] text-[#22408F] border border-[#22408F]/20">
                      modèle : {modelLabel}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D1E5D7] text-[#246C3A] border border-[#2E8B4A]/30">
                      {modeLabel}
                    </span>
                  </div>

                  {brief && (
                    <p className="text-xs text-[#5A6A94] line-clamp-2 mb-2 font-normal">
                      {brief}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A6A94] font-medium pt-0.5">
                    {(proj.dateDebut || proj.dateRendu) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#22408F]" />
                        <span>
                          {proj.dateDebut ? formatFrenchDate(proj.dateDebut, false) : 'Début libre'}
                          {' → '}
                          {proj.dateRendu ? formatFrenchDate(proj.dateRendu, false) : 'Échéance libre'}
                        </span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-bold text-[#22408F]">
                      <Flag className="w-3 h-3 text-[#2E8B4A]" />
                      <span>{jalonsCount} jalon{jalonsCount > 1 ? 's' : ''}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 font-bold text-[#22408F]">
                      <ListTodo className="w-3 h-3 text-[#2F6DBB]" />
                      <span>{tachesCount} tâche{tachesCount > 1 ? 's' : ''}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FBFAF6] border-t-2 border-[#22408F] flex items-center justify-between gap-3 shrink-0">
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
