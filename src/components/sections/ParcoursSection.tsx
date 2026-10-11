import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Phase, Task, Milestone, ProjectSettings, TaskStatus } from '../../types/project';
import {
  Check,
  Flag,
  X,
  Clock,
  ArrowRight,
  AlertTriangle,
  Pencil,
  Plus,
  MoreVertical,
  Trash2,
  Calendar,
} from 'lucide-react';
import {
  diffInDays,
  formatFrenchDate,
  formatISODate,
  getAssigneeInitials,
} from '../../utils/dateCalculations';
import { getPhaseColor } from '../../utils/theme';
import { isAiEnabled, suggestTasksForPhase, ProposedTask } from '../../ai/gemini';
import { buildGoogleCalendarUrl } from '../../utils/calendarLink';

interface PhaseDetailPanelProps {
  phase: Phase;
  phases: Phase[];
  tasks: Task[];
  settings: ProjectSettings;
  isCurrent: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  onRenamePhase: (phaseId: string, newName: string) => void;
  onUpdateObjective: (phaseId: string, newObjective: string) => void;
  onUpdateDeliverable: (phaseId: string, newDeliverable: string) => void;
  onDeletePhase: (phaseId: string) => void;
  deleteError: string | null;
  onNavigateToTasks: (phaseId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onSelectTask?: (task: Task) => void;
}

const PhaseDetailPanel: React.FC<PhaseDetailPanelProps> = ({
  phase,
  phases,
  tasks,
  settings,
  isCurrent,
  isMobile = false,
  onClose,
  onRenamePhase,
  onUpdateObjective,
  onUpdateDeliverable,
  onDeletePhase,
  deleteError,
  onNavigateToTasks,
  onUpdateTask,
  onAddTask,
  onSelectTask,
}) => {
  const phaseColor = getPhaseColor(phase, phases);
  const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);

  // AI Task suggestions
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);

  // Inline editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(phase.nom || phase.name || '');

  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState(
    phase.objectif || phase.objective || ''
  );

  const [isEditingDeliverable, setIsEditingDeliverable] = useState(false);
  const [deliverableDraft, setDeliverableDraft] = useState(
    phase.livrableAttendu || phase.deliverableSummary || ''
  );

  const [stepMenuOpen, setStepMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync draft when phase changes
  useEffect(() => {
    setNameDraft(phase.nom || phase.name || '');
    setObjectiveDraft(phase.objectif || phase.objective || '');
    setDeliverableDraft(phase.livrableAttendu || phase.deliverableSummary || '');
    setIsEditingName(false);
    setIsEditingObjective(false);
    setIsEditingDeliverable(false);
    setStepMenuOpen(false);
    setProposedTasks(null);
    setSelectedIndices(new Set());
    setAiError(null);
    setIsLoadingAi(false);
  }, [phase.id, phase.nom, phase.name, phase.objectif, phase.objective, phase.livrableAttendu, phase.deliverableSummary]);

  const handleRequestAiTasks = async () => {
    if (!isAiEnabled() || isLoadingAi) return;
    setIsLoadingAi(true);
    setAiError(null);

    const startDate = phase.debut || phase.calculatedStartDate || '';
    const endDate = phase.fin || phase.calculatedEndDate || '';
    const datesStr = startDate && endDate
      ? `Du ${formatFrenchDate(startDate, false)} au ${formatFrenchDate(endDate, false)}`
      : 'Dates non définies';

    const res = await suggestTasksForPhase({
      nomPhase: phase.nom || phase.name || 'Phase sans nom',
      objectif: phase.objectif || phase.objective || 'Non spécifié',
      livrableAttendu: phase.livrableAttendu || phase.deliverableSummary || 'Non spécifié',
      datesPhase: datesStr,
      briefProjet: (settings.brief || settings.description || '').slice(0, 300),
    });

    setIsLoadingAi(false);

    if (res.data && res.data.length > 0) {
      setProposedTasks(res.data);
      setSelectedIndices(new Set());
    } else {
      setAiError(res.error || 'Impossible de proposer des tâches pour le moment.');
      setTimeout(() => setAiError(null), 5000);
    }
  };

  const handleToggleTaskSelection = (idx: number) => {
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

  const handleAddSelectedTasks = () => {
    if (!proposedTasks) return;
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
    for (const idx of sortedIndices) {
      const pTask = proposedTasks[idx];
      if (pTask) {
        onAddTask({
          title: pTask.titre,
          phaseId: phase.id,
          assignee: settings.mode === 'groupe' && settings.team.length > 0 ? settings.team[0].name : 'Tous',
          deadline: phase.fin || phase.calculatedEndDate || settings.deadlineDate,
          durationMinutes: pTask.dureeMinutes,
          status: 'a_faire',
          source: 'ia',
          dependsOn: [],
        });
      }
    }
    setProposedTasks(null);
    setSelectedIndices(new Set());
  };

  // Click outside menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStepMenuOpen(false);
      }
    };
    if (stepMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [stepMenuOpen]);

  const handleSaveName = () => {
    if (nameDraft.trim()) {
      onRenamePhase(phase.id, nameDraft.trim());
    } else {
      setNameDraft(phase.nom || phase.name || '');
    }
    setIsEditingName(false);
  };

  const handleSaveObjective = () => {
    const val = objectiveDraft.trim();
    const isEx =
      !val ||
      val.toLowerCase() === 'objectifs de cette phase' ||
      val.toLowerCase() === 'objectif de cette étape' ||
      val.toLowerCase() === 'objectifs de cette étape';
    onUpdateObjective(phase.id, isEx ? '' : val);
    setIsEditingObjective(false);
  };

  const handleSaveDeliverable = () => {
    const val = deliverableDraft.trim();
    const isEx =
      !val ||
      val.toLowerCase() === 'livrable attendu' ||
      val.toLowerCase() === 'livrable attendu à cette étape';
    onUpdateDeliverable(phase.id, isEx ? '' : val);
    setIsEditingDeliverable(false);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="pb-3 border-b-2 border-[#22408F]/20 flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-[999px] shrink-0 border border-[#22408F]"
              style={{ backgroundColor: phaseColor.hex }}
            ></span>
            <span className="text-xs font-bold text-[#5A6A94] uppercase tracking-wider">
              Phase {phase.number || phases.findIndex((p) => p.id === phase.id) + 1} sur {phases.length}
            </span>
          </div>

          {/* Inline editable name */}
          {isEditingName ? (
            <input
              type="text"
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameDraft(phase.nom || phase.name || '');
                  setIsEditingName(false);
                }
              }}
              className="text-xl sm:text-2xl font-bold text-[#22408F] bg-white border-2 border-[#22408F] rounded px-2 py-0.5 w-full focus:outline-none"
            />
          ) : (
            <h3
              onClick={() => setIsEditingName(true)}
              className="text-xl sm:text-2xl font-bold text-[#22408F] tracking-tight font-heading cursor-pointer hover:underline hover:decoration-dashed decoration-[#22408F]/40 flex items-center gap-2 group truncate"
              title="Cliquer pour renommer"
            >
              <span className="truncate">{phase.nom || phase.name}</span>
              <Pencil className="w-3.5 h-3.5 text-[#5A6A94] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </h3>
          )}

          <p className="text-xs text-[#5A6A94] tabular-nums font-medium">
            Du {formatFrenchDate(phase.debut || phase.calculatedStartDate || '', false)} au{' '}
            {formatFrenchDate(phase.fin || phase.calculatedEndDate || '', false)}
            {phase.durationDays && ` (${phase.durationDays} jours)`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isCurrent && (
            <span className="px-2.5 py-0.5 bg-white border-2 border-[#22408F] rounded-[999px] text-[11px] font-bold text-[#22408F]">
              En cours
            </span>
          )}

          {/* Menu d'options de l'étape (Retirer) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setStepMenuOpen((v) => !v)}
              className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors cursor-pointer border border-transparent hover:border-[#22408F]/20"
              aria-label="Options de l'étape"
              title="Options de l'étape"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {stepMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border-2 border-[#22408F] rounded-[8px] shadow-[0_4px_0_#22408F] z-30 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setStepMenuOpen(false);
                    onDeletePhase(phase.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#F0505A] hover:bg-[#FFF0F0] flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Retirer cette étape</span>
                </button>
              </div>
            )}
          </div>

          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Message court en cas de refus de suppression */}
      {deleteError && (
        <div className="p-2.5 bg-[#FFF0F0] border-2 border-[#F0505A] rounded-[8px] text-[11px] font-bold text-[#F0505A] flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Objectif - fond pastel phase (Édition inline avec crayon) */}
      <div
        className="p-4 rounded-[8px] border border-[#DCE2EF] space-y-1.5 shadow-none"
        style={{ backgroundColor: phaseColor.bgLight }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#22408F] block">
            Objectif de cette étape
          </span>
          {!isEditingObjective && (
            <button
              type="button"
              onClick={() => setIsEditingObjective(true)}
              className="p-1 text-[#22408F]/70 hover:text-[#22408F] rounded hover:bg-white/60 transition-colors cursor-pointer"
              title="Modifier l'objectif"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingObjective ? (
          <div className="space-y-1.5 pt-1">
            <textarea
              autoFocus
              rows={2}
              value={objectiveDraft}
              onChange={(e) => setObjectiveDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveObjective();
                }
                if (e.key === 'Escape') {
                  setObjectiveDraft(phase.objectif || phase.objective || '');
                  setIsEditingObjective(false);
                }
              }}
              onBlur={handleSaveObjective}
              className="w-full p-2 bg-white border-2 border-[#22408F] rounded text-xs text-[#22408F] focus:outline-none resize-none font-medium"
              placeholder="Objectifs de cette phase"
            />
            <div className="text-[10px] text-[#5A6A94] font-medium">
              Entrée pour valider · Échap pour annuler
            </div>
          </div>
        ) : (
          <p
            className={`text-xs leading-relaxed ${
              phase.objectif || phase.objective
                ? 'text-[#22408F] font-medium'
                : 'text-[#5A6A94] italic font-normal'
            }`}
          >
            {phase.objectif || phase.objective || 'Objectifs de cette phase'}
          </p>
        )}
      </div>

      {/* Livrable - fond pastel phase (Édition inline avec crayon) */}
      <div
        className="p-4 rounded-[8px] border border-[#DCE2EF] space-y-1.5 shadow-none"
        style={{ backgroundColor: phaseColor.bgLight }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#22408F] block">
            Livrable attendu
          </span>
          {!isEditingDeliverable && (
            <button
              type="button"
              onClick={() => setIsEditingDeliverable(true)}
              className="p-1 text-[#22408F]/70 hover:text-[#22408F] rounded hover:bg-white/60 transition-colors cursor-pointer"
              title="Modifier le livrable attendu"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingDeliverable ? (
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              autoFocus
              value={deliverableDraft}
              onChange={(e) => setDeliverableDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveDeliverable();
                }
                if (e.key === 'Escape') {
                  setDeliverableDraft(phase.livrableAttendu || phase.deliverableSummary || '');
                  setIsEditingDeliverable(false);
                }
              }}
              onBlur={handleSaveDeliverable}
              className="w-full p-2 bg-white border-2 border-[#22408F] rounded text-xs text-[#22408F] focus:outline-none font-bold"
              placeholder="Livrable attendu"
            />
            <div className="text-[10px] text-[#5A6A94] font-medium">
              Entrée pour valider · Échap pour annuler
            </div>
          </div>
        ) : (
          <p
            className={`text-xs leading-relaxed ${
              phase.livrableAttendu || phase.deliverableSummary
                ? 'text-[#22408F] font-bold'
                : 'text-[#5A6A94] italic font-normal'
            }`}
          >
            {phase.livrableAttendu || phase.deliverableSummary || 'Livrable attendu'}
          </p>
        )}
      </div>

      {/* Tâches de l'étape avec lien « Modifier les tâches → » */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#22408F]">
              Tâches à accomplir
            </span>
            <span className="tabular-nums text-[#5A6A94] text-xs font-bold">
              {phaseTasks.filter((t) => t.status === 'fait').length}/{phaseTasks.length} faites
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAiEnabled() && (
              <button
                type="button"
                disabled={isLoadingAi}
                onClick={handleRequestAiTasks}
                className="btn-riso-secondary py-1 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isLoadingAi ? 'Gemini réfléchit…' : '✦ Proposer des tâches'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateToTasks(phase.id)}
              className="text-xs font-bold text-[#22408F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Modifier les tâches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message court en cas d'erreur IA */}
        {aiError && (
          <div className="p-2.5 bg-[#FFF0F0] border-2 border-[#F0505A] rounded-[8px] text-[11px] font-bold text-[#F0505A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Liste des propositions IA avec cases à cocher (décochées par défaut) */}
        {proposedTasks && proposedTasks.length > 0 && (
          <div className="p-3.5 bg-white border-2 border-[#22408F] rounded-[8px] shadow-[0_4px_0_#22408F] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE2EF]">
              <span className="text-xs font-bold text-[#22408F]">
                ✦ Tâches proposées par Gemini ({proposedTasks.length})
              </span>
              <span className="text-[11px] text-[#5A6A94] font-medium">
                {selectedIndices.size} sélectionnée{selectedIndices.size > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-1.5">
              {proposedTasks.map((pt, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleTaskSelection(idx)}
                    className={`p-2 rounded-[8px] border-2 border-[#22408F] flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#EBF1FF]' : 'bg-[#FBFAF6] hover:bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-[4px] border-2 border-[#22408F] flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-[#2F6DBB]' : 'bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#22408F] truncate">
                        {pt.titre}
                      </div>
                      <div className="text-[11px] text-[#5A6A94] font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#22408F]" />
                        <span>{pt.dureeMinutes} min</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={selectedIndices.size === 0}
                onClick={handleAddSelectedTasks}
                className="btn-riso-primary py-1.5 px-3.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter les tâches cochées
              </button>
              <button
                type="button"
                onClick={() => {
                  setProposedTasks(null);
                  setSelectedIndices(new Set());
                }}
                className="btn-riso-secondary py-1.5 px-3.5 text-xs font-bold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {phaseTasks.length === 0 ? (
            <div className="p-4 text-center text-[#5A6A94] bg-[#FBFAF6] border-2 border-[#22408F]/20 rounded-[8px]">
              Aucune tâche assignée à cette phase pour le moment.
            </div>
          ) : (
            phaseTasks.map((task) => {
              const isTaskDone = task.status === 'fait';

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-[8px] border-2 border-[#22408F] flex items-center gap-3 transition-colors ${
                    isTaskDone
                      ? 'bg-[#EAF6EE] text-[#5A6A94]'
                      : 'bg-white text-[#22408F]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTask(task.id, {
                        status: isTaskDone ? 'a_faire' : 'fait',
                      })
                    }
                    className="w-10 h-10 shrink-0 flex items-center justify-center cursor-pointer"
                    aria-label={isTaskDone ? 'Marquer à faire' : 'Marquer comme fait'}
                  >
                    <div
                      className={`w-6 h-6 rounded-[999px] border-2 border-[#22408F] flex items-center justify-center transition-all ${
                        isTaskDone
                          ? 'bg-[#2E8B4A] text-white'
                          : 'bg-white hover:bg-[#EBF1FF]'
                      }`}
                    >
                      {isTaskDone && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>

                  <div
                    className="flex-1 min-w-0 pr-1 cursor-pointer group/task"
                    onClick={() => onSelectTask?.(task)}
                    title="Modifier cette tâche"
                  >
                    <h4
                      className={`text-xs font-bold leading-snug truncate group-hover/task:underline ${
                        isTaskDone ? 'line-through text-[#5A6A94]' : 'text-[#22408F]'
                      }`}
                    >
                      {task.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-[#5A6A94] mt-1 tabular-nums font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#22408F]" />
                        {task.durationMinutes} min
                      </span>

                      {settings.mode === 'groupe' && task.assignee && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-[999px] bg-[#EBF1FF] border border-[#22408F] text-[#22408F] text-[9px] font-bold flex items-center justify-center">
                              {getAssigneeInitials(task.assignee)}
                            </span>
                            <span className="truncate max-w-[90px]">{task.assignee}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <a
                    href={buildGoogleCalendarUrl({
                      title: task.title,
                      durationMinutes: task.durationMinutes || 25,
                      date: task.deadline,
                      projectName: settings.name,
                      phaseName: phase.nom || phase.name,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ajouter à l'Agenda"
                    aria-label="Ajouter à l'Agenda"
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-[8px] border-2 border-[#22408F] bg-white text-[#22408F] shadow-[0_2px_0_#22408F] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#22408F] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskDetailPanelProps {
  task: Task;
  phases: Phase[];
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  phases,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [durationError, setDurationError] = useState<string | null>(null);

  const handleDurationChange = (val: number) => {
    if (isNaN(val) || val < 5 || val > 240) {
      setDurationError('La durée doit être comprise entre 5 et 240 minutes.');
    } else if (val % 5 !== 0) {
      setDurationError('La durée doit être un multiple de 5 minutes (ex: 25, 45, 60).');
    } else {
      setDurationError(null);
      onUpdate({ durationMinutes: val });
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-start justify-between pb-3 border-b-2 border-[#22408F]/20">
        <div>
          <span className="text-[11px] font-bold text-[#5A6A94] uppercase tracking-wider block">
            Édition de la tâche
          </span>
          <h3 className="text-base font-bold text-[#22408F] font-heading mt-0.5">
            {task.code ? `${task.code} · ` : ''}{task.title || 'Sans titre'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#5A6A94] hover:text-[#22408F] rounded-[8px]"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Titre */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#22408F] block">Titre</label>
        <input
          type="text"
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-3 py-2 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-medium text-[#22408F]"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#22408F] block">Description / Notes</label>
        <textarea
          value={(task as any).description || ''}
          onChange={(e) => onUpdate({ description: e.target.value } as any)}
          rows={3}
          placeholder="Détails, liens ou critères de réussite..."
          className="w-full px-3 py-2 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-medium text-[#22408F]"
        />
      </div>

      {/* Phase & Statut */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#22408F] block">Phase</label>
          <select
            value={task.phaseId}
            onChange={(e) => onUpdate({ phaseId: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-bold text-[#22408F]"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName || p.nom || p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#22408F] block">Statut</label>
          <select
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
            className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-bold text-[#22408F]"
          >
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="fait">Fait</option>
            <option value="bloque">Bloqué</option>
          </select>
        </div>
      </div>

      {/* Durée */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#22408F] block">Durée estimée (minutes)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={5}
            max={240}
            step={5}
            defaultValue={task.durationMinutes}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            className="w-24 px-2.5 py-1.5 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-mono font-bold text-center text-[#22408F]"
          />
          <span className="text-xs text-[#5A6A94] font-medium">min (5 à 240, multiple de 5)</span>
        </div>
        {durationError && (
          <span className="text-[11px] text-[#C4111C] font-bold block mt-1">
            {durationError}
          </span>
        )}
      </div>

      {/* Date prévue et Échéance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#22408F] block">Date prévue</label>
          <input
            type="date"
            value={(task as any).scheduledDate || ''}
            onChange={(e) => onUpdate({ scheduledDate: e.target.value } as any)}
            className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-mono font-bold text-[#22408F]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#22408F] block">Échéance</label>
          <input
            type="date"
            value={task.deadline || ''}
            onChange={(e) => onUpdate({ deadline: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border-2 border-[#22408F] rounded-[8px] text-xs font-mono font-bold text-[#22408F]"
          />
        </div>
      </div>

      {/* Bouton Supprimer */}
      <div className="pt-4 border-t-2 border-[#22408F]/20">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Supprimer cette tâche ?')) {
              onDelete(task.id);
            }
          }}
          className="w-full py-2.5 px-3 text-xs font-bold text-[#F0505A] hover:bg-[#FDEEEF] rounded-[8px] border-2 border-transparent hover:border-[#F0505A] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Supprimer cette tâche</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bottom sheet */}
      <div
        className="fixed inset-0 z-50 bg-[#22408F]/40 backdrop-blur-xs flex md:hidden items-end justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-lg rounded-t-[16px] border-t-2 border-x-2 border-[#22408F] shadow-[0_-4px_0_#22408F] max-h-[85vh] flex flex-col p-6 pb-28 sm:pb-8 overflow-y-auto animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-[#22408F]/30 rounded-[999px] mx-auto -mt-2 mb-3 shrink-0"></div>
          {content}
        </div>
      </div>

      {/* Desktop side drawer */}
      <div
        className="fixed inset-0 z-50 bg-[#22408F]/40 backdrop-blur-2xs hidden md:flex justify-end"
        onClick={onClose}
      >
        <div
          className="w-[420px] max-w-full h-full bg-white shadow-2xl p-7 border-l-2 border-[#22408F] overflow-y-auto animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    </>
  );
};

export const ParcoursSection: React.FC = () => {
  const {
    activeProject,
    addTask,
    updateTask,
    deleteTask,
    updatePhase,
    addPhase,
    deletePhase,
    setActiveTab,
    setTasksPhaseFilter,
  } = useProject();

  const { phases, tasks, milestones, settings } = activeProject;
  const todayISO = formatISODate(new Date());

  const currentPhaseRef = useRef<HTMLDivElement>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Échap ferme tout panneau ouvert
  useEffect(() => {
    const handleEscape = () => {
      setSelectedPhase(null);
      setSelectedTask(null);
    };
    window.addEventListener('studioplanner:escape', handleEscape);
    return () => window.removeEventListener('studioplanner:escape', handleEscape);
  }, []);

  // Determine current active phase:
  // Rule B.2 : En cours = contient la date du jour
  let currentPhaseIndex = phases.findIndex((p) => {
    if (p.calculatedStartDate && p.calculatedEndDate) {
      if (todayISO >= p.calculatedStartDate && todayISO <= p.calculatedEndDate) {
        return true;
      }
    }
    return false;
  });

  if (currentPhaseIndex === -1) {
    currentPhaseIndex = phases.findIndex((p) => {
      const phaseTasks = tasks.filter((t) => t.phaseId === p.id);
      return phaseTasks.some((t) => t.status !== 'fait');
    });
  }

  if (currentPhaseIndex === -1) {
    currentPhaseIndex = Math.max(0, phases.length - 1);
  }

  const currentPhase = phases[currentPhaseIndex] || phases[0];

  // Auto-scroll to current phase on load
  useEffect(() => {
    if (currentPhaseRef.current) {
      const timer = setTimeout(() => {
        currentPhaseRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Global project progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'fait').length;
  const globalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Days remaining before final deadline
  const daysRemaining = diffInDays(todayISO, settings.deadlineDate);
  const jBadge = daysRemaining >= 0 ? `J-${daysRemaining}` : `J+${Math.abs(daysRemaining)}`;

  // Find the final milestone (J-0 or latest)
  const finalMilestone =
    milestones.find((m) => m.daysBeforeDeadline === 0) ||
    milestones[milestones.length - 1];

  // Alternating lateral offsets for the winding path
  const offsets = [-28, 32, -36, 28, -24, 0];

  const activeDetailPhase =
    phases.find((p) => p.id === (selectedPhase?.id || currentPhase?.id)) ||
    currentPhase ||
    phases[0];

  // Helper pour vérifier si un objectif est hors des dates de sa phase
  const isMilestoneOutOfPhase = (m: Milestone, ph: Phase) => {
    if (!m.calculatedDate || !ph.calculatedStartDate || !ph.calculatedEndDate) return false;
    return m.calculatedDate < ph.calculatedStartDate || m.calculatedDate > ph.calculatedEndDate;
  };

  const handleRenamePhase = (phaseId: string, newName: string) => {
    updatePhase(phaseId, { nom: newName });
  };

  const handleUpdateObjective = (phaseId: string, newObjective: string) => {
    updatePhase(phaseId, { objectif: newObjective });
  };

  const handleUpdateDeliverable = (phaseId: string, newDeliverable: string) => {
    updatePhase(phaseId, { livrableAttendu: newDeliverable });
  };

  const handleDeletePhase = (phaseId: string) => {
    const res = deletePhase(phaseId);
    if (!res.success) {
      setDeleteError(res.reason || 'Impossible de supprimer cette étape.');
      setTimeout(() => setDeleteError(null), 4000);
    } else {
      setDeleteError(null);
      if (selectedPhase?.id === phaseId) {
        const remaining = phases.filter((p) => p.id !== phaseId);
        setSelectedPhase(remaining[0] || null);
      }
    }
  };

  const handleNavigateToTasks = (phaseId: string) => {
    setTasksPhaseFilter(phaseId);
    setActiveTab('checklist');
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE VIEW (< 768px)                                      */}
      {/* ============================================================ */}
      <div className="block md:hidden max-w-md mx-auto py-2 px-1 space-y-6 animate-in fade-in duration-200">
        {/* En haut de l'écran : Progression globale */}
        <div className="sticky top-14 z-20 bg-[#FBFAF6]/95 backdrop-blur-md py-2 px-1 space-y-2 border-b-2 border-[#22408F]/20">
          <div className="flex items-center justify-between text-xs font-bold text-[#22408F]">
            <span>
              Étape {currentPhaseIndex + 1} sur {phases.length} · {currentPhase?.shortName || currentPhase?.nom || currentPhase?.name}
            </span>
            <span className="tabular-nums">
              {globalProgress}% accompli
            </span>
          </div>

          {/* Thin progress bar */}
          <div className="w-full bg-white border-2 border-[#22408F] rounded-[999px] h-2.5 overflow-hidden p-0.5">
            <div
              className="h-full bg-[#22408F] rounded-[999px] transition-all duration-500 ease-out"
              style={{ width: `${globalProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Le chemin serpentant et les objectifs */}
        <div className="relative py-6 flex flex-col items-center">
          {phases.map((phase, idx) => {
            const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
            const doneTasks = phaseTasks.filter((t) => t.status === 'fait');
            const remainingTasksCount = phaseTasks.length - doneTasks.length;

            const isDone =
              phaseTasks.length > 0 &&
              doneTasks.length === phaseTasks.length &&
              phase.calculatedEndDate &&
              todayISO > phase.calculatedEndDate;
            const isCurrent = idx === currentPhaseIndex;

            const colorInfo = getPhaseColor(phase, phases);
            const isYellow = colorInfo.key === 'yellow';
            const offsetX = offsets[idx % offsets.length];

            const phaseMilestones = milestones.filter(
              (m) => m.phaseId === phase.id && m.daysBeforeDeadline !== 0
            );

            return (
              <React.Fragment key={phase.id}>
                {/* Connector Segment to next phase - Encre #22408F */}
                {idx > 0 && (
                  <div className="w-1 h-12 sm:h-14 flex items-center justify-center my-0.5 relative">
                    <div
                      className={`w-1 h-full ${
                        isDone
                          ? 'bg-[#22408F]'
                          : 'border-l-2 border-dashed border-[#22408F]'
                      }`}
                    ></div>
                  </div>
                )}

                {/* Milestones placed along the path */}
                {phaseMilestones.map((m) => {
                  const outOfBounds = isMilestoneOutOfPhase(m, phase);
                  return (
                    <div
                      key={m.id}
                      className="my-1.5 flex items-center gap-2 select-none z-10"
                      style={{ transform: `translateX(${offsetX * 0.4}px)` }}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-[#22408F] shadow-[0_2px_0_#22408F] rounded-[999px] text-xs font-bold text-[#22408F]">
                        <Flag className="w-3.5 h-3.5 text-[#22408F]" />
                        <span className="truncate max-w-[170px]">{m.title}</span>
                        {outOfBounds && (
                          <span
                            className="w-2 h-2 rounded-[999px] bg-[#F0505A] border border-[#22408F]"
                            title="Objectif placé hors des dates de sa phase"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Phase Node Container with horizontal offset */}
                <div
                  ref={isCurrent ? currentPhaseRef : null}
                  style={{ transform: `translateX(${offsetX}px)` }}
                  className="relative flex items-center my-1 select-none transition-transform"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPhase(phase)}
                    className={`relative flex items-center justify-center rounded-[999px] border-2 border-[#22408F] transition-all cursor-pointer focus:outline-none ${
                      isCurrent
                        ? 'w-16 h-16 sm:w-18 sm:h-18 shadow-[0_4px_0_#22408F] ring-4 ring-[#22408F]/20'
                        : 'w-12 h-12 shadow-[0_2px_0_#22408F]'
                    }`}
                    style={{
                      backgroundColor: colorInfo.hex,
                    }}
                    aria-label={`Phase ${phase.number || idx + 1} : ${phase.nom || phase.name}`}
                  >
                    {isDone ? (
                      <Check
                        className={`w-6 h-6 stroke-[3] ${
                          isYellow ? 'text-[#22408F]' : 'text-white'
                        }`}
                      />
                    ) : (
                      <span
                        className={`font-heading ${
                          isCurrent ? 'text-xl' : 'text-base'
                        } font-bold tracking-tight ${
                          isYellow ? 'text-[#22408F]' : 'text-white'
                        }`}
                      >
                        {phase.number || idx + 1}
                      </span>
                    )}
                  </button>

                  <div
                    onClick={() => setSelectedPhase(phase)}
                    className={`cursor-pointer whitespace-nowrap pl-3.5 pr-2 py-1 text-left ${
                      offsetX > 0
                        ? 'order-first pr-3.5 pl-0 text-right'
                        : 'order-last'
                    }`}
                  >
                    <div
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-[#22408F] text-sm'
                          : isDone
                          ? 'text-[#22408F]'
                          : 'text-[#5A6A94]'
                      }`}
                    >
                      {phase.nom || phase.shortName || phase.name}
                    </div>

                    {isCurrent ? (
                      <div className="text-[11px] font-bold text-[#F2661F] mt-0.5">
                        {phaseTasks.length === 0
                          ? 'aucune tâche'
                          : remainingTasksCount > 0
                          ? `${remainingTasksCount} tâche${
                              remainingTasksCount > 1 ? 's' : ''
                            } restante${remainingTasksCount > 1 ? 's' : ''}`
                          : 'Toutes les tâches faites !'}
                      </div>
                    ) : isDone ? (
                      <div className="text-[11px] text-[#2E8B4A] font-bold mt-0.5">
                        Validée ✓
                      </div>
                    ) : null}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Bouton + Ajouter une étape en fin de parcours */}
          <div className="my-5 flex flex-col items-center">
            <div className="w-1 h-6 border-l-2 border-dashed border-[#22408F]"></div>
            <button
              type="button"
              onClick={() => addPhase()}
              className="btn-riso-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 shadow-[0_2px_0_#22408F] hover:translate-y-[-1px] transition-all cursor-pointer font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajouter une étape</span>
            </button>
          </div>

          {/* Final Submission Flag */}
          {finalMilestone && (
            <div className="mt-4 pt-2 flex flex-col items-center space-y-2">
              <div className="w-1 h-6 border-l-2 border-dashed border-[#22408F]"></div>
              <div
                onClick={() => setSelectedPhase(phases[phases.length - 1])}
                className="riso-card px-5 py-2.5 flex items-center gap-3 cursor-pointer hover:translate-y-[-1px] transition-all"
              >
                <div className="w-8 h-8 rounded-[8px] bg-[#7A4A9E] text-white flex items-center justify-center border-2 border-[#22408F]">
                  <Flag className="w-4 h-4 fill-white text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A94] block">
                    Rendu final ({jBadge})
                  </span>
                  <span className="font-bold text-xs text-[#22408F]">
                    {finalMilestone.title}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sheet Mobile : Détail d'une phase */}
        {selectedPhase && (
          <div
            className="fixed inset-0 z-50 bg-[#22408F]/40 backdrop-blur-xs flex items-end justify-center"
            onClick={() => setSelectedPhase(null)}
          >
            <div
              className="bg-white w-full max-w-lg rounded-t-[16px] border-t-2 border-x-2 border-[#22408F] shadow-[0_-4px_0_#22408F] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-[#22408F]/30 rounded-[999px] mx-auto mt-3 shrink-0"></div>

              <div className="p-6 overflow-y-auto pb-28 sm:pb-8 flex-1">
                <PhaseDetailPanel
                  phase={selectedPhase}
                  phases={phases}
                  tasks={tasks}
                  settings={settings}
                  isCurrent={selectedPhase.id === currentPhase?.id}
                  isMobile={true}
                  onClose={() => setSelectedPhase(null)}
                  onRenamePhase={handleRenamePhase}
                  onUpdateObjective={handleUpdateObjective}
                  onUpdateDeliverable={handleUpdateDeliverable}
                  onDeletePhase={handleDeletePhase}
                  deleteError={deleteError}
                  onNavigateToTasks={handleNavigateToTasks}
                  onUpdateTask={updateTask}
                  onAddTask={addTask}
                  onSelectTask={setSelectedTask}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. VUE DESKTOP (>= 768px)                                     */}
      {/* ============================================================ */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-4 px-2 space-y-6 animate-in fade-in duration-200">
        {/* Top Header Row */}
        <div className="flex items-center justify-end border-b-2 border-[#22408F] pb-4">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs font-bold text-[#22408F] block">
                Étape {currentPhaseIndex + 1} sur {phases.length}
              </span>
              <span className="text-[11px] tabular-nums font-medium text-[#5A6A94]">
                {globalProgress}% de tâches faites
              </span>
            </div>

            <div className="w-32 bg-white border-2 border-[#22408F] rounded-[999px] h-3 p-0.5 overflow-hidden">
              <div
                className="h-full bg-[#22408F] rounded-[999px] transition-all duration-500 ease-out"
                style={{ width: `${globalProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 2 Colonnes : Chemin interactif (Gauche ~45%) / Panneau détail (Droite ~55%) */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Colonne Gauche : Chemin Duolingo */}
          <div className="col-span-12 md:col-span-5 flex flex-col items-center py-6">
            {phases.map((phase, idx) => {
              const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
              const doneTasks = phaseTasks.filter((t) => t.status === 'fait');
              const remainingTasksCount = phaseTasks.length - doneTasks.length;
              const isDone =
                phaseTasks.length > 0 &&
                doneTasks.length === phaseTasks.length &&
                phase.calculatedEndDate &&
                todayISO > phase.calculatedEndDate;
              const isCurrent = idx === currentPhaseIndex;
              const isSelected = activeDetailPhase.id === phase.id;

              const colorInfo = getPhaseColor(phase, phases);
              const isYellow = colorInfo.key === 'yellow';
              const offsetX = offsets[idx % offsets.length];

              const phaseMilestones = milestones.filter(
                (m) => m.phaseId === phase.id && m.daysBeforeDeadline !== 0
              );

              return (
                <React.Fragment key={phase.id}>
                  {idx > 0 && (
                    <div className="w-1 h-12 flex items-center justify-center my-0.5 relative">
                      <div
                        className={`w-1 h-full ${
                          isDone
                            ? 'bg-[#22408F]'
                            : 'border-l-2 border-dashed border-[#22408F]'
                        }`}
                      ></div>
                    </div>
                  )}

                  {/* Objectifs de la phase */}
                  {phaseMilestones.map((m) => {
                    const outOfBounds = isMilestoneOutOfPhase(m, phase);
                    return (
                      <div
                        key={m.id}
                        className="my-1.5 flex items-center gap-2 select-none z-10"
                        style={{ transform: `translateX(${offsetX * 0.4}px)` }}
                      >
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-[#22408F] shadow-[0_2px_0_#22408F] rounded-[999px] text-xs font-bold text-[#22408F]">
                          <Flag className="w-3.5 h-3.5 text-[#22408F]" />
                          <span className="truncate max-w-[170px]">{m.title}</span>
                          {outOfBounds && (
                            <span
                              className="w-2 h-2 rounded-[999px] bg-[#F0505A] border border-[#22408F]"
                              title="Objectif placé hors des dates de sa phase"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    style={{ transform: `translateX(${offsetX}px)` }}
                    className="relative flex items-center my-1 select-none transition-transform"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPhase(phase)}
                      className={`relative flex items-center justify-center rounded-[999px] border-2 border-[#22408F] transition-all cursor-pointer focus:outline-none ${
                        isSelected
                          ? 'w-16 h-16 shadow-[0_4px_0_#22408F] ring-4 ring-[#22408F]/30 scale-105'
                          : isCurrent
                          ? 'w-16 h-16 shadow-[0_4px_0_#22408F] ring-2 ring-[#22408F]/20'
                          : 'w-12 h-12 shadow-[0_2px_0_#22408F]'
                      }`}
                      style={{
                        backgroundColor: colorInfo.hex,
                      }}
                      aria-label={`Étape ${phase.number || idx + 1} : ${phase.nom || phase.name}`}
                    >
                      {isDone ? (
                        <Check
                          className={`w-6 h-6 stroke-[3] ${
                            isYellow ? 'text-[#22408F]' : 'text-white'
                          }`}
                        />
                      ) : (
                        <span
                          className={`font-heading ${
                            isSelected || isCurrent ? 'text-xl' : 'text-base'
                          } font-bold tracking-tight ${
                            isYellow ? 'text-[#22408F]' : 'text-white'
                          }`}
                        >
                          {phase.number || idx + 1}
                        </span>
                      )}
                    </button>

                    <div
                      onClick={() => setSelectedPhase(phase)}
                      className={`cursor-pointer whitespace-nowrap pl-3.5 pr-2 py-1 text-left ${
                        offsetX > 0 ? 'order-first pr-3.5 pl-0 text-right' : 'order-last'
                      }`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          isSelected || isCurrent
                            ? 'text-[#22408F] text-sm'
                            : isDone
                            ? 'text-[#22408F]'
                            : 'text-[#5A6A94]'
                        }`}
                      >
                        {phase.nom || phase.shortName || phase.name}
                      </div>

                      {isCurrent ? (
                        <div className="text-[11px] font-bold text-[#F2661F] mt-0.5">
                          {phaseTasks.length === 0
                            ? 'aucune tâche'
                            : remainingTasksCount > 0
                            ? `${remainingTasksCount} tâche${
                                remainingTasksCount > 1 ? 's' : ''
                              } restante${remainingTasksCount > 1 ? 's' : ''}`
                            : 'Toutes les tâches faites !'}
                        </div>
                      ) : isDone ? (
                        <div className="text-[11px] text-[#2E8B4A] font-bold mt-0.5">
                          Validée ✓
                        </div>
                      ) : null}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Bouton + Ajouter une étape en fin de parcours */}
            <div className="my-5 flex flex-col items-center">
              <div className="w-1 h-8 border-l-2 border-dashed border-[#22408F]"></div>
              <button
                type="button"
                onClick={() => addPhase()}
                className="btn-riso-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 shadow-[0_2px_0_#22408F] hover:translate-y-[-1px] transition-all cursor-pointer font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajouter une étape</span>
              </button>
            </div>

            {/* Rendu final */}
            {finalMilestone && (
              <div className="mt-4 pt-2 flex flex-col items-center space-y-2">
                <div className="w-1 h-6 border-l-2 border-dashed border-[#22408F]"></div>
                <div
                  onClick={() => setSelectedPhase(phases[phases.length - 1])}
                  className="riso-card px-5 py-2.5 flex items-center gap-3 cursor-pointer hover:translate-y-[-1px] transition-all"
                >
                  <div className="w-8 h-8 rounded-[8px] bg-[#7A4A9E] text-white flex items-center justify-center border-2 border-[#22408F]">
                    <Flag className="w-4 h-4 fill-white text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A94] block">
                      Rendu final ({jBadge})
                    </span>
                    <span className="font-bold text-xs text-[#22408F]">
                      {finalMilestone.title}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne Droite : Carte de détail */}
          <div className="col-span-12 md:col-span-7 sticky top-20 riso-card p-7 space-y-6">
            <PhaseDetailPanel
              phase={activeDetailPhase}
              phases={phases}
              tasks={tasks}
              settings={settings}
              isCurrent={activeDetailPhase.id === currentPhase?.id}
              isMobile={false}
              onRenamePhase={handleRenamePhase}
              onUpdateObjective={handleUpdateObjective}
              onUpdateDeliverable={handleUpdateDeliverable}
              onDeletePhase={handleDeletePhase}
              deleteError={deleteError}
              onNavigateToTasks={handleNavigateToTasks}
              onUpdateTask={updateTask}
              onAddTask={addTask}
              onSelectTask={setSelectedTask}
            />
          </div>
        </div>
      </div>

      {/* Panneau d'édition de la tâche sélectionnée (Mobile bottom sheet + Desktop drawer) */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          phases={phases}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => updateTask(selectedTask.id, updates)}
          onDelete={(taskId) => {
            deleteTask(taskId);
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
};
