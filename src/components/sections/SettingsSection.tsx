import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  TeamMember,
  ProjectMode,
  DEFAULT_OPERATION_TAGS,
  IntermediateDeadline,
  SupervisedSchedule,
  ProjectAvailability,
  PlanDiff,
} from '../../types/project';
import {
  Settings,
  Calendar,
  Users,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  Tag,
  Check,
  AlertCircle,
  Flag,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  formatFrenchDateLocal,
  getDayName,
  getDaysDifference,
} from '../../utils/localDate';
import {
  calculatePlanDiff,
  calculatePhaseDates,
} from '../../utils/planGenerator';
import { PlanDiffModal } from '../modals/PlanDiffModal';

export const SettingsSection: React.FC = () => {
  const {
    activeProject,
    updateSettings,
    applyPlanDiffToActiveProject,
  } = useProject();
  const { settings, phases, sessions } = activeProject;

  const totalPlannedHours = (sessions || []).reduce(
    (sum, s) => sum + (s.plannedDurationHours || 0),
    0
  );

  // Brouillon des réglages de planification (dates, encadrement, dispo, rendus intermédiaires)
  const [draftStartDate, setDraftStartDate] = useState(settings.startDate);
  const [draftDeadlineDate, setDraftDeadlineDate] = useState(settings.deadlineDate);
  const [draftDeadlines, setDraftDeadlines] = useState<IntermediateDeadline[]>(
    settings.intermediateDeadlines || []
  );
  const [draftSupervised, setDraftSupervised] = useState<SupervisedSchedule>(
    settings.supervisedSchedule || {
      mode: 'dates_libres',
      exceptions: [],
      specificDates: [],
    }
  );
  const [draftAvailability, setDraftAvailability] = useState<ProjectAvailability>(
    settings.availability || {
      hoursPerWeek: 8,
      preferredDays: [2, 4],
    }
  );

  // Synchronisation si le projet actif change
  useEffect(() => {
    setDraftStartDate(settings.startDate);
    setDraftDeadlineDate(settings.deadlineDate);
    setDraftDeadlines(settings.intermediateDeadlines || []);
    setDraftSupervised(
      settings.supervisedSchedule || {
        mode: 'dates_libres',
        exceptions: [],
        specificDates: [],
      }
    );
    setDraftAvailability(
      settings.availability || {
        hoursPerWeek: 8,
        preferredDays: [2, 4],
      }
    );
  }, [
    activeProject.id,
    settings.startDate,
    settings.deadlineDate,
    settings.intermediateDeadlines,
    settings.supervisedSchedule,
    settings.availability,
  ]);

  // Diff modal state
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [calculatedDiff, setCalculatedDiff] = useState<PlanDiff | null>(null);

  // Saisie pour ajouts
  const [newTagInput, setNewTagInput] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newDeadlineName, setNewDeadlineName] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newExceptionDate, setNewExceptionDate] = useState('');

  // Vérifie si des réglages de planification sont en attente d'application
  const isPlanningModified =
    draftStartDate !== settings.startDate ||
    draftDeadlineDate !== settings.deadlineDate ||
    JSON.stringify(draftDeadlines) !== JSON.stringify(settings.intermediateDeadlines || []) ||
    JSON.stringify(draftSupervised) !== JSON.stringify(settings.supervisedSchedule || {}) ||
    JSON.stringify(draftAvailability) !== JSON.stringify(settings.availability || {});

  const totalDays = Math.max(1, getDaysDifference(draftStartDate, draftDeadlineDate));
  const totalWeeks = Math.max(1, Math.round(totalDays / 7));

  // Ouvre le modal de diff pour prévisualisation sécurisée
  const handlePreviewChanges = () => {
    const diff = calculatePlanDiff(activeProject, {
      startDate: draftStartDate,
      deadlineDate: draftDeadlineDate,
      intermediateDeadlines: draftDeadlines,
      supervisedSchedule: draftSupervised,
      availability: draftAvailability,
      phases,
    });
    setCalculatedDiff(diff);
    setIsDiffModalOpen(true);
  };

  // Confirmation et application du diff
  const handleConfirmDiff = () => {
    if (!calculatedDiff) return;
    const newPhases = calculatePhaseDates(phases, draftStartDate, draftDeadlineDate);
    applyPlanDiffToActiveProject(
      calculatedDiff,
      {
        startDate: draftStartDate,
        deadlineDate: draftDeadlineDate,
        intermediateDeadlines: draftDeadlines,
        supervisedSchedule: draftSupervised,
        availability: draftAvailability,
      },
      newPhases
    );
    setIsDiffModalOpen(false);
    setCalculatedDiff(null);
  };

  const handleResetDraft = () => {
    setDraftStartDate(settings.startDate);
    setDraftDeadlineDate(settings.deadlineDate);
    setDraftDeadlines(settings.intermediateDeadlines || []);
    setDraftSupervised(
      settings.supervisedSchedule || {
        mode: 'dates_libres',
        exceptions: [],
        specificDates: [],
      }
    );
    setDraftAvailability(
      settings.availability || {
        hoursPerWeek: 8,
        preferredDays: [2, 4],
      }
    );
  };

  const handleModeChange = (mode: ProjectMode) => {
    if (mode === 'individuel') {
      const singleMember: TeamMember = settings.team[0] || {
        id: 'mem_1',
        name: 'Moi-même (Designer)',
        role: 'Designer',
        color: '#2F6DBB',
      };
      updateSettings({
        mode,
        team: [singleMember],
      });
    } else {
      updateSettings({ mode });
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const colors = ['#2F6DBB', '#2E8B4A', '#F0505A', '#F2661F', '#7A4A9E'];
    const newMember: TeamMember = {
      id: `mem_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Designer',
      color: colors[settings.team.length % colors.length],
    };
    updateSettings({
      team: [...settings.team, newMember],
    });
    setNewMemberName('');
    setNewMemberRole('');
  };

  const handleRemoveMember = (id: string) => {
    if (settings.team.length <= 1) return;
    updateSettings({
      team: settings.team.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Bandeau d'alerte si modifications de planification en attente */}
      {isPlanningModified && (
        <div className="bg-[#EBF1FF] border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#F0505A] animate-pulse shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-[#22408F]">
                Modifications de planification en attente
              </h4>
              <p className="text-xs text-[#5A6A94]">
                Les dates, encadrements ou disponibilités ont été ajustés. Prévisualise l'impact
                avant d'appliquer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDraft}
              className="btn-riso-secondary text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rétablir</span>
            </button>
            <button
              type="button"
              onClick={handlePreviewChanges}
              className="btn-riso-primary text-xs"
            >
              <span>Ce qui va changer</span>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Identity, Dates & Planning */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. General Information Card */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
              <Settings className="w-4 h-4 text-[#22408F]" />
              Identité
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#22408F] mb-1">
                  Nom du projet <span className="text-[#F0505A]">*</span>
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSettings({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] font-medium focus:border-[#22408F] focus:outline-none transition-all text-xs"
                  placeholder="ex: Identité visuelle, Application mobile, Mobilier urbain..."
                />
              </div>

              <div>
                <label className="block font-bold text-[#22408F] mb-1">
                  Brief
                </label>
                <textarea
                  rows={2}
                  value={settings.brief || settings.description}
                  onChange={(e) =>
                    updateSettings({
                      brief: e.target.value,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] focus:border-[#22408F] focus:outline-none transition-all text-xs leading-relaxed resize-none"
                  placeholder="Enjeux, intentions de design, public visé..."
                />
              </div>

              {/* Mode switch (Solo vs Groupe) */}
              <div className="pt-2">
                <label className="block font-bold text-[#22408F] mb-1.5 font-heading">
                  Mode de travail
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleModeChange('individuel')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      settings.mode === 'individuel'
                        ? 'bg-[#EBF1FF] border-[#22408F] shadow-[0_4px_0_#22408F] text-[#22408F]'
                        : 'bg-white border-[#22408F]/30 text-[#5A6A94] hover:bg-[#EBF1FF]/30'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between text-[#22408F]">
                      <span>Projet individuel (Solo)</span>
                      {settings.mode === 'individuel' && (
                        <span className="w-5 h-5 rounded-full bg-[#2F6DBB] text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('groupe')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      settings.mode === 'groupe'
                        ? 'bg-[#EBF1FF] border-[#22408F] shadow-[0_4px_0_#22408F] text-[#22408F]'
                        : 'bg-white border-[#22408F]/30 text-[#5A6A94] hover:bg-[#EBF1FF]/30'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between text-[#22408F]">
                      <span>Projet en groupe (Équipe)</span>
                      {settings.mode === 'groupe' && (
                        <span className="w-5 h-5 rounded-full bg-[#2F6DBB] text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Temporal Boundaries & Safe Recalculation Card */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
                <Calendar className="w-4 h-4 text-[#22408F]" />
                Calendrier
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#22408F] mb-1">
                  Date de début du projet
                </label>
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => e.target.value && setDraftStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg font-mono text-[#22408F] text-xs focus:border-[#22408F]"
                />
                <span className="text-[11px] text-[#5A6A94] mt-1 block">
                  {formatFrenchDateLocal(draftStartDate)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#22408F] mb-1">
                  Date de rendu final / Jury
                </label>
                <input
                  type="date"
                  value={draftDeadlineDate}
                  onChange={(e) => e.target.value && setDraftDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg font-mono text-[#22408F] text-xs focus:border-[#22408F]"
                />
                <span className="text-[11px] text-[#5A6A94] mt-1 block">
                  {formatFrenchDateLocal(draftDeadlineDate)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#FBFAF6] border border-[#22408F]/20 rounded-xl text-xs flex items-center justify-between text-[#22408F]">
              <span className="font-bold">Durée calculée :</span>
              <span className="font-mono font-bold">
                {totalDays} jours ({totalWeeks} semaines)
              </span>
            </div>
          </div>

          {/* 3. Rendus intermédiaires */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
              <Flag className="w-4 h-4 text-[#22408F]" />
              Objectifs
            </h3>

            <div className="space-y-2 text-xs">
              {draftDeadlines.length === 0 ? (
                <p className="text-xs text-[#5A6A94] italic p-3 bg-[#FBFAF6] rounded-xl border border-[#22408F]/20">
                  Aucun objectif intermédiaire spécifique configuré.
                </p>
              ) : (
                <ul className="space-y-2">
                  {draftDeadlines.map((dead) => (
                    <li
                      key={dead.id}
                      className="flex items-center justify-between p-2.5 bg-[#FBFAF6] border border-[#22408F]/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-[#2F6DBB]" />
                        <div>
                          <span className="font-bold text-[#22408F] block">{dead.name}</span>
                          <span className="font-mono text-[10px] text-[#5A6A94]">
                            {formatFrenchDateLocal(dead.date)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftDeadlines((prev) => prev.filter((d) => d.id !== dead.id))
                        }
                        className="text-[#5A6A94] hover:text-[#F0505A] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Formulaire ajout rapide */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#22408F]/15">
                <input
                  type="text"
                  value={newDeadlineName}
                  onChange={(e) => setNewDeadlineName(e.target.value)}
                  placeholder="Intitulé du rendu..."
                  className="flex-1 px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F]"
                />
                <input
                  type="date"
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs font-mono text-[#22408F]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newDeadlineName.trim() || !newDeadlineDate) return;
                    setDraftDeadlines((prev) => [
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
                  }}
                  disabled={!newDeadlineName.trim() || !newDeadlineDate}
                  className="btn-riso-secondary py-1.5 px-3 text-xs"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* 4. Rythme : Séances encadrées & Disponibilités */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
                <Clock className="w-4 h-4 text-[#22408F]" />
                Rythme
              </h3>
              <div className="text-xs text-[#22408F] bg-[#FBFAF6] px-3 py-1 rounded-[999px] border-2 border-[#22408F] tabular-nums font-bold self-start sm:self-auto">
                Total prévu : <strong>{totalPlannedHours} h</strong> ({sessions.length} sessions)
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#EBF1FF] border-2 border-[#22408F] rounded-xl flex items-center justify-between text-xs font-bold text-[#22408F]">
                <span>Volume de travail total prévu :</span>
                <span className="font-mono text-xs bg-white border border-[#22408F] px-2.5 py-0.5 rounded-full">
                  {totalPlannedHours} h ({sessions.length} sessions)
                </span>
              </div>

              {/* Séances encadrées */}
              <div className="space-y-2">
                <span className="font-bold text-[#22408F] block">Séances encadrées :</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#5A6A94] mb-1">Mode</label>
                    <select
                      value={draftSupervised.mode}
                      onChange={(e) =>
                        setDraftSupervised((prev) => ({
                          ...prev,
                          mode: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs font-bold text-[#22408F]"
                    >
                      <option value="recurrent">Jour récurrent par semaine</option>
                      <option value="dates_libres">Dates libres / ponctuelles</option>
                    </select>
                  </div>

                  {draftSupervised.mode === 'recurrent' && (
                    <div>
                      <label className="block text-[11px] text-[#5A6A94] mb-1">Jour fixe</label>
                      <select
                        value={draftSupervised.dayOfWeek || 4}
                        onChange={(e) =>
                          setDraftSupervised((prev) => ({
                            ...prev,
                            dayOfWeek: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs font-bold text-[#22408F]"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <option key={d} value={d}>
                            Tous les {getDayName(d).toLowerCase()}s
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Exceptions pour les séances récurrentes */}
                {draftSupervised.mode === 'recurrent' && (
                  <div className="pt-2 border-t border-[#22408F]/15 space-y-2">
                    <span className="text-[11px] font-bold text-[#22408F] block">
                      Exceptions exclues (vacances / annulations) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {draftSupervised.exceptions.map((ex) => (
                        <span
                          key={ex}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FBFAF6] border border-[#22408F] text-[#22408F]"
                        >
                          <span>{formatFrenchDateLocal(ex, false)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftSupervised((prev) => ({
                                ...prev,
                                exceptions: prev.exceptions.filter((x) => x !== ex),
                              }))
                            }
                            className="text-[#F0505A] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={newExceptionDate}
                        onChange={(e) => setNewExceptionDate(e.target.value)}
                        className="px-2.5 py-1 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs font-mono text-[#22408F]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !newExceptionDate ||
                            draftSupervised.exceptions.includes(newExceptionDate)
                          )
                            return;
                          setDraftSupervised((prev) => ({
                            ...prev,
                            exceptions: [...prev.exceptions, newExceptionDate].sort(),
                          }));
                          setNewExceptionDate('');
                        }}
                        disabled={!newExceptionDate}
                        className="btn-riso-secondary text-xs"
                      >
                        Exclure cette date
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Disponibilités */}
              <div className="pt-3 border-t border-[#22408F]/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#22408F]">
                  <span>Disponibilité personnelle visée :</span>
                  <span className="font-mono">{draftAvailability.hoursPerWeek}h / semaine</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={35}
                  value={draftAvailability.hoursPerWeek}
                  onChange={(e) =>
                    setDraftAvailability((prev) => ({
                      ...prev,
                      hoursPerWeek: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#2F6DBB]"
                />

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-[#5A6A94] block">
                    Jours d'atelier préférés :
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((dIdx) => {
                      const isSel = draftAvailability.preferredDays.includes(dIdx);
                      return (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => {
                            setDraftAvailability((prev) => ({
                              ...prev,
                              preferredDays: isSel
                                ? prev.preferredDays.filter((x) => x !== dIdx)
                                : [...prev.preferredDays, dIdx].sort(),
                            }));
                          }}
                          className={`py-1 rounded text-[11px] font-bold border ${
                            isSel
                              ? 'bg-[#2F6DBB] text-white border-[#22408F]'
                              : 'bg-white text-[#5A6A94] border-[#22408F]/30 hover:border-[#22408F]'
                          }`}
                        >
                          {getDayName(dIdx, true)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Team Members & Tags */}
        <div className="space-y-6">
          {/* Team Members List (Mode groupe uniquement) */}
          {settings.mode === 'groupe' && (
            <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
                  <Users className="w-4 h-4 text-[#22408F]" />
                  Membres de l'équipe ({settings.team.length})
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {settings.team.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-lg border-2 border-[#22408F]/20 bg-[#FBFAF6] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-[#22408F]/30"
                        style={{ backgroundColor: member.color || '#2F6DBB' }}
                      />
                      <div className="truncate">
                        <span className="font-bold text-[#22408F] block truncate">
                          {member.name}
                        </span>
                        {member.role && (
                          <span className="text-[11px] text-[#5A6A94] block truncate">
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {settings.team.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-[#5A6A94] hover:text-[#F0505A] transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddMember} className="space-y-2 pt-2 border-t-2 border-[#22408F]/15">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Prénom ou nom du membre…"
                  className="w-full px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F]"
                />
                <button
                  type="submit"
                  disabled={!newMemberName.trim()}
                  className="btn-riso-secondary w-full py-1.5 text-xs justify-center"
                >
                  Ajouter ce membre
                </button>
              </form>
            </div>
          )}

          {/* Tags */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
              <Tag className="w-4 h-4 text-[#22408F]" />
              Tags
            </h3>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(settings.customTags !== undefined ? settings.customTags : DEFAULT_OPERATION_TAGS).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#22408F] border-2 border-[#22408F]"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = settings.customTags !== undefined ? settings.customTags : DEFAULT_OPERATION_TAGS;
                      updateSettings({
                        customTags: current.filter((t) => t !== tag),
                      });
                    }}
                    className="text-[#5A6A94] hover:text-[#F0505A]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTagInput.trim()) return;
                const current = settings.customTags !== undefined ? settings.customTags : DEFAULT_OPERATION_TAGS;
                if (!current.includes(newTagInput.trim().toLowerCase())) {
                  updateSettings({
                    customTags: [...current, newTagInput.trim().toLowerCase()],
                  });
                }
                setNewTagInput('');
              }}
              className="flex items-center gap-2 pt-2 border-t-2 border-[#22408F]/15"
            >
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Nouveau tag..."
                className="flex-1 px-3 py-1.5 bg-white border-2 border-[#22408F]/30 rounded-lg text-xs text-[#22408F]"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="btn-riso-secondary py-1.5 px-3.5 text-xs"
              >
                Ajouter
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de prévisualisation « Ce qui va changer » */}
      <PlanDiffModal
        isOpen={isDiffModalOpen}
        diff={calculatedDiff}
        onConfirm={handleConfirmDiff}
        onCancel={() => setIsDiffModalOpen(false)}
      />
    </div>
  );
};
