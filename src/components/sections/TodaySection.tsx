import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Task } from '../../types/project';
import {
  Clock,
  Calendar,
  ChevronRight,
  Play,
  Flag,
  Plus,
  X,
} from 'lucide-react';
import {
  diffInDays,
  formatFrenchDate,
  formatISODate,
  formatHours,
  getAssigneeInitials,
  toLocalYMD,
} from '../../utils/dateCalculations';
import { PHASE_COLORS, RISO_THEME, getPhaseColor } from '../../utils/theme';
import { InertiaActionModal } from '../modals/InertiaActionModal';
export { PHASE_COLORS };

export const TodaySection: React.FC = () => {
  const {
    activeProject,
    openFocusMode,
    setActiveTab,
    addMilestone,
  } = useProject();
  const { tasks, settings, phases, milestones, sessions, deliverables = [] } = activeProject;
  const todayISO = toLocalYMD();

  // Compteur secondaire : Rendu final (J-69 · Rendu final)
  const finalDays = diffInDays(todayISO, settings.deadlineDate);
  const finalBadge =
    finalDays === 0
      ? 'J-0 · Rendu final'
      : finalDays > 0
      ? `J-${finalDays} · Rendu final`
      : `J+${Math.abs(finalDays)} (dépassé) · Rendu final`;

  // Compteur mis en avant : prochain objectif de type Rendu non final OU prochain livrable daté (le plus proche des deux, date future)
  interface IntermediateCandidate {
    id: string;
    name: string;
    date: string;
    days: number;
    source: 'deliverable' | 'milestone';
  }

  const intermediateCandidates: IntermediateCandidate[] = [];

  // A. Livrables datés dans le futur (non final : date < deadlineDate et sans mention 'final')
  (deliverables || []).forEach((del) => {
    if (del.deadline && del.status !== 'valide') {
      const days = diffInDays(todayISO, del.deadline);
      const isNotFinal = del.deadline < settings.deadlineDate && !del.title.toLowerCase().includes('final');
      if (days >= 0 && isNotFinal) {
        intermediateCandidates.push({
          id: del.id,
          name: del.title,
          date: del.deadline,
          days,
          source: 'deliverable',
        });
      }
    }
  });

  // B. Objectifs (milestones) de type Rendu non final dans le futur
  milestones.forEach((m) => {
    if (!m.completed && m.calculatedDate) {
      const days = diffInDays(todayISO, m.calculatedDate);
      const isRenduType =
        m.title.toLowerCase().includes('rendu') ||
        Boolean(m.deliverableRef) ||
        m.title.toLowerCase().includes('revue') ||
        m.title.toLowerCase().includes('validation');
      const isNotFinal =
        m.daysBeforeDeadline > 0 &&
        m.calculatedDate < settings.deadlineDate &&
        !m.title.toLowerCase().includes('final');

      if (days >= 0 && isRenduType && isNotFinal) {
        intermediateCandidates.push({
          id: m.id,
          name: m.title,
          date: m.calculatedDate,
          days,
          source: 'milestone',
        });
      }
    }
  });

  // Tri par date croissante pour retenir le plus proche
  intermediateCandidates.sort((a, b) => a.date.localeCompare(b.date));
  const nextIntermediate = intermediateCandidates[0] || null;

  // État pour la création d'un rendu intermédiaire si aucun n'est présent
  const [isAddIntermediateOpen, setIsAddIntermediateOpen] = useState(false);
  const [isInertiaOpen, setIsInertiaOpen] = useState(false);
  const [newIntermediateTitle, setNewIntermediateTitle] = useState('Rendu intermédiaire');
  const [newIntermediateDate, setNewIntermediateDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatISODate(d);
  });
  const [newIntermediatePhaseId, setNewIntermediatePhaseId] = useState('p3');
  const [newIntermediateNotes, setNewIntermediateNotes] = useState('');

  const handleCreateIntermediate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntermediateTitle.trim()) return;

    const daysBefore = Math.max(1, diffInDays(newIntermediateDate, settings.deadlineDate));
    addMilestone({
      title: newIntermediateTitle.trim(),
      phaseId: newIntermediatePhaseId,
      daysBeforeDeadline: daysBefore,
      useFixedDate: true,
      fixedDate: newIntermediateDate,
      completed: false,
      notes: newIntermediateNotes.trim() || undefined,
    });

    setIsAddIntermediateOpen(false);
  };

  const daysRemaining = finalDays;
  const jBadge = daysRemaining >= 0 ? `J-${daysRemaining}` : `J+${Math.abs(daysRemaining)}`;

  // Phase en cours selon la date du jour
  const currentPhase = phases.find((p) => {
    if (p.calculatedStartDate && p.calculatedEndDate) {
      return todayISO >= p.calculatedStartDate && todayISO <= p.calculatedEndDate;
    }
    return false;
  });

  // Rule B.1 : Tâche du moment = phase en cours d'abord, puis retard, puis suivantes
  const allPending = tasks.filter((t) => t.status !== 'fait');
  const currentPhasePending = allPending
    .filter((t) => currentPhase && t.phaseId === currentPhase.id)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const overduePending = allPending
    .filter((t) => (!currentPhase || t.phaseId !== currentPhase.id) && diffInDays(todayISO, t.deadline) < 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const otherPending = allPending
    .filter((t) => (!currentPhase || t.phaseId !== currentPhase.id) && diffInDays(todayISO, t.deadline) >= 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const pendingTasks = [...currentPhasePending, ...overduePending, ...otherPending];

  const [currentIndex, setCurrentIndex] = useState(0);

  // If pending tasks change and index is out of bounds
  const safeIndex = pendingTasks.length > 0 ? currentIndex % pendingTasks.length : 0;
  const currentTask = pendingTasks[safeIndex] as Task | undefined;

  // Next milestone (first non-completed milestone)
  const upcomingMilestones = [...milestones]
    .filter((m) => !m.completed)
    .sort((a, b) => a.calculatedDate.localeCompare(b.calculatedDate));
  const nextMilestone = upcomingMilestones[0];
  const milestoneDays = nextMilestone ? diffInDays(todayISO, nextMilestone.calculatedDate) : null;

  // Progress metrics for Apple Fitness rings
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'fait').length;
  const taskProgressFraction = totalTasks > 0 ? Math.min(1, completedTasks / totalTasks) : 0;

  // Target hours calculation: single source of truth is the sum of planned duration from sessions
  const totalPlannedHours = sessions.reduce(
    (sum, s) => sum + (s.plannedDurationHours || 0),
    0
  );
  const targetTotalHours =
    totalPlannedHours > 0
      ? totalPlannedHours
      : (settings.targetSessionsCount || 12) * 2;
  const completedSessions = sessions.filter((s) => s.status === 'realisee');
  const actualHoursDone = completedSessions.reduce(
    (sum, s) => sum + (s.actualDurationHours || s.plannedDurationHours || 0),
    0
  );
  const hoursProgressFraction = targetTotalHours > 0 ? Math.min(1, actualHoursDone / targetTotalHours) : 0;

  // Handle Cycle to next task
  const handleNextTask = () => {
    if (pendingTasks.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % pendingTasks.length);
    }
  };

  // Launch Focus Timer in full-screen mode
  const handleStartTask = (task: Task) => {
    openFocusMode({
      type: 'task',
      id: task.id,
      title: task.title,
      durationMinutes: task.durationMinutes || 45,
      phaseId: task.phaseId,
    });
  };

  // 7 days of the current week for the preview widget
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const mondayDate = getMonday(new Date());
  const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    const iso = formatISODate(d);
    const dayName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
    const dayNum = d.getDate();
    const daySessions = sessions.filter((s) => s.date === iso);
    return {
      iso,
      dayName,
      dayNum,
      isToday: iso === todayISO,
      sessions: daySessions,
    };
  });

  // Current task phase metadata
  const taskPhase = currentTask ? phases.find((p) => p.id === currentTask.phaseId) : null;
  const phaseColor = currentTask ? getPhaseColor(taskPhase || currentTask.phaseId, phases) : null;

  // SVG Rings Calculations (Dimensions)
  const ringSize = 130;
  const strokeWidth = 11;
  const center = ringSize / 2;
  const outerRadius = center - strokeWidth / 2 - 2;
  const innerRadius = outerRadius - strokeWidth - 5;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const outerOffset = outerCircumference - taskProgressFraction * outerCircumference;
  const innerOffset = innerCircumference - hoursProgressFraction * innerCircumference;

  // Next 3 tasks after the current active task
  const nextThreeTasks = pendingTasks
    .filter((_, idx) => idx !== safeIndex)
    .slice(0, 3);

  const todayFormatted = formatFrenchDate(todayISO);

  return (
    <>
      {/* ============================================================ */}
      {/* 1. VUE MOBILE (< 768px)                                      */}
      {/* ============================================================ */}
      <div className="block md:hidden max-w-md mx-auto py-2 px-1 space-y-5 animate-in fade-in duration-200">
        {/* 1. Date du jour et 2 compteurs */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-xs text-[#5A6A94] font-medium">
            <span className="capitalize font-bold text-[#22408F] text-sm">{todayFormatted}</span>
            <div className="bg-white text-[#22408F] border-2 border-[#DCE2EF] px-2.5 py-1 rounded-[999px] text-[11px] font-semibold tabular-nums">
              {finalBadge}
            </div>
          </div>

          {/* Compteur mis en avant si présent */}
          {nextIntermediate && (
            <div
              className="bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] shadow-[0_2px_0_#22408F] px-3 py-1.5 rounded-[999px] text-xs font-bold flex items-center gap-1.5 truncate"
              title={`Rendu intermédiaire : ${nextIntermediate.name}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#2F6DBB] shrink-0"></span>
              <span className="tabular-nums shrink-0">
                {nextIntermediate.days === 0
                  ? "Aujourd'hui"
                  : nextIntermediate.days > 0
                  ? `J-${nextIntermediate.days}`
                  : `J+${Math.abs(nextIntermediate.days)}`}
              </span>
              <span>·</span>
              <span className="truncate">Rendu intermédiaire : {nextIntermediate.name}</span>
              <span>·</span>
              <span className="tabular-nums shrink-0 font-mono text-[11px]">
                {formatFrenchDate(nextIntermediate.date, false)}
              </span>
            </div>
          )}

          {/* Grand bouton principal : Je m'y mets (Mobile) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsInertiaOpen(true)}
              className="btn-riso-primary w-full text-base py-3.5 px-6 font-bold shadow-[0_4px_0_#F0505A] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Je m'y mets</span>
            </button>
          </div>
        </div>

        {/* 2. Au centre : CARTE tâche du moment */}
        {currentTask ? (
          <div className="riso-card p-6 relative overflow-hidden">
            {/* Phase & Durée */}
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-[999px] shrink-0 border border-[#22408F]"
                  style={{ backgroundColor: phaseColor?.hex || '#2F6DBB' }}
                ></span>
                <span className="font-bold text-[#22408F] truncate max-w-[160px] text-xs">
                  {taskPhase?.shortName || 'Phase en cours'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 tabular-nums text-xs font-bold text-[#22408F] bg-[#FBFAF6] px-2.5 py-1 rounded-[8px] border-2 border-[#22408F]">
                <Clock className="w-3.5 h-3.5 text-[#22408F]" />
                <span>{currentTask.durationMinutes} min</span>
              </div>
            </div>

            {/* Titre */}
            <h2 className="text-xl sm:text-2xl font-bold text-[#22408F] tracking-tight leading-snug my-3 font-heading">
              {currentTask.title}
            </h2>

            {/* Métadonnées : Responsable & Échéance */}
            <div className="flex items-center justify-between text-xs text-[#5A6A94] pt-3 border-t-2 border-[#22408F]/20 mt-4">
              {settings.mode === 'groupe' ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-[999px] bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] flex items-center justify-center text-[11px] font-bold">
                    {getAssigneeInitials(currentTask.assignee)}
                  </div>
                  <span className="font-bold text-[#22408F]">{currentTask.assignee}</span>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1.5 tabular-nums text-xs">
                <span>Échéance :</span>
                <span className="font-bold text-[#22408F]">
                  {formatFrenchDate(currentTask.deadline, false)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="riso-card p-8 text-center space-y-4">
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
              <h2 className="text-base font-bold text-[#22408F] font-heading">
                Rien de prévu aujourd'hui.
              </h2>
              <p className="text-xs text-[#5A6A94] leading-relaxed">
                Choisis une tâche dans ton parcours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('parcours')}
              className="btn-riso-primary text-xs"
            >
              <span>Voir le parcours</span>
            </button>
          </div>
        )}

        {/* 3. Bouton principal « Commencer » & Secondaire « Autre tâche » */}
        {currentTask && (
          <div className="flex flex-col items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleStartTask(currentTask)}
              className="btn-riso-primary w-full text-sm py-3.5"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Commencer cette tâche</span>
            </button>

            {pendingTasks.length > 1 && (
              <button
                type="button"
                onClick={handleNextTask}
                className="btn-riso-secondary w-full"
              >
                <span>Autre tâche ({safeIndex + 1}/{pendingTasks.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 4. Deux anneaux de progression concentriques (Information seule) */}
        <div className="riso-info-box bg-white p-5 flex items-center gap-5 text-[#22408F]">
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              className="rotate-[-90deg]"
            >
              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                stroke="rgba(34, 64, 143, 0.15)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                stroke="#2F6DBB"
                strokeWidth={strokeWidth}
                strokeDasharray={outerCircumference}
                strokeDashoffset={outerOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                stroke="rgba(34, 64, 143, 0.15)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                stroke="#2E8B4A"
                strokeWidth={strokeWidth}
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="tabular-nums text-xs font-bold text-[#22408F]">
                {Math.round(taskProgressFraction * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs flex-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[999px] bg-[#2F6DBB] shrink-0 border border-[#22408F]"></span>
                <span className="font-bold text-[#22408F]">Tâches faites</span>
              </div>
              <div className="tabular-nums text-[#5A6A94] pl-5 text-[11px] mt-0.5">
                <strong className="text-[#22408F]">{completedTasks}</strong> sur {totalTasks} ({Math.round(taskProgressFraction * 100)}%)
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[999px] bg-[#2E8B4A] shrink-0 border border-[#22408F]"></span>
                <span className="font-bold text-[#22408F]">Heures réalisées</span>
              </div>
              <div className="tabular-nums text-[#5A6A94] pl-5 text-[11px] mt-0.5">
                <strong className="text-[#22408F]">{formatHours(actualHoursDone)}</strong> sur {targetTotalHours} h ({Math.round(hoursProgressFraction * 100)}%)
              </div>
            </div>
          </div>
        </div>

        {/* 5. Prochain objectif */}
        {nextMilestone && (
          <div
            onClick={() => setActiveTab('parcours')}
            className="riso-card riso-clickable p-4 flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[8px] bg-[#FEFCE8] text-[#22408F] flex items-center justify-center shrink-0 border-2 border-[#22408F]">
                <Flag className="w-4 h-4 text-[#22408F]" />
              </div>
              <div className="min-w-0 truncate">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A94] block">
                  Prochain objectif
                </span>
                <span className="font-bold text-[#22408F] text-xs truncate block">
                  {nextMilestone.title}
                </span>
                <span className="tabular-nums text-[11px] text-[#5A6A94]">
                  {formatFrenchDate(nextMilestone.calculatedDate, false)}
                </span>
              </div>
            </div>

            <span className="shrink-0 riso-pill bg-[#EBF1FF]">
              {milestoneDays === 0
                ? "Aujourd'hui"
                : milestoneDays === 1
                ? 'demain'
                : milestoneDays! < 0
                ? `dépassé (${Math.abs(milestoneDays!)} j)`
                : `dans ${milestoneDays} j`}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. VUE DESKTOP (>= 768px)                                     */}
      {/* ============================================================ */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-4 px-2 space-y-6 animate-in fade-in duration-200">
        {/* Top Header Row : Titre et 2 Compteurs en haut à droite */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#22408F] pb-4 gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#5A6A94] block">
              {todayFormatted}
            </span>
            <h1 className="text-2xl font-bold text-[#22408F] tracking-tight font-heading mt-0.5">
              Tableau de bord du jour
            </h1>
          </div>

          {/* En haut à droite : 2 compteurs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mis en avant : Prochain Rendu intermédiaire si présent */}
            {nextIntermediate && (
              <div
                className="bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] shadow-[0_2px_0_#22408F] px-3.5 py-1.5 rounded-[999px] text-xs font-bold flex items-center gap-2"
                title={`Rendu intermédiaire : ${nextIntermediate.name}`}
              >
                <span className="w-2 h-2 rounded-full bg-[#2F6DBB] shrink-0"></span>
                <span className="tabular-nums">
                  {nextIntermediate.days === 0
                    ? "Aujourd'hui"
                    : nextIntermediate.days > 0
                    ? `J-${nextIntermediate.days}`
                    : `J+${Math.abs(nextIntermediate.days)}`}
                </span>
                <span>·</span>
                <span className="truncate max-w-[220px]">
                  Rendu intermédiaire : {nextIntermediate.name}
                </span>
                <span>·</span>
                <span className="tabular-nums font-mono text-[11px]">
                  {formatFrenchDate(nextIntermediate.date, false)}
                </span>
              </div>
            )}

            {/* Secondaire : Rendu final */}
            <div className="bg-white text-[#22408F] border-2 border-[#DCE2EF] px-3 py-1.5 rounded-[999px] text-xs font-semibold tabular-nums">
              {finalBadge}
            </div>
          </div>
        </div>

        {/* Grand bouton principal : Je m'y mets (Desktop) */}
        <div>
          <button
            type="button"
            onClick={() => setIsInertiaOpen(true)}
            className="btn-riso-primary w-full text-lg py-4 px-8 font-bold shadow-[0_4px_0_#F0505A] flex items-center justify-center gap-3 cursor-pointer group"
          >
            <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
            <span className="font-heading tracking-wide">Je m'y mets</span>
          </button>
        </div>

        {/* 2 Colonnes : Gauche (60%) / Droite (40%) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Colonne Gauche : Tâche du moment */}
          <div className="col-span-12 lg:col-span-7 space-y-5">
            {currentTask ? (
              <div className="riso-card p-7 relative overflow-hidden space-y-6">
                {/* Phase tag & Duration */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-[999px] shrink-0 border border-[#22408F]"
                      style={{ backgroundColor: phaseColor?.hex || '#2F6DBB' }}
                    ></span>
                    <span className="font-bold text-[#22408F] text-xs">
                      {taskPhase?.name || 'Phase en cours'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 tabular-nums text-xs font-bold text-[#22408F] bg-[#FBFAF6] px-3 py-1 rounded-[8px] border-2 border-[#22408F]">
                    <Clock className="w-3.5 h-3.5 text-[#22408F]" />
                    <span>{currentTask.durationMinutes} min</span>
                  </div>
                </div>

                {/* Titre */}
                <div className="py-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A94] block mb-1">
                    Tâche du moment
                  </span>
                  <h2 className="text-2xl xl:text-3xl font-bold text-[#22408F] tracking-tight leading-snug font-heading">
                    {currentTask.title}
                  </h2>
                </div>

                {/* Responsable & Échéance */}
                <div className="flex items-center justify-between text-xs text-[#5A6A94] pt-4 border-t-2 border-[#22408F]/20">
                  {settings.mode === 'groupe' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[999px] bg-[#EBF1FF] text-[#22408F] border-2 border-[#22408F] flex items-center justify-center text-xs font-bold">
                        {getAssigneeInitials(currentTask.assignee)}
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5A6A94] block leading-none">Responsable</span>
                        <span className="font-bold text-[#22408F]">{currentTask.assignee}</span>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2 tabular-nums text-xs">
                    <span className="text-[#5A6A94]">Échéance :</span>
                    <span className="font-bold text-[#22408F] bg-[#FBFAF6] border-2 border-[#22408F] px-2.5 py-0.5 rounded-[8px]">
                      {formatFrenchDate(currentTask.deadline, false)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStartTask(currentTask)}
                    className="btn-riso-primary flex-1 py-3.5"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Commencer cette tâche</span>
                  </button>

                  {pendingTasks.length > 1 && (
                    <button
                      type="button"
                      onClick={handleNextTask}
                      className="btn-riso-secondary py-3.5 px-4"
                      title="Passer à une autre tâche"
                    >
                      <span>Autre tâche ({safeIndex + 1}/{pendingTasks.length})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="riso-card p-12 text-center space-y-4">
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
                  <h2 className="text-lg font-bold text-[#22408F] font-heading">
                    {totalTasks === 0 ? "Aucune tâche pour l'instant" : "Rien de prévu aujourd'hui."}
                  </h2>
                  <p className="text-xs text-[#5A6A94] leading-relaxed">
                    {totalTasks === 0
                      ? "Aucune tâche pour l'instant. Choisis une action dans ton parcours pour commencer."
                      : "Toutes les tâches en cours sont terminées. Choisis une tâche dans ton parcours pour continuer à avancer."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('parcours')}
                  className="btn-riso-primary"
                >
                  <span>Voir le parcours</span>
                </button>
              </div>
            )}
          </div>

          {/* Colonne Droite : Anneaux, Objectif, Tâches suivantes */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            {/* Anneaux de progression concentriques (Information seule) */}
            <div className="riso-info-box bg-white p-5 flex items-center gap-5 text-[#22408F]">
              <div className="relative shrink-0 flex items-center justify-center">
                <svg
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                  className="rotate-[-90deg]"
                >
                  <circle
                    cx={center}
                    cy={center}
                    r={outerRadius}
                    stroke="rgba(34, 64, 143, 0.15)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={outerRadius}
                    stroke="#2F6DBB"
                    strokeWidth={strokeWidth}
                    strokeDasharray={outerCircumference}
                    strokeDashoffset={outerOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={innerRadius}
                    stroke="rgba(34, 64, 143, 0.15)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={innerRadius}
                    stroke="#2E8B4A"
                    strokeWidth={strokeWidth}
                    strokeDasharray={innerCircumference}
                    strokeDashoffset={innerOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="tabular-nums text-xs font-bold text-[#22408F]">
                    {Math.round(taskProgressFraction * 100)}%
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs flex-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[999px] bg-[#2F6DBB] shrink-0 border border-[#22408F]"></span>
                    <span className="font-bold text-[#22408F]">Tâches faites</span>
                  </div>
                  <div className="tabular-nums text-[#5A6A94] pl-5 text-[11px] mt-0.5">
                    <strong className="text-[#22408F]">{completedTasks}</strong> sur {totalTasks} ({Math.round(taskProgressFraction * 100)}%)
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[999px] bg-[#2E8B4A] shrink-0 border border-[#22408F]"></span>
                    <span className="font-bold text-[#22408F]">Heures réalisées</span>
                  </div>
                  <div className="tabular-nums text-[#5A6A94] pl-5 text-[11px] mt-0.5">
                    <strong className="text-[#22408F]">{formatHours(actualHoursDone)}</strong> sur {targetTotalHours} h ({Math.round(hoursProgressFraction * 100)}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Prochain objectif */}
            {nextMilestone && (
              <div
                onClick={() => setActiveTab('parcours')}
                className="riso-card riso-clickable p-4 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[8px] bg-[#FEFCE8] text-[#22408F] flex items-center justify-center shrink-0 border-2 border-[#22408F]">
                    <Flag className="w-4 h-4 text-[#22408F]" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A94] block">
                      Prochain objectif
                    </span>
                    <span className="font-bold text-[#22408F] text-xs truncate block">
                      {nextMilestone.title}
                    </span>
                    <span className="tabular-nums text-[11px] text-[#5A6A94]">
                      {formatFrenchDate(nextMilestone.calculatedDate, false)}
                    </span>
                  </div>
                </div>

                <span className="shrink-0 riso-pill bg-[#EBF1FF]">
                  {milestoneDays === 0
                    ? "Aujourd'hui"
                    : milestoneDays === 1
                    ? 'demain'
                    : milestoneDays! < 0
                    ? `dépassé (${Math.abs(milestoneDays!)} j)`
                    : `dans ${milestoneDays} j`}
                </span>
              </div>
            )}

            {/* Ensuite (les 3 tâches suivantes) */}
            <div className="riso-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#22408F]">
                  Ensuite
                </span>
                <span className="text-[11px] tabular-nums text-[#5A6A94] font-bold">
                  {pendingTasks.length > 1 ? `${Math.min(3, pendingTasks.length - 1)} tâche(s)` : '0 tâche'}
                </span>
              </div>

              {nextThreeTasks.length === 0 ? (
                <p className="text-xs text-[#5A6A94] py-2">
                  Aucune autre tâche en attente.
                </p>
              ) : (
                <div className="space-y-2">
                  {nextThreeTasks.map((t) => {
                    const tPhase = phases.find((p) => p.id === t.phaseId);
                    const tPhaseColor = getPhaseColor(tPhase || t.phaseId, phases);

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          const targetIdx = pendingTasks.findIndex((pt) => pt.id === t.id);
                          if (targetIdx !== -1) setCurrentIndex(targetIdx);
                        }}
                        className="p-2.5 rounded-[8px] border-2 border-[#22408F]/20 hover:border-[#22408F] hover:bg-[#EBF1FF] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        title="Cliquer pour passer en tâche active"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-[999px] shrink-0 border border-[#22408F]"
                            style={{ backgroundColor: tPhaseColor.hex }}
                          ></span>
                          <span className="font-bold text-xs text-[#22408F] truncate">
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {settings.mode === 'groupe' && t.assignee && (
                            <span className="w-5 h-5 rounded-[999px] bg-[#EBF1FF] text-[#22408F] border border-[#22408F] flex items-center justify-center text-[10px] font-bold">
                              {getAssigneeInitials(t.assignee)}
                            </span>
                          )}
                          <span className="tabular-nums text-[11px] font-bold text-[#22408F] bg-[#FBFAF6] border border-[#22408F] px-1.5 py-0.5 rounded-[8px]">
                            {t.durationMinutes} min
                          </span>
                          <span className="text-sm font-bold text-[#22408F] group-hover:translate-x-0.5 transition-transform">
                            ›
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sessions de la semaine */}
            <div
              onClick={() => setActiveTab('sessions')}
              className="riso-card p-4 hover:translate-y-[-1px] transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#22408F]">
                  Sessions de la semaine
                </span>
                <span className="btn-riso-discreet text-xs">
                  <span>Voir l'agenda</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* 7 Days Row */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {currentWeekDays.map((day) => (
                  <div
                    key={day.iso}
                    className={`p-2 rounded-[8px] border-2 transition-colors ${
                      day.isToday
                        ? 'bg-[#EBF1FF] border-[#22408F] font-bold text-[#22408F]'
                        : 'bg-[#FBFAF6] border-[#22408F]/20 text-[#5A6A94] hover:border-[#22408F]'
                    }`}
                  >
                    <span className="text-[11px] uppercase block font-bold">
                      {day.dayName}
                    </span>
                    <span className="text-xs tabular-nums font-bold block mt-0.5">
                      {day.dayNum}
                    </span>
                    <div className="mt-1 flex items-center justify-center gap-0.5 min-h-[6px]">
                      {day.sessions.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          className={`w-2 h-2 rounded-[999px] border border-[#22408F] ${
                            s.status === 'realisee' ? 'bg-[#2E8B4A]' : 'bg-[#2F6DBB]'
                          }`}
                        ></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal : Ajouter un rendu intermédiaire / Nouvel objectif */}
      {isAddIntermediateOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#22408F]/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddIntermediateOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full border-2 border-[#22408F] shadow-[0_6px_0_#22408F] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#FBFAF6] border-b-2 border-[#22408F] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#22408F]" />
                <h3 className="font-bold text-sm text-[#22408F] font-heading">
                  Nouvel objectif : Rendu intermédiaire
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddIntermediateOpen(false)}
                className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-lg hover:bg-[#EBF1FF] transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIntermediate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-[#22408F] mb-1">
                    Intitulé de l'objectif <span className="text-[#F0505A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={newIntermediateTitle}
                    onChange={(e) => setNewIntermediateTitle(e.target.value)}
                    placeholder="ex: Rendu intermédiaire, Revue de maquette…"
                    className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] font-medium focus:border-[#22408F] focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#22408F] mb-1">
                      Date cible <span className="text-[#F0505A]">*</span>
                    </label>
                    <input
                      type="date"
                      value={newIntermediateDate}
                      onChange={(e) => setNewIntermediateDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] font-medium focus:border-[#22408F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#22408F] mb-1">
                      Phase associée
                    </label>
                    <select
                      value={newIntermediatePhaseId}
                      onChange={(e) => setNewIntermediatePhaseId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] font-medium focus:border-[#22408F] focus:outline-none"
                    >
                      {phases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom || p.name || p.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#22408F] mb-1">
                    Notes (facultatif)
                  </label>
                  <textarea
                    rows={2}
                    value={newIntermediateNotes}
                    onChange={(e) => setNewIntermediateNotes(e.target.value)}
                    placeholder="Critères d'évaluation, livrables attendus…"
                    className="w-full px-3 py-2 bg-white border-2 border-[#22408F]/30 rounded-lg text-[#22408F] focus:border-[#22408F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE2EF] shrink-0 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddIntermediateOpen(false)}
                  className="btn-riso-secondary py-2 px-3.5 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newIntermediateTitle.trim()}
                  className="btn-riso-primary py-2 px-4 text-xs"
                >
                  Créer l'objectif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anti-Inertie « Je m'y mets » */}
      <InertiaActionModal
        isOpen={isInertiaOpen}
        onClose={() => setIsInertiaOpen(false)}
      />
    </>
  );
};
