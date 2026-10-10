import React from 'react';
import { X, Info } from 'lucide-react';

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-2xl w-full border-2 border-[#22408F] shadow-[0_4px_0_#22408F] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#22408F]">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#22408F]" />
            <h2 className="text-base font-bold text-[#22408F] font-heading">
              Aide
            </h2>
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

        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-[13px] text-[#22408F] leading-relaxed bg-[#FBFAF6]">
          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Ton projet en 3 phases
            </h3>
            <p className="text-[#5A6A94]">
              Exploration, Idéation, Finalisation. Tu peux les renommer, en ajouter ou en retirer dans Vue détaillée › Phases. Chaque phase a sa couleur, ses tâches et ses livrables.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Aujourd'hui
            </h3>
            <p className="text-[#5A6A94]">
              Ce que tu as à faire maintenant, les jours avant ton prochain rendu et tes sessions de la semaine.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Parcours
            </h3>
            <p className="text-[#5A6A94]">
              Tes phases dans l'ordre. Clique sur une phase pour voir son objectif, son livrable attendu et ses tâches. Le crayon permet de les modifier.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Sessions
            </h3>
            <p className="text-[#5A6A94]">
              Ton agenda de travail. « Nouvelle session » : choisis le type (Solo, Groupe, Tuteur), la date, la durée et la phase.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Journal
            </h3>
            <p className="text-[#5A6A94]">
              Tes traces d'atelier : ce que tu as fait, ce que tu constates, ce que tu décides. Ajoute photos, liens et fichiers. « Exporter » crée une version imprimable.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Vue détaillée
            </h3>
            <p className="text-[#5A6A94]">
              Synthèse, Planning, Sessions, Tâches, Livrables, Phases, Réglages : tout le projet en tableaux, modifiables au clic.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#22408F] font-heading mb-1.5">
              Sauvegarde
            </h3>
            <p className="text-[#5A6A94]">
              Tes données restent dans ce navigateur. Fais une sauvegarde régulière : Projets › Exporter le JSON.
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#FBFAF6] border-t-2 border-[#22408F] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-riso-secondary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
