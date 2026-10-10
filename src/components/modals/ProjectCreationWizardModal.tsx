import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  ProjectTemplateId,
  IntermediateDeadline,
  SupervisedSchedule,
  ProjectAvailability,
  TeamMember,
  Phase,
} from '../../types/project';
import {
  PROJECT_TEMPLATES,
  DEFAULT_3_PHASES,
} from '../../utils/initialTemplates';
import {
  toLocalDateStr,
  getTodayLocalDateStr,
  addDays,
  parseLocalDate,
  getDaysDifference,
  getDayName,
  formatFrenchDateLocal,
} from '../../utils/localDate';
import {
  calculatePhaseDates,
  generateFullProject,
} from '../../utils/planGenerator';
import { PHASE_COLORS, getPhaseColor } from '../../utils/theme';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Users,
  User,
  GraduationCap,
  Layers,
  Flag,
} from 'lucide-react';

interface ProjectCreationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectCreationWizardModal: React.FC<ProjectCreationWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createProjectFromWizard } = useProject();

  const todayStr = getTodayLocalDateStr();

  // Étape courante (1 à 8)
  const [step, setStep] = useState<number>(1);

  // État du formulaire
  const [templateId, setTemplateId] = useState<ProjectTemplateId>('semestre');
  const [name, setName] = useState<string>('');
  const [brief, setBrief] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [deadlineDate, setDeadlineDate] = useState<string>(() => addDays(todayStr, 98)); // 14 semaines
  const [intermediateDeadlines, setIntermediateDeadlines] = useState<IntermediateDeadline[]>([]);
  const [newDeadlineName, setNewDeadlineName] = useState<string>('');
  const [newDeadlineDate, setNewDeadlineDate] = useState<string>('');

  // Séances encadrées
  const [supervisedMode, setSupervisedMode] = useState<'recurrent' | 'dates_libres'>('recurrent');
  const [supervisedDayOfWeek, setSupervisedDayOfWeek] = useState<number>(4); // Jeudi
  const [supervisedTimeSlot, setSupervisedTimeSlot] = useState<string>('09:00 - 12:00');
  const [supervisedExceptions, setSupervisedExceptions] = useState<string[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState<string>('');
  const [specificSupervisedDates, setSpecificSupervisedDates] = useState<string[]>([]);
  const [newSpecificDate, setNewSpecificDate] = useState<string>('');

  // Mode solo / groupe
  const [mode, setMode] = useState<'individuel' | 'groupe'>('individuel');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: 'mem_1', name: 'Moi-même (Designer)', role: 'Lead Designer', color: '#2F6DBB' },
  ]);
  const [newMemberName, setNewMemberName] = useState<string>('');

  // Disponibilités
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(8);
  const [preferredDays, setPreferredDays] = useState<number[]>([2, 4]); // Mardi, Jeudi

  // 3 phases du thème (Exploration, Idéation, Finalisation)
  const [customPhases, setCustomPhases] = useState<Phase[]>(DEFAULT_3_PHASES);

  // Mettre à jour la date de fin par défaut et les heures selon le template sélectionné
  const handleSelectTemplate = (id: ProjectTemplateId) => {
    setTemplateId(id);
    const tpl = PROJECT_TEMPLATES[id];
    setDeadlineDate(addDays(startDate, tpl.durationWeeksSuggested * 7));
    setHoursPerWeek(tpl.recommendedHoursPerWeek);
    setCustomPhases(tpl.phases.map((p) => ({ ...p })));
    setStep(2);
  };

  // Ajustement des pourcentages des phases
  const handlePhasePercentageChange = (phaseId: string, delta: number) => {
    setCustomPhases((prev) => {
      const target = prev.find((p) => p.id === phaseId);
      if (!target) return prev;
      const newPct = Math.max(5, Math.min(50, target.timePercentage + delta));
      const diff = newPct - target.timePercentage;

      // Compense sur la dernière phase ou la suivante
      const other = prev.find((p) => p.id !== phaseId && p.timePercentage - diff >= 5);
      if (!other) return prev;

      return prev.map((p) => {
        if (p.id === phaseId) return { ...p, timePercentage: newPct };
        if (p.id === other.id) return { ...p, timePercentage: other.timePercentage - diff };
        return p;
      });
    });
  };

  const handleAddIntermediateDeadline = () => {
    if (!newDeadlineName.trim() || !newDeadlineDate) return;
    setIntermediateDeadlines((prev) => [
      ...prev,
      {
        id: `dead_${Date.now()}`,
        name: newDeadlineName.trim(),
        date: newDeadlineDate,
        source: 'manual',
      },
    ]);
    setNewDeadlineName('');
    setNewDeadlineDate('');
  };

  const handleRemoveIntermediateDeadline = (id: string) => {
    setIntermediateDeadlines((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddException = () => {
    if (!newExceptionDate || supervisedExceptions.includes(newExceptionDate)) return;
    setSupervisedExceptions((prev) => [...prev, newExceptionDate].sort());
    setNewExceptionDate('');
  };

  const handleRemoveException = (d: string) => {
    setSupervisedExceptions((prev) => prev.filter((item) => item !== d));
  };

  const handleAddSpecificSupervised = () => {
    if (!newSpecificDate || specificSupervisedDates.includes(newSpecificDate)) return;
    setSpecificSupervisedDates((prev) => [...prev, newSpecificDate].sort());
    setNewSpecificDate('');
  };

  const handleRemoveSpecificSupervised = (d: string) => {
    setSpecificSupervisedDates((prev) => prev.filter((item) => item !== d));
  };

  const handleTogglePreferredDay = (dayIndex: number) => {
    setPreferredDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleAddTeamMember = () => {
    if (!newMemberName.trim()) return;
    const colors = ['#2F6DBB', '#2E8B4A', '#F0505A', '#F2661F', '#7A4A9E'];
    const newMember: TeamMember = {
      id: `mem_${Date.now()}`,
      name: newMemberName.trim(),
      role: 'Designer',
      color: colors[teamMembers.length % colors.length],
    };
    setTeamMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
  };

  const handleRemoveTeamMember = (id: string) => {
    if (teamMembers.length <= 1) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Pré-visualisation des données calculées pour l'écran 8
  const calculatedPhases = calculatePhaseDates(customPhases, startDate, deadlineDate);
  const totalDays = Math.max(1, getDaysDifference(startDate, deadlineDate));
  const totalWeeks = Math.max(1, Math.round(totalDays / 7));

  const supervisedSchedule: SupervisedSchedule = {
    mode: supervisedMode,
    dayOfWeek: supervisedDayOfWeek,
    timeSlot: supervisedTimeSlot,
    durationHours: 2,
    exceptions: supervisedExceptions,
    specificDates: specificSupervisedDates,
  };

  const availability: ProjectAvailability = {
    hoursPerWeek,
    preferredDays,
  };

  // Création finale du projet
  const handleFinalCreate = () => {
    createProjectFromWizard({
      name: name.trim() || 'Mon projet de design',
      brief: brief.trim(),
      templateId,
      startDate,
      deadlineDate,
      mode,
      teamMembers,
      intermediateDeadlines,
      supervisedSchedule,
      availability,
      customPhases,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#22408F]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="riso-card w-full max-w-2xl bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-label="Assistant de création de projet"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F6DBB]" />
            <h2 className="text-base font-bold text-[#22408F] font-heading">
              Nouveau projet · Étape {step} sur 8
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#22408F] hover:bg-[#EBF1FF] transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Barre de progression discrète */}
        <div className="w-full h-1 bg-[#EBF1FF]">
          <div
            className="h-full bg-[#2F6DBB] transition-all duration-200"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>

        {/* Corps des étapes */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* ============================================================== */}
          {/* ÉTAPE 1 : Choix du gabarit                                      */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Quel type de projet démarres-tu ?
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Chaque gabarit pré-remplit les 3 phases (Exploration, Idéation, Finalisation), le rythme des sessions et les livrables types.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(Object.keys(PROJECT_TEMPLATES) as ProjectTemplateId[]).map((tId) => {
                  const tpl = PROJECT_TEMPLATES[tId];
                  const isSelected = templateId === tId;
                  return (
                    <div
                      key={tId}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTemplate(tId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelectTemplate(tId);
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left ${
                        isSelected
                          ? 'border-[#22408F] bg-[#EBF1FF] shadow-[0_3px_0_#22408F]'
                          : 'border-[#22408F]/25 bg-white hover:border-[#22408F] hover:bg-[#FBFAF6]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#22408F]">{tpl.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#22408F]/30 text-[#22408F]">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#5A6A94] leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-[#22408F]/15 flex items-center justify-between text-[11px] text-[#22408F] font-semibold">
                        <span>~{tpl.recommendedHoursPerWeek} h / semaine</span>
                        <span className="underline">Choisir →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 2 : Nom et Brief (2 lignes)                               */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Donne un nom et un brief à ton projet
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Tu pourras toujours modifier l’intitulé et le brief plus tard dans les réglages.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-[#22408F]">Nom du projet *</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex. : Refonte de la consigne urbaine"
                    autoFocus
                    className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3.5 py-2.5 text-sm text-[#22408F] focus:outline-hidden focus:ring-2 focus:ring-[#2F6DBB]/40"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-[#22408F]">Brief synthétique (2 lignes)</span>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="En quoi consiste le sujet ? Quel est l'enjeu principal et le contexte d'intervention ?"
                    rows={2}
                    className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3.5 py-2.5 text-sm text-[#22408F] focus:outline-hidden focus:ring-2 focus:ring-[#2F6DBB]/40 resize-none"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 3 : Dates début & rendu final                             */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Quand démarre le projet et quand a lieu le rendu final ?
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Durée totale calculée : <strong>{totalWeeks} semaines</strong> ({totalDays} jours).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-[#22408F]">Date de démarrage</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => e.target.value && setStartDate(e.target.value)}
                    className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#22408F] focus:outline-hidden"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-[#22408F]">Rendu final / Jury</span>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => e.target.value && setDeadlineDate(e.target.value)}
                    className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#22408F] focus:outline-hidden"
                  />
                </label>
              </div>

              <div className="p-3 bg-[#FBFAF6] border-2 border-[#22408F]/20 rounded-xl text-xs text-[#5A6A94] space-y-1">
                <p>
                  📅 Du <strong>{formatFrenchDateLocal(startDate)}</strong> au{' '}
                  <strong>{formatFrenchDateLocal(deadlineDate)}</strong>.
                </p>
                <p className="text-[11px]">
                  Les 3 phases seront automatiquement ajustées à cette période sans aucun décalage de jour.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 4 : Rendus intermédiaires (0 à n)                         */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Y a-t-il des rendus intermédiaires imposés ?
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Ajoute les dates d'étape fixées par l'école ou le client (facultatif).
                </p>
              </div>

              <div className="space-y-2">
                {intermediateDeadlines.length === 0 ? (
                  <p className="text-xs text-[#5A6A94] italic p-3 bg-[#FBFAF6] rounded-lg border border-[#22408F]/20">
                    Aucun rendu intermédiaire ajouté. Le plan utilisera les objectifs types du gabarit.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {intermediateDeadlines.map((dead) => (
                      <li
                        key={dead.id}
                        className="flex items-center justify-between p-2.5 bg-white border-2 border-[#22408F] rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-[#2F6DBB]" />
                          <div>
                            <span className="text-xs font-bold text-[#22408F] block">{dead.name}</span>
                            <span className="text-[10px] font-mono text-[#5A6A94]">
                              {formatFrenchDateLocal(dead.date)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveIntermediateDeadline(dead.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#5A6A94] hover:text-[#F0505A]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Formulaire d'ajout rapide */}
              <div className="bg-[#FBFAF6] border-2 border-[#22408F]/30 rounded-xl p-3 space-y-2">
                <span className="text-xs font-bold text-[#22408F] block">
                  + Ajouter un rendu intermédiaire
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newDeadlineName}
                    onChange={(e) => setNewDeadlineName(e.target.value)}
                    placeholder="Intitulé (ex: Cadrage validé)"
                    className="bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1.5 text-xs text-[#22408F]"
                  />
                  <input
                    type="date"
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                    className="bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#22408F]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddIntermediateDeadline}
                  disabled={!newDeadlineName.trim() || !newDeadlineDate}
                  className="btn-riso-secondary text-xs w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter ce rendu</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 5 : Séances encadrées                                     */}
          {/* ============================================================== */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Comment sont rythmées les séances encadrées ?
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Point de suivi avec le professeur, le tuteur ou l'intervenant.
                </p>
              </div>

              {/* Choix du mode */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSupervisedMode('recurrent')}
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    supervisedMode === 'recurrent'
                      ? 'border-[#22408F] bg-[#EBF1FF] shadow-[0_2px_0_#22408F]'
                      : 'border-[#22408F]/30 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-[#22408F] block">Jour récurrent</span>
                  <span className="text-[11px] text-[#5A6A94]">Ex: Tous les jeudis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSupervisedMode('dates_libres')}
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    supervisedMode === 'dates_libres'
                      ? 'border-[#22408F] bg-[#EBF1FF] shadow-[0_2px_0_#22408F]'
                      : 'border-[#22408F]/30 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-[#22408F] block">Dates libres</span>
                  <span className="text-[11px] text-[#5A6A94]">Points d'étape ponctuels</span>
                </button>
              </div>

              {supervisedMode === 'recurrent' ? (
                <div className="space-y-3 bg-[#FBFAF6] p-4 rounded-xl border-2 border-[#22408F]/25">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-[#22408F]">Quel jour ?</span>
                      <select
                        value={supervisedDayOfWeek}
                        onChange={(e) => setSupervisedDayOfWeek(Number(e.target.value))}
                        className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3 py-2 text-xs font-bold text-[#22408F]"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <option key={d} value={d}>
                            Tous les {getDayName(d).toLowerCase()}s
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-[#22408F]">Créneau horaire (facultatif)</span>
                      <input
                        type="text"
                        value={supervisedTimeSlot}
                        onChange={(e) => setSupervisedTimeSlot(e.target.value)}
                        placeholder="Ex: 09:00 - 12:00"
                        className="w-full bg-white border-2 border-[#22408F] rounded-lg px-3 py-2 text-xs text-[#22408F]"
                      />
                    </label>
                  </div>

                  {/* Exceptions (vacances / jours fériés) */}
                  <div className="pt-2 border-t border-[#22408F]/20 space-y-2">
                    <span className="text-xs font-bold text-[#22408F] block">
                      Exceptions (vacances ou séances annulées)
                    </span>
                    {supervisedExceptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {supervisedExceptions.map((ex) => (
                          <span
                            key={ex}
                            className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#22408F] text-[#22408F]"
                          >
                            <span>{formatFrenchDateLocal(ex, false)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveException(ex)}
                              className="text-[#F0505A] font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={newExceptionDate}
                        onChange={(e) => setNewExceptionDate(e.target.value)}
                        className="bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1 text-xs font-mono text-[#22408F]"
                      />
                      <button
                        type="button"
                        onClick={handleAddException}
                        disabled={!newExceptionDate}
                        className="btn-riso-secondary text-xs"
                      >
                        Exclure cette date
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#FBFAF6] p-4 rounded-xl border-2 border-[#22408F]/25">
                  <span className="text-xs font-bold text-[#22408F] block">
                    Dates spécifiques des séances encadrées
                  </span>
                  {specificSupervisedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {specificSupervisedDates.map((sp) => (
                        <span
                          key={sp}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#22408F] text-[#22408F]"
                        >
                          <span>{formatFrenchDateLocal(sp, false)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecificSupervised(sp)}
                            className="text-[#F0505A] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newSpecificDate}
                      onChange={(e) => setNewSpecificDate(e.target.value)}
                      className="bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1 text-xs font-mono text-[#22408F]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecificSupervised}
                      disabled={!newSpecificDate}
                      className="btn-riso-secondary text-xs"
                    >
                      Ajouter cette séance
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 6 : Solo / Groupe & Membres                               */}
          {/* ============================================================== */}
          {step === 6 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Ce projet est-il individuel ou collectif ?
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode('individuel');
                    setTeamMembers([
                      { id: 'mem_1', name: 'Moi-même (Designer)', role: 'Lead Designer', color: '#2F6DBB' },
                    ]);
                  }}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex items-center gap-3 ${
                    mode === 'individuel'
                      ? 'border-[#22408F] bg-[#EBF1FF] shadow-[0_2px_0_#22408F]'
                      : 'border-[#22408F]/30 bg-white'
                  }`}
                >
                  <User className="w-5 h-5 text-[#22408F]" />
                  <div>
                    <span className="text-xs font-bold text-[#22408F] block">Individuel</span>
                    <span className="text-[11px] text-[#5A6A94]">En solo</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('groupe');
                    if (teamMembers.length <= 1) {
                      setTeamMembers([
                        { id: 'mem_1', name: 'Membre 1', role: 'Recherche & UX', color: '#2F6DBB' },
                        { id: 'mem_2', name: 'Membre 2', role: 'UI & Prototypage', color: '#2E8B4A' },
                      ]);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex items-center gap-3 ${
                    mode === 'groupe'
                      ? 'border-[#22408F] bg-[#EBF1FF] shadow-[0_2px_0_#22408F]'
                      : 'border-[#22408F]/30 bg-white'
                  }`}
                >
                  <Users className="w-5 h-5 text-[#22408F]" />
                  <div>
                    <span className="text-xs font-bold text-[#22408F] block">En groupe</span>
                    <span className="text-[11px] text-[#5A6A94]">Équipe de design</span>
                  </div>
                </button>
              </div>

              {mode === 'groupe' && (
                <div className="space-y-3 bg-[#FBFAF6] p-4 rounded-xl border-2 border-[#22408F]/25">
                  <span className="text-xs font-bold text-[#22408F] block">Membres du groupe</span>
                  <ul className="space-y-1.5">
                    {teamMembers.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 bg-white border border-[#22408F]/40 rounded-lg text-xs"
                      >
                        <span className="font-bold text-[#22408F]">{m.name}</span>
                        {teamMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(m.id)}
                            className="text-[#5A6A94] hover:text-[#F0505A]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Prénom ou nom du membre"
                      className="flex-1 bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1.5 text-xs text-[#22408F]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTeamMember}
                      disabled={!newMemberName.trim()}
                      className="btn-riso-secondary text-xs"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 7 : Disponibilité (heures / semaine + jours préférés)      */}
          {/* ============================================================== */}
          {step === 7 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading">
                  Quel est ton temps de travail disponible ?
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Permet de placer automatiquement des sessions de travail réalistes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#22408F]">
                    <span>Volume de travail visé :</span>
                    <span className="font-mono text-sm">{hoursPerWeek} heures / semaine</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={35}
                    step={1}
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="w-full accent-[#2F6DBB]"
                  />
                  <div className="flex justify-between text-[10px] text-[#5A6A94] font-mono">
                    <span>2h (Léger)</span>
                    <span>12h (Régulier)</span>
                    <span>25h+ (Intensif)</span>
                  </div>
                </div>

                {/* Jours préférés Lun-Dim */}
                <div className="space-y-2 pt-2 border-t border-[#22408F]/20">
                  <span className="text-xs font-bold text-[#22408F] block">
                    Jours d'atelier préférés (du lundi au dimanche) :
                  </span>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayIdx) => {
                      const isSelected = preferredDays.includes(dayIdx);
                      return (
                        <button
                          key={dayIdx}
                          type="button"
                          onClick={() => handleTogglePreferredDay(dayIdx)}
                          className={`py-2 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#2F6DBB] text-white border-[#22408F] shadow-[0_2px_0_#22408F]'
                              : 'bg-white text-[#5A6A94] border-[#22408F]/30 hover:border-[#22408F]'
                          }`}
                        >
                          {getDayName(dayIdx, true)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#5A6A94]">
                    Les sessions autonomes seront réparties en priorité sur ces jours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ÉTAPE 8 : Aperçu du plan (Frise interactive avant création)     */}
          {/* ============================================================== */}
          {step === 8 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg font-bold text-[#22408F] font-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#2F6DBB]" />
                  Aperçu du plan pour « {name || 'Mon projet'} »
                </h3>
                <p className="text-xs text-[#5A6A94] mt-1">
                  Vérifie la frise des phases, les dates et le volume de sessions avant de valider.
                </p>
              </div>

              {/* Frise des phases */}
              <div className="space-y-3 bg-[#FBFAF6] p-4 rounded-xl border-2 border-[#22408F]">
                <div className="flex items-center justify-between text-xs font-bold text-[#22408F]">
                  <span>Frise des 3 phases (Exploration, Idéation, Finalisation)</span>
                </div>

                {/* Barre multi-segments */}
                <div className="w-full h-8 rounded-lg border-2 border-[#22408F] overflow-hidden flex shadow-2xs">
                  {calculatedPhases.map((ph) => {
                    const color = getPhaseColor(ph, calculatedPhases);
                    return (
                      <div
                        key={ph.id}
                        style={{
                          width: `${ph.timePercentage}%`,
                          backgroundColor: color.hex,
                        }}
                        className={`h-full flex items-center justify-center text-[11px] font-bold truncate px-2 transition-all ${
                          color.key === 'yellow' ? 'text-[#22408F]' : 'text-white'
                        }`}
                        title={`${ph.nom || ph.shortName || ph.name} (${formatFrenchDateLocal(ph.calculatedStartDate || '', false)} au ${formatFrenchDateLocal(ph.calculatedEndDate || '', false)})`}
                      >
                        {ph.nom || ph.shortName || ph.name}
                      </div>
                    );
                  })}
                </div>

                {/* 3 Cartes des phases sans % */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {calculatedPhases.map((ph) => {
                    const color = getPhaseColor(ph, calculatedPhases);
                    const days = ph.durationDays || Math.max(1, getDaysDifference(ph.calculatedStartDate || '', ph.calculatedEndDate || '') + 1);
                    return (
                      <div
                        key={ph.id}
                        className="p-3 bg-white rounded-lg border-2 border-[#22408F]/30 text-xs flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-[#22408F]/40"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="font-bold text-sm text-[#22408F] truncate">
                              {ph.nom || ph.name || ph.shortName}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5A6A94] block mt-1.5 font-medium">
                            Du {formatFrenchDateLocal(ph.calculatedStartDate || '', false)} au{' '}
                            {formatFrenchDateLocal(ph.calculatedEndDate || '', false)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-[#22408F]/15 flex items-center justify-between text-xs">
                          <span className="text-[#5A6A94] font-medium">Durée</span>
                          <span className="font-bold text-[#22408F] font-mono">
                            {days} jours
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Résumé des sessions et objectifs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white border-2 border-[#22408F] rounded-xl space-y-1">
                  <span className="font-bold text-[#22408F] block">Rythme</span>
                  <p className="text-[#5A6A94]">
                    • Séances encadrées :{' '}
                    <strong>
                      {supervisedMode === 'recurrent'
                        ? `Tous les ${getDayName(supervisedDayOfWeek).toLowerCase()}s`
                        : `${specificSupervisedDates.length} séances`}
                    </strong>
                  </p>
                  <p className="text-[#5A6A94]">
                    • Disponibilité : <strong>{hoursPerWeek} h / semaine</strong> sur{' '}
                    <strong>{preferredDays.map((d) => getDayName(d, true)).join(', ')}</strong>
                  </p>
                </div>

                <div className="p-3.5 bg-white border-2 border-[#22408F] rounded-xl space-y-1">
                  <span className="font-bold text-[#22408F] block">Objectifs</span>
                  <p className="text-[#5A6A94]">
                    • Rendus intermédiaires : <strong>{intermediateDeadlines.length} planifié(s)</strong>
                  </p>
                  <p className="text-[#5A6A94]">
                    • Rendu final : <strong>{formatFrenchDateLocal(deadlineDate)}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer avec boutons Retour / Continuer */}
        <footer className="px-6 py-4 border-t-2 border-[#22408F] bg-[#FBFAF6] flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-riso-secondary text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-riso-discreet text-xs">
              Annuler
            </button>
          )}

          {step < 8 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && !name.trim()) return;
                setStep((s) => s + 1);
              }}
              disabled={step === 2 && !name.trim()}
              className="btn-riso-primary text-xs"
            >
              <span>Continuer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-riso-secondary text-xs"
              >
                Ajuster
              </button>
              <button
                type="button"
                onClick={handleFinalCreate}
                className="btn-riso-primary text-xs"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Créer le projet</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
