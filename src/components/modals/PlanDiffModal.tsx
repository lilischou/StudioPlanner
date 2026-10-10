import React from 'react';
import { PlanDiff } from '../../types/project';
import { formatFrenchDateLocal } from '../../utils/localDate';
import {
  X,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Plus,
} from 'lucide-react';

interface PlanDiffModalProps {
  isOpen: boolean;
  diff: PlanDiff | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PlanDiffModal: React.FC<PlanDiffModalProps> = ({
  isOpen,
  diff,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !diff) return null;

  const hasChanges =
    diff.phasesChanged.length > 0 ||
    diff.itemsMoved.length > 0 ||
    diff.sessionsAdded.length > 0 ||
    diff.sessionsRemoved.length > 0 ||
    diff.milestonesAdded.length > 0 ||
    diff.milestonesRemoved.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="riso-card w-full max-w-xl bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-label="Aperçu des changements de planification"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F0505A]" />
            <h2 className="text-base font-bold text-[#22408F] font-heading">
              Ce qui va changer dans le planning
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F] hover:bg-[#EBF1FF] transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Note de sécurité rassurante */}
          <div className="p-3.5 rounded-xl bg-[#EAF6EE] border-2 border-[#2E8B4A]/40 flex items-start gap-2.5 text-[#2E8B4A]">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-xs block">Préservation absolue de l'historique</span>
              <p className="text-[11px] leading-relaxed">
                Seuls les éléments à venir non verrouillés sont ajustés.{' '}
                <strong>{diff.preservedCount} élément(s)</strong> passés, réalisés ou personnalisés
                à la main sont sanctuarisés et ne bougeront pas.
              </p>
            </div>
          </div>

          {!hasChanges ? (
            <p className="text-[#5A6A94] italic text-center py-4">
              Aucun déplacement ni ajout requis. Le planning est déjà aligné.
            </p>
          ) : (
            <div className="space-y-4">
              {/* 1. Bornes de phases déplacées */}
              {diff.phasesChanged.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[#22408F] block uppercase tracking-wider text-[11px]">
                    Phases recalculées ({diff.phasesChanged.length})
                  </span>
                  <div className="space-y-1.5">
                    {diff.phasesChanged.map((ph) => (
                      <div
                        key={ph.id}
                        className="p-2.5 rounded-lg border border-[#22408F]/20 bg-[#FBFAF6] flex items-center justify-between"
                      >
                        <span className="font-bold text-[#22408F]">{ph.name}</span>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#5A6A94]">
                          <span>{formatFrenchDateLocal(ph.oldEndDate, false)}</span>
                          <ArrowRight className="w-3 h-3 text-[#22408F]" />
                          <span className="font-bold text-[#22408F]">
                            {formatFrenchDateLocal(ph.newEndDate, false)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Éléments déplacés */}
              {diff.itemsMoved.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[#22408F] block uppercase tracking-wider text-[11px]">
                    Séances et objectifs déplacés ({diff.itemsMoved.length})
                  </span>
                  <div className="space-y-1.5">
                    {diff.itemsMoved.map((mv) => (
                      <div
                        key={mv.id}
                        className="p-2.5 rounded-lg border border-[#22408F]/20 bg-white flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-[#22408F] block truncate">
                            {mv.title}
                          </span>
                          <span className="text-[10px] text-[#5A6A94]">
                            {mv.type === 'session' ? 'Séance de travail' : 'Objectif / Rendu'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                          <span className="text-[#5A6A94] line-through">
                            {formatFrenchDateLocal(mv.oldDate, false)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[#22408F]" />
                          <span className="font-bold text-[#2F6DBB]">
                            {formatFrenchDateLocal(mv.newDate, false)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Séances ajoutées */}
              {diff.sessionsAdded.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[#2E8B4A] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Nouvelles séances planifiées ({diff.sessionsAdded.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {diff.sessionsAdded.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg border border-[#2E8B4A]/30 bg-[#EAF6EE]/50 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-bold text-[#2E8B4A] truncate pr-2">
                          {s.objective}
                        </span>
                        <span className="font-mono text-[#5A6A94] shrink-0">
                          {formatFrenchDateLocal(s.date, false)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Séances supprimées */}
              {diff.sessionsRemoved.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[#F0505A] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                    Séances futures supprimées ({diff.sessionsRemoved.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {diff.sessionsRemoved.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 rounded-lg border border-[#F0505A]/30 bg-[#FDEEEF]/50 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-bold text-[#F0505A] truncate pr-2">
                          {s.objective}
                        </span>
                        <span className="font-mono text-[#5A6A94] shrink-0">
                          {formatFrenchDateLocal(s.date, false)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="btn-riso-secondary text-xs"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="btn-riso-primary text-xs"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Appliquer les changements</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
