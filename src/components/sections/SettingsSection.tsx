import React, { useState, useEffect, useRef } from 'react';
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
  HardDrive,
  Download,
  Upload,
} from 'lucide-react';
import {
  formatFrenchDateLocal,
  getDayName,
  getDaysDifference,
} from '../../utils/localDate';
import { formatISODate } from '../../utils/dateCalculations';
import {
  calculatePlanDiff,
  calculatePhaseDates,
} from '../../utils/planGenerator';
import { PlanDiffModal } from '../modals/PlanDiffModal';
import { ImportProjectsModal } from '../modals/ImportProjectsModal';
import { extractProjectsListFromJSON, RawProjectInput } from '../../utils/projectImporter';
import { RISO_PROJECT_COLORS } from '../../utils/theme';
import { getAiDailyUsage, setAiEnabled } from '../../ai/gemini';

export const SettingsSection: React.FC = () => {
  const {
    projects,
    activeProject,
    updateSettings,
    applyPlanDiffToActiveProject,
    importProjectsList,
  } = useProject();
  const { settings, phases, sessions } = activeProject;

  const [pendingProjectsToImport, setPendingProjectsToImport] = useState<RawProjectInput[] | null>(null);

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

  // Réglages IA
  const [aiUsage, setAiUsage] = useState(getAiDailyUsage());

  const handleToggleAi = () => {
    const next = !aiUsage.enabled;
    setAiEnabled(next);
    setAiUsage(getAiDailyUsage());
  };

  // Export et Import pour Google Drive
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportForDrive = () => {
    setImportError(null);
    const todayISO = formatISODate(new Date());

    // 1. JSON backup : tout le contenu de localStorage préfixé studioplanner_
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('studioplanner_')) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            backupData[key] = JSON.parse(raw);
          } catch {
            backupData[key] = raw;
          }
        }
      }
    }
    const jsonString = JSON.stringify(backupData, null, 2);

    // 2. Markdown état des projets
    const projectsMd = projects
      .map((p) => {
        let currentPhase = p.phases.find((ph) => {
          if (ph.calculatedStartDate && ph.calculatedEndDate) {
            return todayISO >= ph.calculatedStartDate && todayISO <= ph.calculatedEndDate;
          }
          return false;
        });
        if (!currentPhase) {
          currentPhase = p.phases.find((ph) => {
            const phTasks = (p.tasks || []).filter((t) => t.phaseId === ph.id);
            return phTasks.some((t) => t.status !== 'fait');
          });
        }
        if (!currentPhase) {
          currentPhase = p.phases[p.phases.length - 1] || p.phases[0];
        }
        const phaseName = currentPhase?.nom || currentPhase?.name || 'Non spécifiée';

        const currentDeliverable = (p.deliverables || []).find(
          (d) => d.phaseId === currentPhase?.id && d.status !== 'valide'
        );
        const livrable =
          currentDeliverable?.title ||
          currentPhase?.livrableAttendu ||
          currentPhase?.deliverableSummary ||
          'Non spécifié';

        const pendingTasks = (p.tasks || []).filter((t) => t.status !== 'fait').slice(0, 5);
        const tasksLines =
          pendingTasks.length > 0
            ? pendingTasks
                .map(
                  (t, idx) =>
                    `${idx + 1}. ${t.title} (${t.durationMinutes} min${
                      t.deadline ? ` — échéance : ${t.deadline}` : ''
                    })`
                )
                .join('\n')
            : '_Aucune tâche non faite_';

        const traces = [...(p.logbook || [])].reverse().slice(0, 5);
        const tracesLines =
          traces.length > 0
            ? traces
                .map((tr, idx) => {
                  const detail =
                    tr.observed || tr.whatWeNoticed || tr.whatWeDid || tr.done || '';
                  return `${idx + 1}. [${tr.date || ''}] ${tr.title || 'Sans titre'}${
                    detail ? ` : ${detail}` : ''
                  }`;
                })
                .join('\n')
            : '_Aucune trace enregistrée_';

        const nextStep =
          localStorage.getItem(`studioplanner_next_step_${p.id}`) ||
          (p.id === activeProject.id
            ? localStorage.getItem('studioplanner_next_step')
            : null) ||
          (p.logbook?.slice().reverse().find((t) => (t as Record<string, any>).nextStep) as Record<string, any> | undefined)?.nextStep ||
          p.logbook?.slice().reverse().find((t) => t.decided || t.whatWeDecided)?.decided ||
          p.logbook?.slice().reverse().find((t) => t.whatWeDecided)?.whatWeDecided ||
          'Non définie';

        return `## Projet : ${p.settings.name || 'Sans titre'}
- **Phase en cours :** ${phaseName}
- **Livrable attendu :** ${livrable}
- **Échéance :** ${p.settings.deadlineDate || 'Non définie'}
- **Prochaine petite étape :** ${nextStep}

### 5 prochaines tâches non faites
${tasksLines}

### 5 dernières traces du journal
${tracesLines}
`;
      })
      .join('\n---\n\n');

    const mdString = `# StudioPlanner — État des projets (${todayISO})

${projectsMd}
`;

    const downloadBlob = (filename: string, content: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    downloadBlob(`StudioPlanner-sauvegarde-${todayISO}.json`, jsonString, 'application/json');
    setTimeout(() => {
      downloadBlob(
        `StudioPlanner-etat-${todayISO}.md`,
        mdString,
        'text/markdown;charset=utf-8'
      );
    }, 150);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // 1. Détection d'une liste "projets"
        const projectsList = extractProjectsListFromJSON(parsed);
        if (projectsList && projectsList.length > 0) {
          setPendingProjectsToImport(projectsList);
          return;
        }

        // 2. Détection d'une sauvegarde complète du localStorage
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setImportError('Fichier invalide : format de sauvegarde non reconnu.');
          return;
        }

        const keys = Object.keys(parsed).filter((k) => k.startsWith('studioplanner_'));
        if (keys.length === 0) {
          setImportError('Fichier invalide : aucune donnée StudioPlanner trouvée.');
          return;
        }

        const confirmed = window.confirm('Remplacer toutes les données actuelles ?');
        if (confirmed) {
          keys.forEach((k) => {
            const val = parsed[k];
            const toStore = typeof val === 'string' ? val : JSON.stringify(val);
            localStorage.setItem(k, toStore);
          });
          window.location.reload();
        }
      } catch {
        setImportError('Fichier invalide : impossible de lire le fichier JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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

              {/* Couleur du projet */}
              <div>
                <label className="block font-bold text-[#22408F] mb-1.5 font-heading">
                  Couleur du projet
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {RISO_PROJECT_COLORS.map((c) => {
                    const isSelected = (settings.color || '#2F6DBB') === c.hex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateSettings({ color: c.hex })}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-[#22408F] shadow-[0_2px_0_#22408F] scale-110'
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

          {/* Section IA */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
                <Sparkles className="w-4 h-4 text-[#2F6DBB]" />
                IA
              </h3>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-bold text-[#22408F]">
                Activer l'aide de Gemini
              </span>
              <button
                type="button"
                onClick={handleToggleAi}
                className={`px-3 py-1.5 rounded-[999px] text-xs font-bold border-2 transition-all cursor-pointer ${
                  aiUsage.enabled
                    ? 'bg-[#2E8B4A] text-white border-[#22408F] shadow-[0_2px_0_#22408F]'
                    : 'bg-[#FBFAF6] text-[#5A6A94] border-[#22408F]/40'
                }`}
              >
                {aiUsage.enabled ? 'Activé' : 'Désactivé'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#FBFAF6] border border-[#DCE2EF] rounded-xl text-xs">
              <span className="text-[#5A6A94] font-medium">Compteur :</span>
              <span className="font-bold text-[#22408F] tabular-nums font-mono">
                {aiUsage.count} appel{aiUsage.count > 1 ? 's' : ''} aujourd'hui sur 30
              </span>
            </div>
          </div>

          {/* Bloc Données */}
          <div className="bg-white border-2 border-[#22408F] rounded-2xl p-5 shadow-[0_4px_0_#22408F] space-y-4">
            <h3 className="font-bold text-sm text-[#22408F] flex items-center gap-2 font-heading">
              <HardDrive className="w-4 h-4 text-[#22408F]" />
              Données
            </h3>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleExportForDrive}
                  className="btn-riso-secondary flex-1 py-2 px-3 text-xs justify-center flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter pour Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-riso-secondary flex-1 py-2 px-3 text-xs justify-center flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer une sauvegarde</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </div>

              {importError && (
                <div className="p-2.5 bg-[#FDEEEF] border border-[#22408F] rounded-[8px] text-xs text-[#C4111C]">
                  {importError}
                </div>
              )}

              <p className="text-xs text-[#5A6A94]">
                Dépose ces fichiers dans ton dossier Drive StudioPlanner.
              </p>
            </div>
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

      {/* Modal d'import d'une liste de projets */}
      <ImportProjectsModal
        isOpen={!!pendingProjectsToImport}
        rawProjects={pendingProjectsToImport || []}
        onClose={() => setPendingProjectsToImport(null)}
        onConfirmImport={(selected) => {
          importProjectsList(selected);
          setPendingProjectsToImport(null);
        }}
      />
    </div>
  );
};
