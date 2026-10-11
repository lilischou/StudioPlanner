import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task, TaskStatus } from '../../types/project';
import {
  CheckSquare,
  Plus,
  Trash2,
  GitBranch,
  AlertTriangle,
  Clock,
  User,
  Filter,
  Search,
  Sparkles,
  Link as LinkIcon,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  formatFrenchDate,
  formatISODate,
  diffInDays,
  formatHours,
  getTaskRowHighlight,
} from '../../utils/dateCalculations';
import { PHASE_COLORS } from '../../utils/theme';

interface ChecklistSectionProps {
  isInsideModal?: boolean;
  onOpenDetailedView?: () => void;
}

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  isInsideModal = false,
  onOpenDetailedView,
}) => {
  const {
    activeProject,
    addTask,
    updateTask,
    deleteTask,
    addDependency,
    removeDependency,
    autoFixSuccessorDeadlines,
    dependencyAlerts,
    setActiveTab,
    tasksPhaseFilter,
    setTasksPhaseFilter,
  } = useProject();

  const { tasks, settings, phases } = activeProject;
  const todayISO = formatISODate(new Date());

  // Segmented control mode for standalone view: 'essentiel' (default) or 'tout'
  const [checklistMode, setChecklistMode] = useState<'essentiel' | 'tout'>(() => {
    try {
      const saved = localStorage.getItem('studioplanner_checklist_mode');
      if (saved === 'tout' || saved === 'essentiel') return saved;
    } catch {}
    return 'essentiel';
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isDoneExpanded, setIsDoneExpanded] = useState<boolean>(false);

  const handleModeSelect = (mode: 'essentiel' | 'tout') => {
    setChecklistMode(mode);
    try {
      localStorage.setItem('studioplanner_checklist_mode', mode);
    } catch {}
    if (mode === 'tout') {
      onOpenDetailedView?.();
    }
  };

  // View mode: 'table' (checklist standard) or 'graph' (graphe des dépendances intégré)
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [activeGraphTaskId, setActiveGraphTaskId] = useState<string>(tasks[0]?.id || '');
  const [selectedPredToAdd, setSelectedPredToAdd] = useState<string>('');
  const [selectedSuccToAdd, setSelectedSuccToAdd] = useState<string>('');

  // Row edition state: reading mode by default
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPhase, setFilterPhase] = useState(() => tasksPhaseFilter || 'all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  React.useEffect(() => {
    if (tasksPhaseFilter) {
      setFilterPhase(tasksPhaseFilter);
    }
  }, [tasksPhaseFilter]);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newPhaseId, setNewPhaseId] = useState(phases[0]?.id || 'p1');
  const [newAssignee, setNewAssignee] = useState(settings.team[0]?.name || 'Tous');
  const [newDeadline, setNewDeadline] = useState(
    phases[0]?.calculatedEndDate || todayISO
  );
  const [newDuration, setNewDuration] = useState(60);
  const [newPredecessorId, setNewPredecessorId] = useState('');
  const [durationError, setDurationError] = useState<string | null>(null);
  const [rowDurationErrors, setRowDurationErrors] = useState<Record<string, string>>({});

  // Escape shortcut to close editing
  useEffect(() => {
    const handleEscape = () => {
      setEditingTaskId(null);
    };
    window.addEventListener('studioplanner:escape', handleEscape);
    return () => window.removeEventListener('studioplanner:escape', handleEscape);
  }, []);

  // Handle new task submission
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    setDurationError(null);
    if (!newTitle.trim()) return;

    if (isNaN(newDuration) || newDuration < 5 || newDuration > 240) {
      setDurationError('La durée doit être comprise entre 5 et 240 minutes.');
      return;
    }
    if (newDuration % 5 !== 0) {
      setDurationError('La durée doit être un multiple de 5 minutes (ex: 25, 45, 60).');
      return;
    }

    addTask({
      title: newTitle.trim(),
      phaseId: newPhaseId,
      assignee: newAssignee,
      deadline: newDeadline,
      durationMinutes: newDuration,
      status: 'a_faire',
      dependsOn: newPredecessorId ? [newPredecessorId] : [],
    });

    setNewTitle('');
    setNewPredecessorId('');
    setDurationError(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCode = (t.code || '').toLowerCase().includes(q);
      const matchAssignee = t.assignee.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchAssignee) return false;
    }

    if (filterPhase !== 'all' && t.phaseId !== filterPhase) return false;
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;

    if (filterStatus !== 'all') {
      const highlight = getTaskRowHighlight(t, todayISO);
      if (filterStatus === 'overdue' && highlight !== 'overdue') return false;
      if (filterStatus === 'warning' && highlight !== 'warning') return false;
      if (filterStatus === 'completed' && highlight !== 'completed') return false;
      if (filterStatus === 'pending' && t.status === 'fait') return false;
    }

    return true;
  });

  const openGraphForTask = (taskId: string) => {
    setActiveGraphTaskId(taskId);
    setViewMode('graph');
  };

  // Dependency graph helpers
  const currentGraphTask = tasks.find((t) => t.id === activeGraphTaskId) || tasks[0];
  const predecessors = currentGraphTask?.dependsOn
    ? tasks.filter((t) => currentGraphTask.dependsOn.includes(t.id))
    : [];
  const successors = currentGraphTask
    ? tasks.filter((t) => t.dependsOn?.includes(currentGraphTask.id))
    : [];
  const availablePreds = currentGraphTask
    ? tasks.filter((t) => t.id !== currentGraphTask.id && !currentGraphTask.dependsOn?.includes(t.id))
    : [];
  const availableSuccs = currentGraphTask
    ? tasks.filter((t) => t.id !== currentGraphTask.id && !t.dependsOn?.includes(currentGraphTask.id))
    : [];

  const handleAddPredecessor = () => {
    if (!selectedPredToAdd || !currentGraphTask) return;
    addDependency(currentGraphTask.id, selectedPredToAdd);
    setSelectedPredToAdd('');
  };

  const handleAddSuccessor = () => {
    if (!selectedSuccToAdd || !currentGraphTask) return;
    addDependency(selectedSuccToAdd, currentGraphTask.id);
    setSelectedSuccToAdd('');
  };

  // Phase active
  const currentPhase =
    phases.find((p) => {
      if (p.calculatedStartDate && p.calculatedEndDate) {
        return todayISO >= p.calculatedStartDate && todayISO <= p.calculatedEndDate;
      }
      return false;
    }) ||
    phases.find((p) => p.calculatedEndDate && todayISO <= p.calculatedEndDate) ||
    phases[0];

  const pendingTasks = tasks.filter((t) => t.status !== 'fait');
  const doneTasks = tasks.filter((t) => t.status === 'fait');

  // 1. En retard : échéance passée et non fait
  const overdueTasks = pendingTasks
    .filter((t) => t.deadline && diffInDays(todayISO, t.deadline) < 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  // 2. Cette semaine : 0 <= échéance <= 7 jours
  const thisWeekTasks = pendingTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const diff = diffInDays(todayISO, t.deadline);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  // 3. Phase en cours : reste des tâches de la phase active (hors retard et cette semaine)
  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const thisWeekIds = new Set(thisWeekTasks.map((t) => t.id));

  const currentPhaseTasks = pendingTasks.filter((t) => {
    if (t.phaseId !== currentPhase?.id) return false;
    return !overdueIds.has(t.id) && !thisWeekIds.has(t.id);
  });

  const hasNoUrgentTasks =
    overdueTasks.length === 0 &&
    thisWeekTasks.length === 0 &&
    currentPhaseTasks.length === 0;

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleToggleTask = (task: Task) => {
    const newStatus: TaskStatus = task.status === 'fait' ? 'a_faire' : 'fait';
    updateTask(task.id, { status: newStatus });
  };

  const renderEssentialTaskRow = (task: Task) => {
    const isDone = task.status === 'fait';
    const daysDiff = task.deadline ? diffInDays(todayISO, task.deadline) : null;

    let datePillStyle = 'bg-[#FBFAF6] border-[#22408F]/20 text-[#22408F]';
    if (daysDiff !== null) {
      if (daysDiff < 0) {
        datePillStyle = 'bg-[#FEEAEB] border-[#F0505A] text-[#F0505A]';
      } else if (daysDiff <= 7) {
        datePillStyle = 'bg-[#FEF0E9] border-[#F2661F] text-[#F2661F]';
      } else {
        datePillStyle = 'bg-[#EBF1FF] border-[#22408F]/40 text-[#22408F]';
      }
    }

    return (
      <div
        key={task.id}
        onClick={() => handleToggleTask(task)}
        className="bg-white border-2 border-[#22408F] rounded-xl p-3.5 sm:p-4 shadow-[0_4px_0_#22408F] hover:shadow-[0_6px_0_#22408F] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group select-none"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Grande case à cocher */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTask(task);
            }}
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 border-[#22408F] flex items-center justify-center flex-shrink-0 transition-all cursor-pointer mt-0.5 sm:mt-0 ${
              isDone
                ? 'bg-[#22408F] text-white shadow-[0_2px_0_#22408F]'
                : 'bg-white hover:bg-[#EBF1FF] shadow-[0_2px_0_#22408F]'
            }`}
            aria-label={
              isDone
                ? `Marquer "${task.title}" comme à faire`
                : `Marquer "${task.title}" comme fait`
            }
          >
            {isDone && <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />}
          </button>

          {/* Titre COMPLET avec retour à la ligne */}
          <div className="flex-1 min-w-0">
            <span
              className={`text-sm sm:text-base font-bold leading-snug break-words whitespace-normal font-heading ${
                isDone ? 'line-through text-[#5A6A94] opacity-70' : 'text-[#22408F]'
              }`}
            >
              {task.title}
            </span>
          </div>
        </div>

        {/* Badges : pastille de date, durée, et responsable en mode groupe uniquement */}
        <div className="flex items-center flex-wrap gap-2 pl-9 sm:pl-0 flex-shrink-0">
          {task.deadline && (
            <span
              className={`px-2.5 py-1 rounded-[999px] text-xs font-mono font-bold whitespace-nowrap border ${datePillStyle}`}
            >
              {formatFrenchDate(task.deadline, false)}
            </span>
          )}

          <span className="px-2.5 py-1 rounded-[999px] text-xs font-mono font-bold whitespace-nowrap bg-[#FBFAF6] border border-[#22408F]/20 text-[#22408F]">
            {formatHours(task.durationMinutes / 60)}
          </span>

          {settings.mode === 'groupe' && task.assignee && (
            <span className="px-2.5 py-1 rounded-[999px] text-xs font-bold whitespace-nowrap bg-[#EBF1FF] border border-[#22408F] text-[#22408F]">
              {task.assignee}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (
    groupId: string,
    groupTitle: string,
    groupTasks: Task[],
    badgeColorClass: string,
    badgeText: string
  ) => {
    if (groupTasks.length === 0) return null;

    const isExpanded = !!expandedGroups[groupId];
    const displayedTasks = isExpanded ? groupTasks : groupTasks.slice(0, 5);
    const remainingCount = groupTasks.length - 5;

    return (
      <div key={groupId} className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b-2 border-[#22408F]/20">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-[#22408F] font-heading">
              {groupTitle}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-[999px] text-xs font-bold border ${badgeColorClass}`}
            >
              {groupTasks.length}
            </span>
          </div>
          <span className="text-xs text-[#5A6A94] font-medium hidden sm:inline">
            {badgeText}
          </span>
        </div>

        <div className="space-y-2.5">
          {displayedTasks.map((t) => renderEssentialTaskRow(t))}
        </div>

        {groupTasks.length > 5 && (
          <button
            type="button"
            onClick={() => toggleGroupExpand(groupId)}
            className="text-xs font-bold text-[#22408F] hover:underline flex items-center gap-1.5 py-1 px-2 rounded hover:bg-[#EBF1FF] transition-all cursor-pointer"
          >
            {isExpanded ? (
              <span>Réduire la liste ↑</span>
            ) : (
              <span>+ {remainingCount} autre{remainingCount > 1 ? 's' : ''} ↓</span>
            )}
          </button>
        )}
      </div>
    );
  };

  const renderAddTaskForm = () => (
    <form onSubmit={handleAddTask} className="p-3.5 bg-[#FBFAF6] flex flex-wrap items-center gap-2.5 text-xs">
      <span className="font-bold text-[#22408F]">+ Nouvelle action :</span>

      <input
        type="text"
        placeholder="Nom de l'action (ex: Cartographier les personas)"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 focus:border-[#22408F] rounded-lg text-xs font-medium"
      />

      <select
        value={newPhaseId}
        onChange={(e) => setNewPhaseId(e.target.value)}
        className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
      >
        {phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.shortName || p.nom || p.name}
          </option>
        ))}
      </select>

      {settings.mode === 'groupe' && (
        <select
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
        >
          {settings.team.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
          <option value="Tous">Tous (Équipe)</option>
        </select>
      )}

      <input
        type="date"
        value={newDeadline}
        onChange={(e) => setNewDeadline(e.target.value)}
        className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg font-mono text-xs text-[#22408F]"
      />

      <div className="flex flex-col">
        <div className="flex items-center gap-1 font-mono">
          <input
            type="number"
            min={5}
            max={240}
            step={5}
            value={newDuration}
            onChange={(e) => {
              const val = Number(e.target.value);
              setNewDuration(val);
              if (isNaN(val) || val < 5 || val > 240) {
                setDurationError('Durée refusée : entre 5 et 240 min');
              } else if (val % 5 !== 0) {
                setDurationError('Durée refusée : multiple de 5 min');
              } else {
                setDurationError(null);
              }
            }}
            className={`w-16 px-2 py-1.5 bg-white border-2 rounded-lg text-xs text-center font-bold ${
              durationError ? 'border-[#F0505A] text-[#C4111C]' : 'border-[#22408F]/40 text-[#22408F]'
            }`}
            title="Durée en minutes (5 à 240, multiple de 5)"
          />
          <span className="text-[#5A6A94] text-[10px]">min</span>
        </div>
        {durationError && (
          <span className="text-[11px] text-[#C4111C] font-bold mt-1">
            {durationError}
          </span>
        )}
      </div>

      <select
        value={newPredecessorId}
        onChange={(e) => setNewPredecessorId(e.target.value)}
        className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs text-[#5A6A94]"
      >
        <option value="">(Sans prérequis)</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            Prérequis : {t.code} - {t.title}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!newTitle.trim()}
        className="btn-riso-primary py-1.5 px-3.5 text-xs"
      >
        Ajouter
      </button>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Contrôle segmenté affiché uniquement hors vue détaillée modale */}
      {!isInsideModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-[#22408F] rounded-xl p-4 shadow-[0_4px_0_#22408F]">
          <div>
            <h1 className="text-lg font-bold text-[#22408F] font-heading">
              Checklist
            </h1>
          </div>

          <div className="inline-flex p-1 bg-[#FBFAF6] border-2 border-[#22408F] rounded-xl self-start sm:self-auto shadow-[0_2px_0_#22408F]">
            <button
              type="button"
              onClick={() => handleModeSelect('essentiel')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                checklistMode === 'essentiel'
                  ? 'bg-[#2F6DBB] text-white shadow-[0_2px_0_#22408F]'
                  : 'text-[#22408F] hover:bg-[#EBF1FF]'
              }`}
            >
              Essentiel
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect('tout')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                checklistMode === 'tout'
                  ? 'bg-[#2F6DBB] text-white shadow-[0_2px_0_#22408F]'
                  : 'text-[#22408F] hover:bg-[#EBF1FF]'
              }`}
            >
              Tout
            </button>
          </div>
        </div>
      )}

      {/* Si hors modale et en mode Essentiel : Vue Essentielle */}
      {!isInsideModal && checklistMode === 'essentiel' ? (
        <div className="space-y-6">
          {hasNoUrgentTasks ? (
            <div className="bg-white border-2 border-[#22408F] rounded-xl p-10 sm:p-12 text-center space-y-4 shadow-[0_4px_0_#22408F]">
              <div className="w-20 h-20 rounded-[8px] bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F] p-2 mx-auto flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.hasFailed) {
                      img.dataset.hasFailed = 'true';
                      img.src = '/logo.svg';
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-[#22408F] font-heading">
                  {tasks.length === 0 ? "Aucune tâche pour l'instant." : "Rien d'urgent. Tu peux avancer sur la phase suivante."}
                </h3>
                <p className="text-xs text-[#5A6A94] leading-relaxed">
                  {tasks.length === 0
                    ? "Ajoute une première tâche ci-dessous ou depuis l'assistant."
                    : "Toutes les tâches prioritaires sont terminées pour le moment."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('parcours')}
                className="btn-riso-primary text-xs cursor-pointer inline-flex items-center gap-2"
              >
                <span>Voir le parcours complet →</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {renderGroup(
                'en_retard',
                'En retard',
                overdueTasks,
                'bg-[#FEEAEB] text-[#F0505A] border-[#F0505A]',
                'Échéance dépassée'
              )}
              {renderGroup(
                'cette_semaine',
                'Cette semaine',
                thisWeekTasks,
                'bg-[#FEF0E9] text-[#F2661F] border-[#F2661F]',
                'Échéance dans les 7 jours'
              )}
              {renderGroup(
                'phase_en_cours',
                currentPhase ? `Phase en cours (${currentPhase.name})` : 'Phase en cours',
                currentPhaseTasks,
                'bg-[#EBF1FF] text-[#22408F] border-[#22408F]',
                'Reste de la phase'
              )}
            </div>
          )}

          {/* Tâches faites repliées dans « ✓ N tâches faites » */}
          {doneTasks.length > 0 && (
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => setIsDoneExpanded(!isDoneExpanded)}
                className="flex items-center gap-2 text-xs font-bold text-[#5A6A94] hover:text-[#22408F] py-2 px-3 rounded-lg border-2 border-[#DCE2EF] hover:border-[#22408F] bg-white transition-all cursor-pointer shadow-[0_2px_0_#22408F]/20"
              >
                <Check className="w-3.5 h-3.5 text-[#2E8B4A] stroke-[3]" />
                <span>
                  ✓ {doneTasks.length} {doneTasks.length > 1 ? 'tâches faites' : 'tâche faite'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${isDoneExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isDoneExpanded && (
                <div className="space-y-2.5 pt-1">
                  {doneTasks.map((t) => renderEssentialTaskRow(t))}
                </div>
              )}
            </div>
          )}

          {/* Formulaire + Nouvelle action affiché aussi en Vue Essentiel */}
          <div className="bg-white border-2 border-[#22408F] rounded-xl shadow-[0_4px_0_#22408F] overflow-hidden">
            {renderAddTaskForm()}
          </div>
        </div>
      ) : (
        /* Sinon : Vue détaillée complète (graphe ou tableau complet inchangé) */
        <>
          {viewMode === 'graph' ? (
        /* ============================================================ */
        /* VUE GRAPHE DES DÉPENDANCES INTÉGRÉE (Point 6)                */
        /* ============================================================ */
        <div className="space-y-6">
          {/* Top Bar avec retour à la checklist */}
          <div className="bg-white border-2 border-[#22408F] rounded-xl p-4 shadow-[0_4px_0_#22408F] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="riso-text-link text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>← Retour à la checklist</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5A6A94]">Tâche analysée :</span>
              <select
                value={currentGraphTask?.id || ''}
                onChange={(e) => setActiveGraphTaskId(e.target.value)}
                className="bg-white border-2 border-[#22408F] rounded-lg px-3 py-1.5 text-xs font-bold text-[#22408F] max-w-xs truncate cursor-pointer"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alertes de conflit de dépendance */}
          {dependencyAlerts.length > 0 && (
            <div className="p-4 bg-[#FEF0E9] border-2 border-[#22408F] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#22408F]">
                  <ShieldAlert className="w-4 h-4 text-[#F2661F]" />
                  <span>{dependencyAlerts.length} anomalie(s) d'ordonnancement détectée(s)</span>
                </div>
                {dependencyAlerts[0]?.predecessorId && (
                  <button
                    type="button"
                    onClick={() => autoFixSuccessorDeadlines(dependencyAlerts[0].predecessorId!)}
                    className="btn-riso-primary py-1 px-3 text-[11px]"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ajuster les dates des successeurs</span>
                  </button>
                )}
              </div>
              <div className="space-y-1 text-[#5A6A94]">
                {dependencyAlerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-[#F2661F] font-bold">•</span>
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cartes horizontales claires : Prédécesseurs → Tâche sélectionnée → Successeurs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Colonne 1 : Prédécesseurs (À terminer avant) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-[#22408F]/20 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#5A6A94] font-heading">
                  1. Prédécesseurs ({predecessors.length})
                </h3>
                <span className="text-[11px] text-[#5A6A94]">À faire avant</span>
              </div>

              {predecessors.length === 0 ? (
                <div className="p-4 rounded-xl border-2 border-dashed border-[#22408F]/30 bg-white text-center text-xs text-[#5A6A94]">
                  Aucun prérequis. Cette tâche peut démarrer dès le début de sa phase.
                </div>
              ) : (
                <div className="space-y-3">
                  {predecessors.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setActiveGraphTaskId(p.id)}
                      className="bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-xl p-3.5 space-y-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#22408F] bg-[#EBF1FF] px-2 py-0.5 rounded border border-[#22408F]">
                          {p.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentGraphTask) removeDependency(currentGraphTask.id, p.id);
                          }}
                          className="text-[#5A6A94] hover:text-[#F0505A] font-bold text-xs p-1"
                          title="Délier ce prérequis"
                        >
                          ✕
                        </button>
                      </div>
                      <h4 className="font-bold text-xs text-[#22408F] leading-snug">
                        {p.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-[#5A6A94] pt-1 border-t border-[#22408F]/10">
                        {settings.mode === 'groupe' ? <span>{p.assignee}</span> : <span />}
                        <span className="font-mono">{formatFrenchDate(p.deadline, false)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter un prérequis */}
              {availablePreds.length > 0 && (
                <div className="pt-2 flex gap-2">
                  <select
                    value={selectedPredToAdd}
                    onChange={(e) => setSelectedPredToAdd(e.target.value)}
                    className="flex-1 bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#22408F]"
                  >
                    <option value="">+ Lier un prérequis...</option>
                    {availablePreds.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPredecessor}
                    disabled={!selectedPredToAdd}
                    className="btn-riso-secondary py-1 px-3 text-xs"
                  >
                    Lier
                  </button>
                </div>
              )}
            </div>

            {/* Colonne 2 : Tâche sélectionnée (Le pivot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-[#22408F]/20 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#22408F] font-heading">
                  2. Tâche sélectionnée
                </h3>
                <span className="text-[11px] font-bold text-[#22408F] bg-[#EBF1FF] px-2 py-0.5 rounded-[999px] border border-[#22408F]">
                  Pivot
                </span>
              </div>

              {currentGraphTask && (
                <div className="bg-white border-2 border-[#22408F] shadow-[0_6px_0_#22408F] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#22408F] bg-[#EBF1FF] px-2.5 py-1 rounded border-2 border-[#22408F]">
                      {currentGraphTask.code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-[999px] border border-[#22408F] ${
                        currentGraphTask.status === 'fait'
                          ? 'bg-[#EAF6EE] text-[#2E8B4A]'
                          : 'bg-[#FEFCE8] text-[#22408F]'
                      }`}
                    >
                      {currentGraphTask.status === 'fait' ? 'Fait ✓' : 'À faire'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#22408F] leading-snug font-heading">
                      {currentGraphTask.title}
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs text-[#5A6A94] pt-2 border-t border-[#22408F]/20">
                    {settings.mode === 'groupe' && (
                      <div className="flex justify-between">
                        <span>Responsable :</span>
                        <strong className="text-[#22408F]">{currentGraphTask.assignee}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Échéance cible :</span>
                      <strong className="font-mono text-[#22408F]">{formatFrenchDate(currentGraphTask.deadline)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Durée estimée :</span>
                      <strong className="font-mono text-[#22408F]">{currentGraphTask.durationMinutes} min</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateTask(currentGraphTask.id, {
                        status: currentGraphTask.status === 'fait' ? 'a_faire' : 'fait',
                      })
                    }
                    className="btn-riso-secondary w-full text-xs"
                  >
                    Basculer le statut ({currentGraphTask.status === 'fait' ? 'Marquer à faire' : 'Marquer fait'})
                  </button>
                </div>
              )}
            </div>

            {/* Colonne 3 : Successeurs (Ce qui attend cette tâche) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-[#22408F]/20 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#5A6A94] font-heading">
                  3. Successeurs ({successors.length})
                </h3>
                <span className="text-[11px] text-[#5A6A94]">Débloqués ensuite</span>
              </div>

              {successors.length === 0 ? (
                <div className="p-4 rounded-xl border-2 border-dashed border-[#22408F]/30 bg-white text-center text-xs text-[#5A6A94]">
                  Aucune tâche ne dépend de celle-ci pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {successors.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setActiveGraphTaskId(s.id)}
                      className="bg-white border-2 border-[#22408F] shadow-[0_4px_0_#22408F] rounded-xl p-3.5 space-y-2 hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#22408F] bg-[#EBF1FF] px-2 py-0.5 rounded border border-[#22408F]">
                          {s.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentGraphTask) removeDependency(s.id, currentGraphTask.id);
                          }}
                          className="text-[#5A6A94] hover:text-[#F0505A] font-bold text-xs p-1"
                          title="Délier ce successeur"
                        >
                          ✕
                        </button>
                      </div>
                      <h4 className="font-bold text-xs text-[#22408F] leading-snug">
                        {s.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-[#5A6A94] pt-1 border-t border-[#22408F]/10">
                        {settings.mode === 'groupe' ? <span>{s.assignee}</span> : <span />}
                        <span className="font-mono">{formatFrenchDate(s.deadline, false)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter un successeur */}
              {availableSuccs.length > 0 && (
                <div className="pt-2 flex gap-2">
                  <select
                    value={selectedSuccToAdd}
                    onChange={(e) => setSelectedSuccToAdd(e.target.value)}
                    className="flex-1 bg-white border-2 border-[#22408F] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#22408F]"
                  >
                    <option value="">+ Lier un successeur...</option>
                    {availableSuccs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSuccessor}
                    disabled={!selectedSuccToAdd}
                    className="btn-riso-secondary py-1 px-3 text-xs"
                  >
                    Lier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* VUE TABLEAU CHECKLIST & RESPONSABLES                         */
        /* ============================================================ */
        <div className="space-y-6">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#22408F] font-heading">
                Checklist
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveGraphTaskId(tasks[0]?.id || '');
                setViewMode('graph');
              }}
              className="btn-riso-secondary text-xs"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#22408F]" />
              <span>Graphe des dépendances</span>
            </button>
          </div>

          {/* Dependency Conflict Alert Banner */}
          {dependencyAlerts.length > 0 && (
            <div className="p-4 bg-[#FEF0E9] border-2 border-[#22408F] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#22408F]">
                  <ShieldAlert className="w-4 h-4 text-[#F2661F]" />
                  <span>{dependencyAlerts.length} alerte(s) de dépendance active(s)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (dependencyAlerts[0]?.predecessorId) {
                      autoFixSuccessorDeadlines(dependencyAlerts[0].predecessorId);
                    }
                  }}
                  className="btn-riso-primary py-1 px-3 text-[11px]"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Ajuster les dates des successeurs</span>
                </button>
              </div>

              <div className="space-y-1 text-[#5A6A94]">
                {dependencyAlerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-[#F2661F] font-bold">•</span>
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white border-2 border-[#22408F] rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5A6A94]" />
                <input
                  type="text"
                  placeholder="Rechercher une action, code ou personne..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FBFAF6] border-2 border-[#22408F]/30 focus:border-[#22408F] rounded-lg text-xs"
                />
              </div>

              {/* Filter Phase */}
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
                className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
              >
                <option value="all">Toutes les phases</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName || p.nom || p.name}
                  </option>
                ))}
              </select>

              {/* Filter Assignee */}
              {settings.mode === 'groupe' && (
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
                >
                  <option value="all">Tous les responsables</option>
                  {settings.team.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  <option value="Tous">Tous (Équipe entière)</option>
                </select>
              )}

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-white border-2 border-[#22408F]/40 rounded-lg text-xs font-medium text-[#22408F]"
              >
                <option value="all">Tous les états</option>
                <option value="overdue">🔴 En retard</option>
                <option value="warning">🟠 Urgent &le; 7j</option>
                <option value="pending">En attente (À faire)</option>
                <option value="completed">🟢 Terminé (Fait)</option>
              </select>
            </div>

            <div className="text-[#5A6A94] text-[11px] font-mono shrink-0">
              {filteredTasks.length} action{filteredTasks.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Main Checklist Table (Pleine largeur, sans scroll horizontal indésirable) */}
          <div className="bg-white border-2 border-[#22408F] rounded-xl overflow-hidden shadow-[0_4px_0_#22408F]">
            <table className="w-full text-left border-collapse text-xs table-auto">
              <thead>
                <tr className="bg-[#FBFAF6] text-[#22408F] border-b-2 border-[#22408F]">
                  <th className="py-2.5 px-3 font-bold w-12 text-center" title="Commande unique Fait">Fait</th>
                  <th className="py-2.5 px-3 font-bold w-14">Réf.</th>
                  <th className="py-2.5 px-3 font-bold">Action</th>
                  <th className="py-2.5 px-3 font-bold w-28">Phase</th>
                  {settings.mode === 'groupe' && (
                    <th className="py-2.5 px-3 font-bold w-32">Responsable</th>
                  )}
                  <th className="py-2.5 px-3 font-bold w-24">Échéance</th>
                  <th className="py-2.5 px-3 font-bold w-20">Durée</th>
                  <th className="py-2.5 px-3 font-bold w-28">Prérequis</th>
                  <th className="py-2.5 px-3 font-bold w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22408F]/15">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={settings.mode === 'groupe' ? 9 : 8} className="py-8 text-center text-[#5A6A94]">
                      Aucune action ne correspond aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const highlight = getTaskRowHighlight(task, todayISO);
                    const isDone = task.status === 'fait';
                    const isEditing = editingTaskId === task.id;

                    const rowClass = isDone
                      ? 'bg-[#EAF6EE]/60 text-[#5A6A94]'
                      : highlight === 'overdue'
                      ? 'bg-[#FDEEEF]/70 text-[#22408F]'
                      : highlight === 'warning'
                      ? 'bg-[#FEF0E9]/70 text-[#22408F]'
                      : 'hover:bg-[#EBF1FF]/40 text-[#22408F]';

                    const predecessors = (task.dependsOn || []).map((pId) => {
                      const p = tasks.find((t) => t.id === pId);
                      return p ? { id: p.id, code: p.code || '•', title: p.title } : null;
                    }).filter(Boolean);

                    return (
                      <tr key={task.id} className={`transition-colors ${rowClass}`}>
                        {/* Commande unique pour fait */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={(e) =>
                              updateTask(task.id, {
                                status: e.target.checked ? 'fait' : 'a_faire',
                              })
                            }
                            className="w-4 h-4 rounded text-[#2E8B4A] focus:ring-[#2E8B4A] cursor-pointer accent-[#2E8B4A]"
                            title={isDone ? 'Marquer comme à faire' : 'Marquer comme fait'}
                          />
                        </td>

                        {/* Code */}
                        <td className="py-2.5 px-3 font-mono font-bold text-[#22408F]">
                          {task.code || '•'}
                        </td>

                        {/* Titre de l'action avec retour à la ligne */}
                        <td className="py-2.5 px-3 whitespace-normal break-words leading-relaxed">
                          {isEditing ? (
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTask(task.id, { title: e.target.value })}
                              className="w-full bg-white border border-[#22408F] rounded px-2 py-1 text-xs font-bold text-[#22408F]"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingTaskId(task.id)}
                              className={`font-semibold cursor-pointer hover:underline ${
                                isDone ? 'line-through text-[#5A6A94]' : 'text-[#22408F]'
                              }`}
                              title="Cliquer pour modifier"
                            >
                              {task.title}
                            </span>
                          )}
                        </td>

                        {/* Phase */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={task.phaseId}
                              onChange={(e) => updateTask(task.id, { phaseId: e.target.value })}
                              className="bg-white border border-[#22408F] rounded px-1.5 py-0.5 text-xs font-medium"
                            >
                              {phases.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.shortName || p.nom || p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-medium text-xs text-[#5A6A94]">
                              {phases.find((p) => p.id === task.phaseId)?.shortName || 'Phase'}
                            </span>
                          )}
                        </td>

                        {/* Responsable (en mode groupe uniquement) */}
                        {settings.mode === 'groupe' && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={task.assignee}
                                onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                                className="bg-white border border-[#22408F] rounded px-1.5 py-0.5 text-xs font-medium"
                              >
                                {settings.team.map((m) => (
                                  <option key={m.id} value={m.name}>
                                    {m.name}
                                  </option>
                                ))}
                                <option value="Tous">Tous</option>
                              </select>
                            ) : (
                              <span className="font-bold text-xs text-[#22408F]">
                                {task.assignee}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Échéance */}
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-xs">
                          {isEditing ? (
                            <input
                              type="date"
                              value={task.deadline}
                              onChange={(e) => updateTask(task.id, { deadline: e.target.value }, true)}
                              className="bg-white border border-[#22408F] rounded px-1.5 py-0.5 text-xs font-mono"
                            />
                          ) : (
                            <span className="text-[#5A6A94] font-medium">
                              {formatFrenchDate(task.deadline, false)}
                            </span>
                          )}
                        </td>

                        {/* Durée (min) */}
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-xs">
                          {isEditing ? (
                            <div className="flex flex-col gap-0.5">
                              <input
                                type="number"
                                min={5}
                                max={240}
                                step={5}
                                value={task.durationMinutes}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (isNaN(val) || val < 5 || val > 240) {
                                    setRowDurationErrors((prev) => ({
                                      ...prev,
                                      [task.id]: '5 à 240 min',
                                    }));
                                  } else if (val % 5 !== 0) {
                                    setRowDurationErrors((prev) => ({
                                      ...prev,
                                      [task.id]: 'pas de 5 min',
                                    }));
                                  } else {
                                    setRowDurationErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[task.id];
                                      return next;
                                    });
                                    updateTask(task.id, { durationMinutes: val });
                                  }
                                }}
                                className={`w-16 bg-white border rounded px-1 py-0.5 text-xs font-mono text-center font-bold ${
                                  rowDurationErrors[task.id]
                                    ? 'border-[#F0505A] text-[#C4111C]'
                                    : 'border-[#22408F]'
                                }`}
                              />
                              {rowDurationErrors[task.id] && (
                                <span className="text-[10px] text-[#C4111C] font-bold">
                                  {rowDurationErrors[task.id]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#5A6A94]">
                              {task.durationMinutes} min
                            </span>
                          )}
                        </td>

                        {/* Prérequis */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {predecessors && predecessors.length > 0 ? (
                              predecessors.map((p) => (
                                <span
                                  key={p!.id}
                                  onClick={() => openGraphForTask(p!.id)}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EBF1FF] text-[#22408F] border border-[#22408F] cursor-pointer hover:bg-[#22408F] hover:text-white transition-colors"
                                  title={`${p!.code} : ${p!.title}`}
                                >
                                  {p!.code}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#5A6A94] text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Actions (Graphe + Modifier/Valider + Supprimer) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openGraphForTask(task.id)}
                              className="p-1 text-[#22408F] hover:bg-[#EBF1FF] rounded transition-colors cursor-pointer"
                              title="Voir les dépendances de cette action"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingTaskId(isEditing ? null : task.id)}
                              className="p-1 text-[#22408F] hover:bg-[#EBF1FF] rounded transition-colors cursor-pointer"
                              title={isEditing ? 'Terminer la modification' : 'Modifier cette ligne'}
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5 text-[#2E8B4A]" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-[#5A6A94] hover:text-[#F0505A] hover:bg-[#FDEEEF] rounded transition-colors cursor-pointer"
                              title="Supprimer cette action"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Add Task Form (Fonds neutres épurés, sans jaune tableur) */}
            <div className="border-t-2 border-[#22408F]">
              {renderAddTaskForm()}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
