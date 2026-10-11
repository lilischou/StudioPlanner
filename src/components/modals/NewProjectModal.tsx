import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  X,
  Sparkles,
  PenLine,
  User,
  Users,
  AlertCircle,
} from 'lucide-react';
import { getTodayLocalDateStr, addDays } from '../../utils/localDate';
import { RISO_PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../../utils/theme';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWizard: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onOpenWizard,
}) => {
  const { createNewProject } = useProject();

  const [view, setView] = useState<'choice' | 'manual'>('choice');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(getTodayLocalDateStr());
  const [deadlineDate, setDeadlineDate] = useState(addDays(getTodayLocalDateStr(), 56));
  const [mode, setMode] = useState<'individuel' | 'groupe'>('individuel');
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView('choice');
      setName('');
      const today = getTodayLocalDateStr();
      setStartDate(today);
      setDeadlineDate(addDays(today, 56));
      setMode('individuel');
      setColor(DEFAULT_PROJECT_COLOR);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunchWizard = () => {
    onClose();
    onOpenWizard();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez saisir un nom pour le projet.');
      return;
    }
    if (deadlineDate && startDate && deadlineDate < startDate) {
      setError('La date de rendu final doit être égale ou postérieure à la date de début.');
      return;
    }

    createNewProject(name.trim(), mode, startDate, deadlineDate, undefined, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] max-w-xl w-full border-2 border-riso-ink shadow-riso max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-riso-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-riso-ink bg-riso-paper shrink-0">
          <h2 className="text-sm font-bold text-riso-ink font-heading">
            Nouveau projet
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] hover:bg-riso-p1-light transition-colors border border-transparent hover:border-riso-ink cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto text-[13px] bg-riso-paper">
          {view === 'choice' ? (
            <div className="space-y-4">
              <p className="text-xs text-riso-ink-secondary font-medium">
                Choisis comment tu souhaites démarrer ton projet :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Carte 1 : Pas à pas */}
                <button
                  type="button"
                  onClick={handleLaunchWizard}
                  className="p-5 text-left rounded-[16px] border-2 border-riso-ink bg-white hover:bg-riso-p1-light shadow-riso hover:translate-y-[-1px] transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-[8px] bg-riso-p1-light border-2 border-riso-ink flex items-center justify-center mb-3 group-hover:bg-white transition-colors">
                      <Sparkles className="w-5 h-5 text-riso-ink" />
                    </div>
                    <h3 className="font-bold text-sm text-riso-ink font-heading mb-1.5">
                      Pas à pas
                    </h3>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-riso-ink group-hover:underline">
                    <span>Lancer l'assistant</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Carte 2 : Remplir moi-même */}
                <button
                  type="button"
                  onClick={() => setView('manual')}
                  className="p-5 text-left rounded-[16px] border-2 border-riso-ink bg-white hover:bg-riso-p1-light shadow-riso hover:translate-y-[-1px] transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-[8px] bg-riso-p3-light border-2 border-riso-ink flex items-center justify-center mb-3 group-hover:bg-white transition-colors">
                      <PenLine className="w-5 h-5 text-riso-ink" />
                    </div>
                    <h3 className="font-bold text-sm text-riso-ink font-heading mb-1.5">
                      Remplir moi-même
                    </h3>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-riso-ink group-hover:underline">
                    <span>Remplir le formulaire</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setView('choice');
                  setError(null);
                }}
                className="text-xs text-riso-ink-secondary hover:text-riso-ink flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>←</span>
                <span>Retour au choix</span>
              </button>

              <form onSubmit={handleManualSubmit} className="space-y-4 pt-1">
                {/* Nom du projet */}
                <div>
                  <label className="block text-riso-ink font-bold text-xs uppercase tracking-wider mb-1">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="ex: Refonte identité visuelle & signalétique"
                    className="w-full px-3 py-2 bg-white border-2 border-riso-ink rounded-[8px] text-xs text-riso-ink font-medium focus:outline-none focus:ring-2 focus:ring-riso-p3"
                    autoFocus
                  />
                </div>

                {/* Couleur du projet */}
                <div>
                  <label className="block text-riso-ink font-bold text-xs uppercase tracking-wider mb-1.5">
                    Couleur du projet
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {RISO_PROJECT_COLORS.map((c) => {
                      const isSelected = color === c.hex;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'border-riso-ink shadow-riso-press scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                          aria-label={`Couleur ${c.name}`}
                        >
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-riso-ink font-bold text-xs uppercase tracking-wider mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-riso-ink rounded-[8px] text-xs font-mono text-riso-ink focus:outline-none focus:ring-2 focus:ring-riso-p3"
                    />
                  </div>

                  <div>
                    <label className="block text-riso-ink font-bold text-xs uppercase tracking-wider mb-1">
                      Date de rendu final
                    </label>
                    <input
                      type="date"
                      required
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-riso-ink rounded-[8px] text-xs font-mono text-riso-ink focus:outline-none focus:ring-2 focus:ring-riso-p3"
                    />
                  </div>
                </div>

                {/* Mode Solo / Groupe */}
                <div>
                  <label className="block text-riso-ink font-bold text-xs uppercase tracking-wider mb-1.5">
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('individuel')}
                      className={`p-3 rounded-[8px] border-2 text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        mode === 'individuel'
                          ? 'border-riso-ink bg-riso-p1-light shadow-riso-press font-bold text-riso-ink'
                          : 'border-riso-line bg-white text-riso-ink-secondary hover:border-riso-ink'
                      }`}
                    >
                      <User className="w-4 h-4 text-riso-ink" />
                      <div>
                        <div className="text-xs font-bold text-riso-ink">Solo</div>
                        <div className="text-[11px] text-riso-ink-secondary">Projet individuel</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('groupe')}
                      className={`p-3 rounded-[8px] border-2 text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        mode === 'groupe'
                          ? 'border-riso-ink bg-riso-p1-light shadow-riso-press font-bold text-riso-ink'
                          : 'border-riso-line bg-white text-riso-ink-secondary hover:border-riso-ink'
                      }`}
                    >
                      <Users className="w-4 h-4 text-riso-ink" />
                      <div>
                        <div className="text-xs font-bold text-riso-ink">Groupe</div>
                        <div className="text-[11px] text-riso-ink-secondary">Projet en équipe</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Note 3 phases */}
                <div className="p-3 bg-white rounded-[8px] border border-riso-line text-[11px] text-riso-ink-secondary leading-relaxed">
                  Le projet sera initialisé avec les 3 phases par défaut : <strong>Exploration</strong> (30 %), <strong>Idéation</strong> (35 %) et <strong>Finalisation</strong> (35 %).
                </div>

                {error && (
                  <div className="p-2.5 bg-riso-p4-light border border-riso-p4 rounded-[8px] text-xs text-riso-p4 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('choice');
                      setError(null);
                    }}
                    className="btn-riso-secondary text-xs py-2 px-4"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="btn-riso-primary text-xs py-2 px-5 disabled:opacity-40"
                  >
                    Créer le projet
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
