import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Phase } from '../../types/project';
import {
  Calendar,
  AlertCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import { formatFrenchDate } from '../../utils/dateCalculations';
import {
  RISO_PHASE_PALETTE,
  PhaseColorKey,
  getPhaseColor,
} from '../../utils/theme';

export const RoadmapSection: React.FC = () => {
  const {
    activeProject,
    updatePhase,
    addPhase,
    deletePhase,
    updatePhaseFixedEndDate,
  } = useProject();
  const { phases, settings } = activeProject;

  const [expandedPhaseId, setExpandedPhaseId] = useState<string>(phases[0]?.id || 'p1');
  const [deleteError, setDeleteError] = useState<{ phaseId: string; message: string } | null>(null);

  const handleFixedDateToggle = (phase: Phase) => {
    if (phase.fixedEndDate) {
      updatePhaseFixedEndDate(phase.id, undefined);
    } else {
      const start = phase.debut || phase.calculatedStartDate || settings.startDate;
      const defaultEnd = phase.calculatedEndDate || phase.fin || settings.deadlineDate;
      const validEnd = defaultEnd < start ? start : defaultEnd;
      updatePhaseFixedEndDate(phase.id, validEnd);
    }
  };

  const handleDelete = (phaseId: string) => {
    const res = deletePhase(phaseId);
    if (!res.success && res.reason) {
      setDeleteError({ phaseId, message: res.reason });
      setTimeout(() => setDeleteError(null), 5000);
    } else {
      setDeleteError(null);
      if (expandedPhaseId === phaseId && phases.length > 1) {
        const next = phases.find((p) => p.id !== phaseId);
        if (next) setExpandedPhaseId(next.id);
      }
    }
  };

  const paletteEntries = Object.values(RISO_PHASE_PALETTE);

  return (
    <div className="space-y-6">
      {/* Visual Timeline Bar */}
      <div className="bg-white border-2 border-riso-ink rounded-[16px] p-5 shadow-riso space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-riso-ink uppercase tracking-wider font-heading">
            Frise temporelle des phases
          </span>
          <span className="text-riso-ink font-mono text-[11px] font-medium">
            {formatFrenchDate(settings.startDate)} → {formatFrenchDate(settings.deadlineDate)}
          </span>
        </div>

        {/* Proportional Segment Bar (Couleurs configurées des phases, 100% largeur) */}
        <div className="w-full flex h-10 rounded-[8px] overflow-hidden border-2 border-riso-ink font-mono text-[11px]">
          {(() => {
            const totalDurationDays = phases.reduce((acc, p) => acc + (p.durationDays || 0), 0);
            const allPhasesHaveDates =
              phases.length > 0 &&
              phases.every((p) => typeof p.durationDays === 'number' && p.durationDays > 0);

            return phases.map((phase, idx) => {
              const pColor = getPhaseColor(phase, phases);
              const isYellow = pColor.key === 'yellow';
              const flexShare =
                allPhasesHaveDates && totalDurationDays > 0
                  ? phase.durationDays || 1
                  : 1;

              return (
                <div
                  key={phase.id}
                  onClick={() => setExpandedPhaseId(phase.id)}
                  style={{
                    flex: `${flexShare} 1 0%`,
                    backgroundColor: pColor.hex,
                    minWidth: 0,
                  }}
                  className={`flex flex-col items-center justify-center cursor-pointer transition-all border-r-2 border-riso-ink last:border-r-0 truncate px-1.5 hover:brightness-95 ${
                    isYellow ? 'text-riso-ink' : 'text-white'
                  }`}
                  title={`${idx + 1}. ${phase.nom || phase.name} (${phase.durationDays || '—'}j)`}
                >
                  <span className="font-bold truncate text-[11px] drop-shadow-none">
                    {phase.nom || phase.shortName || phase.name}
                  </span>
                  <span className="text-[10px] opacity-90 truncate">
                    {phase.durationDays ? `${phase.durationDays}j` : ''}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Header with Add Phase Button */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-riso-ink uppercase tracking-wider font-heading">
          Configuration des phases ({phases.length})
        </h2>
        <button
          type="button"
          onClick={() => addPhase()}
          className="btn-riso-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une phase</span>
        </button>
      </div>

      {/* Detailed Cards */}
      <div className="space-y-3">
        {phases.map((phase, idx) => {
          const isExpanded = expandedPhaseId === phase.id;
          const pColor = getPhaseColor(phase, phases);
          const isYellow = pColor.key === 'yellow';
          const hasError = deleteError?.phaseId === phase.id;
          const phaseStart = phase.debut || phase.calculatedStartDate || '';
          const hasInvalidFixedDate = Boolean(
            phase.fixedEndDate && phaseStart && phase.fixedEndDate < phaseStart
          );

          return (
            <div
              key={phase.id}
              className={`bg-white border-2 rounded-[16px] overflow-hidden transition-all ${
                hasInvalidFixedDate
                  ? 'border-dashed !border-riso-p4'
                  : 'border-riso-ink'
              } ${
                isExpanded ? 'shadow-riso' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Header row */}
              <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-xs shrink-0 border-2 border-riso-ink shadow-riso-press ${
                      isYellow ? 'text-riso-ink' : 'text-white'
                    }`}
                    style={{ backgroundColor: pColor.hex }}
                  >
                    P{idx + 1}
                  </span>

                  {/* Nom modifiable */}
                  <div className="flex-1 min-w-[160px] max-w-sm">
                    <input
                      type="text"
                      value={phase.nom || phase.name || ''}
                      onChange={(e) => updatePhase(phase.id, { nom: e.target.value })}
                      placeholder="Nom de la phase"
                      className="w-full font-bold text-sm text-riso-ink font-heading bg-riso-paper border-2 border-riso-line hover:border-riso-ink focus:border-riso-ink rounded-[8px] px-2.5 py-1 focus:ring-0 transition-colors"
                      title="Renommer la phase"
                    />
                  </div>

                  {/* Sélecteur des 6 encres Riso */}
                  <div className="flex items-center gap-1.5 p-1 bg-riso-paper border-2 border-riso-line rounded-[8px]">
                    {paletteEntries.map((entry) => {
                      const isSelected = pColor.key === entry.key;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => updatePhase(phase.id, { couleur: entry.key })}
                          style={{ backgroundColor: entry.hex }}
                          title={`Couleur : ${entry.label}`}
                          className={`w-5 h-5 rounded-full border-2 border-riso-ink transition-transform flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'scale-110 shadow-riso-press ring-2 ring-riso-ink/30'
                              : 'opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          {isSelected && (
                            <Check
                              className={`w-3 h-3 stroke-[3] ${
                                entry.key === 'yellow' ? 'text-riso-ink' : 'text-white'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right controls: Dates, Delete, Expand */}
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <div className="hidden sm:flex items-center gap-2 bg-riso-paper border-2 border-riso-line px-2.5 py-1 rounded-[8px] font-mono text-[11px] text-riso-ink">
                    <span>
                      {formatFrenchDate(phase.debut || phase.calculatedStartDate || '', false)} →{' '}
                      {formatFrenchDate(phase.fin || phase.calculatedEndDate || '', false)}
                    </span>
                    {phase.durationDays && (
                      <>
                        <span className="text-riso-ink-secondary">·</span>
                        <span className="font-bold text-riso-ink">{phase.durationDays} j</span>
                      </>
                    )}
                  </div>

                  {hasInvalidFixedDate && (
                    <span className="px-2.5 py-1 text-[11px] font-bold text-riso-p4 bg-riso-p4-light border border-riso-p4 rounded-[8px]">
                      dates à vérifier
                    </span>
                  )}

                  {/* Bouton supprimer */}
                  <button
                    type="button"
                    onClick={() => handleDelete(phase.id)}
                    className="p-1.5 text-riso-ink-secondary hover:text-riso-p4 hover:bg-riso-p4-light rounded-[8px] border border-transparent hover:border-riso-p4/40 transition-colors cursor-pointer"
                    title="Supprimer cette phase"
                    aria-label={`Supprimer la phase ${phase.nom || phase.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Expand chevron */}
                  <button
                    type="button"
                    onClick={() => setExpandedPhaseId(isExpanded ? '' : phase.id)}
                    className="p-1 text-riso-ink hover:bg-riso-p1-light rounded-[8px] transition-colors cursor-pointer"
                    title={isExpanded ? 'Replier' : 'Déplier'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-riso-ink" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-riso-ink" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message d'erreur court en cas de refus de suppression */}
              {hasError && (
                <div className="px-4 py-2.5 bg-riso-p4-light border-t-2 border-b-2 border-riso-p4 text-xs font-bold text-riso-p4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-riso-p4" />
                  <span>{deleteError.message}</span>
                </div>
              )}

              {/* Collapsible Body */}
              {isExpanded && (
                <div className="p-5 border-t-2 border-riso-ink bg-riso-paper space-y-4 text-xs">
                  {/* Objectif de phase */}
                  <div>
                    <label className="block font-bold text-riso-ink uppercase tracking-wider text-[11px] font-heading mb-1">
                      Objectif
                    </label>
                    <input
                      type="text"
                      value={phase.objective || ''}
                      onChange={(e) => updatePhase(phase.id, { objective: e.target.value })}
                      placeholder="Objectif principal de la phase"
                      className="w-full px-3 py-1.5 bg-white border-2 border-riso-line rounded-[8px] text-xs text-riso-ink focus:border-riso-ink"
                    />
                  </div>

                  {/* Fixed end date override control */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border-2 border-riso-ink rounded-[8px]">
                    <div className="flex items-center gap-2 text-riso-ink">
                      <button
                        type="button"
                        onClick={() => handleFixedDateToggle(phase)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border-2 transition-all cursor-pointer ${
                          phase.fixedEndDate
                            ? 'bg-riso-p1 text-white border-riso-ink shadow-riso-press'
                            : 'bg-white text-riso-ink border-riso-ink hover:bg-riso-p1-light'
                        }`}
                      >
                        {phase.fixedEndDate ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        <span>{phase.fixedEndDate ? 'Date de fin fixe' : 'Calcul automatique des dates'}</span>
                      </button>
                    </div>

                    {phase.fixedEndDate && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-riso-ink">Fin obligatoire :</span>
                        <input
                          type="date"
                          value={phase.fixedEndDate}
                          min={phaseStart}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (phaseStart && val && val < phaseStart) {
                              return; // Empêche fin < début à la saisie
                            }
                            updatePhaseFixedEndDate(phase.id, val);
                          }}
                          className={`px-2.5 py-1 bg-white border-2 rounded-[8px] font-mono text-xs text-riso-ink ${
                            hasInvalidFixedDate ? 'border-dashed border-riso-p4' : 'border-riso-ink'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Questions clés */}
                    <div className="riso-info-box p-3.5 rounded-[8px] space-y-2">
                      <span className="font-bold text-riso-ink block uppercase tracking-wider text-[11px] font-heading">
                        Questions directrices
                      </span>
                      {phase.keyQuestions && phase.keyQuestions.length > 0 ? (
                        <ul className="space-y-1.5 text-riso-ink-secondary list-disc list-inside leading-relaxed">
                          {phase.keyQuestions.map((q, qIdx) => (
                            <li key={qIdx}>{q}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-riso-ink-secondary italic text-[11px]">Aucune question spécifiée</p>
                      )}
                    </div>

                    {/* Méthodes recommandées */}
                    <div className="riso-info-box p-3.5 rounded-[8px] space-y-2">
                      <span className="font-bold text-riso-ink block uppercase tracking-wider text-[11px] font-heading">
                        Méthodes recommandées
                      </span>
                      {phase.methods && phase.methods.length > 0 ? (
                        <ul className="space-y-1.5 text-riso-ink-secondary list-disc list-inside leading-relaxed">
                          {phase.methods.map((m, mIdx) => (
                            <li key={mIdx}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-riso-ink-secondary italic text-[11px]">Aucune méthode spécifiée</p>
                      )}
                    </div>

                    {/* Livrable de phase attendu */}
                    <div className="riso-info-box p-3.5 rounded-[8px] space-y-2">
                      <span className="font-bold text-riso-ink block uppercase tracking-wider text-[11px] font-heading">
                        Livrable clé de phase
                      </span>
                      {phase.deliverableSummary || phase.livrableAttendu ? (
                        <p className="text-riso-ink font-medium leading-relaxed">
                          {phase.deliverableSummary || phase.livrableAttendu}
                        </p>
                      ) : (
                        <p className="text-riso-ink-secondary italic font-normal leading-relaxed">
                          Livrable attendu
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
