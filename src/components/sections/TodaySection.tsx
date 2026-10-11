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
  toLocalYMD,
} from '../../utils/dateCalculations';
import { PHASE_COLORS, RISO_THEME, getPhaseColor } from '../../utils/theme';
import { InertiaActionModal } from '../modals/InertiaActionModal';
import { Button, Card, Pill, ProgressRing, EmptyState } from '../ui';
import { AssigneeAvatar } from '../AssigneeAvatar';
import { IconJalon } from '../icons';
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
          <div className="flex items-center justify-between text-xs text-[var(--riso-ink-secondary)] font-medium">
            <span className="capitalize font-bold text-[var(--riso-ink)] text-sm">{todayFormatted}</span>
            <div className="bg-white text-[var(--riso-ink)] border-2 border-[var(--riso-line)] px-2.5 py-1 rounded-[999px] text-[11px] font-semibold tabular-nums">
              {finalBadge}
            </div>
          </div>

          {/* Compteur mis en avant si présent */}
          {nextIntermediate && (
            <div
              className="bg-[var(--riso-p1-light)] text-[var(--riso-ink)] border-2 border-[var(--riso-ink)] shadow-riso-press px-3 py-1.5 rounded-[999px] text-xs font-bold flex items-center gap-1.5 truncate"
              title={`Rendu intermédiaire : ${nextIntermediate.name}`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--riso-p1)] shrink-0"></span>
              <span className="tabular-nums shrink-0">
                {nextIntermediate.days === 0
                  ? "aujourd'hui"
                  : nextIntermediate.days > 0
                  ? `J-${nextIntermediate.days}`
                  : `J+${Math.abs(nextIntermediate.days)}`}
              </span>
              <span>·</span>
              <span className="truncate">rendu intermédiaire : {nextIntermediate.name}</span>
              <span>·</span>
              <span className="tabular-nums shrink-0 text-[11px]">
                {formatFrenchDate(nextIntermediate.date, false)}
              </span>
            </div>
          )}

          {/* Grand bouton principal : Je m'y mets (Mobile) */}
          <div className="pt-1">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setIsInertiaOpen(true)}
              className="shadow-riso-primary"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>je m'y mets</span>
            </Button>
          </div>
        </div>

        {/* 2. Au centre : CARTE tâche du moment */}
        {currentTask ? (
          <Card variant="default" radius="md" className="p-6 relative overflow-hidden space-y-4">
            {/* Phase & Durée */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-[999px] shrink-0 border-2 border-[var(--riso-ink)]"
                  style={{ backgroundColor: phaseColor?.hex || 'var(--riso-p1)' }}
                ></span>
                <span className="font-bold text-[var(--riso-ink)] truncate max-w-[160px] text-xs lowercase">
                  {taskPhase?.shortName || 'phase en cours'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 tabular-nums text-xs font-bold text-[var(--riso-ink)] bg-[var(--riso-paper)] px-2.5 py-1 rounded-[8px] border-2 border-[var(--riso-ink)]">
                <Clock className="w-3.5 h-3.5 text-[var(--riso-ink)]" />
                <span>{currentTask.durationMinutes} min</span>
              </div>
            </div>

            {/* Titre */}
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--riso-ink)] tracking-tight leading-snug my-2 font-heading lowercase">
              {currentTask.title}
            </h2>

            {/* Métadonnées : Responsable & Échéance */}
            <div className="flex items-center justify-between text-xs text-[var(--riso-ink-secondary)] pt-3 border-t-2 border-[var(--riso-line)]">
              {settings.mode === 'groupe' ? (
                <div className="flex items-center gap-2">
                  <AssigneeAvatar assignee={currentTask.assignee} size={24} />
                  <span className="font-bold text-[var(--riso-ink)]">{currentTask.assignee}</span>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1.5 tabular-nums text-xs">
                <span>échéance :</span>
                <span className="font-bold text-[var(--riso-ink)] bg-[var(--riso-paper)] border border-[var(--riso-line)] px-2 py-0.5 rounded-[8px]">
                  {formatFrenchDate(currentTask.deadline, false)}
                </span>
              </div>
            </div>
          </Card>
        ) : (
          /* Empty State */
          <EmptyState
            message="rien de prévu aujourd'hui."
            actionText="voir le parcours"
            onAction={() => setActiveTab('parcours')}
          />
        )}

        {/* 3. Boutons d'action */}
        {currentTask && (
          <div className="flex flex-col items-center gap-2.5 pt-1">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => handleStartTask(currentTask)}
            >
              <Play className="w-4 h-4 fill-[var(--riso-ink)] text-[var(--riso-ink)]" />
              <span>commencer cette tâche</span>
            </Button>

            {pendingTasks.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleNextTask}
              >
                <span>autre tâche ({safeIndex + 1}/{pendingTasks.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* 4. Deux anneaux de progression concentriques */}
        <Card variant="flat" radius="sm" className="bg-white p-5 flex items-center gap-5 text-[var(--riso-ink)] border-2 border-[var(--riso-line)]">
          <ProgressRing
            outerFraction={taskProgressFraction}
            innerFraction={hoursProgressFraction}
            size={110}
            outerColor="var(--riso-p1)"
            innerColor="var(--riso-p2)"
            label={
              <span className="tabular-nums text-xs font-bold text-[var(--riso-ink)]">
                {Math.round(taskProgressFraction * 100)}%
              </span>
            }
          />

          <div className="space-y-3 text-xs flex-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[999px] bg-[var(--riso-p1)] shrink-0 border border-[var(--riso-ink)]"></span>
                <span className="font-bold text-[var(--riso-ink)] lowercase">tâches faites</span>
              </div>
              <div className="tabular-nums text-[var(--riso-ink-secondary)] pl-5 text-[11px] mt-0.5">
                <strong className="text-[var(--riso-ink)]">{completedTasks}</strong> sur {totalTasks} ({Math.round(taskProgressFraction * 100)}%)
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[999px] bg-[var(--riso-p2)] shrink-0 border border-[var(--riso-ink)]"></span>
                <span className="font-bold text-[var(--riso-ink)] lowercase">heures réalisées</span>
              </div>
              <div className="tabular-nums text-[var(--riso-ink-secondary)] pl-5 text-[11px] mt-0.5">
                <strong className="text-[var(--riso-ink)]">{formatHours(actualHoursDone)}</strong> sur {targetTotalHours} h ({Math.round(hoursProgressFraction * 100)}%)
              </div>
            </div>
          </div>
        </Card>

        {/* 5. Prochain objectif */}
        {nextMilestone && (
          <Card
            variant="default"
            radius="sm"
            interactive
            onClick={() => setActiveTab('parcours')}
            className="p-4 flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[8px] bg-[var(--riso-p3-light)] text-[var(--riso-ink)] flex items-center justify-center shrink-0 border-2 border-[var(--riso-ink)]">
                <IconJalon size={18} className="text-[var(--riso-ink)]" />
              </div>
              <div className="min-w-0 truncate">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--riso-ink-secondary)] block">
                  prochain objectif
                </span>
                <span className="font-bold text-[var(--riso-ink)] text-xs truncate block lowercase">
                  {nextMilestone.title}
                </span>
                <span className="tabular-nums text-[11px] text-[var(--riso-ink-secondary)]">
                  {formatFrenchDate(nextMilestone.calculatedDate, false)}
                </span>
              </div>
            </div>

            <Pill variant="default" className="shrink-0 bg-[var(--riso-p1-light)]">
              {milestoneDays === 0
                ? "aujourd'hui"
                : milestoneDays === 1
                ? 'demain'
                : milestoneDays! < 0
                ? `dépassé (${Math.abs(milestoneDays!)} j)`
                : `dans ${milestoneDays} j`}
            </Pill>
          </Card>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. VUE DESKTOP (>= 768px)                                     */}
      {/* ============================================================ */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-4 px-2 space-y-6 animate-in fade-in duration-200">
        {/* Top Header Row : Titre et 2 Compteurs en haut à droite */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[var(--riso-ink)] pb-4 gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--riso-ink-secondary)] block">
              {todayFormatted}
            </span>
            <h1 className="text-2xl font-bold text-[var(--riso-ink)] tracking-tight font-heading mt-0.5 lowercase">
              tableau de bord du jour
            </h1>
          </div>

          {/* En haut à droite : 2 compteurs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mis en avant : Prochain Rendu intermédiaire si présent */}
            {nextIntermediate && (
              <div
                className="bg-[var(--riso-p1-light)] text-[var(--riso-ink)] border-2 border-[var(--riso-ink)] shadow-riso-press px-3.5 py-1.5 rounded-[999px] text-xs font-bold flex items-center gap-2"
                title={`Rendu intermédiaire : ${nextIntermediate.name}`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--riso-p1)] shrink-0"></span>
                <span className="tabular-nums">
                  {nextIntermediate.days === 0
                    ? "aujourd'hui"
                    : nextIntermediate.days > 0
                    ? `J-${nextIntermediate.days}`
                    : `J+${Math.abs(nextIntermediate.days)}`}
                </span>
                <span>·</span>
                <span className="truncate max-w-[220px]">
                  rendu intermédiaire : {nextIntermediate.name}
                </span>
                <span>·</span>
                <span className="tabular-nums text-[11px]">
                  {formatFrenchDate(nextIntermediate.date, false)}
                </span>
              </div>
            )}

            {/* Secondaire : Rendu final */}
            <div className="bg-white text-[var(--riso-ink)] border-2 border-[var(--riso-line)] px-3 py-1.5 rounded-[999px] text-xs font-semibold tabular-nums">
              {finalBadge}
            </div>
          </div>
        </div>

        {/* Grand bouton principal : Je m'y mets (Desktop) */}
        <div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setIsInertiaOpen(true)}
            className="shadow-riso-primary min-h-[52px]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="font-heading">je m'y mets</span>
          </Button>
        </div>

        {/* 2 Colonnes : Gauche (60%) / Droite (40%) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Colonne Gauche : Tâche du moment */}
          <div className="col-span-12 lg:col-span-7 space-y-5">
            {currentTask ? (
              <Card variant="default" radius="md" className="p-7 relative overflow-hidden space-y-6">
                {/* Phase tag & Duration */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-[999px] shrink-0 border-2 border-[var(--riso-ink)]"
                      style={{ backgroundColor: phaseColor?.hex || 'var(--riso-p1)' }}
                    ></span>
                    <span className="font-bold text-[var(--riso-ink)] text-xs lowercase">
                      {taskPhase?.name || 'phase en cours'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 tabular-nums text-xs font-bold text-[var(--riso-ink)] bg-[var(--riso-paper)] px-3 py-1 rounded-[8px] border-2 border-[var(--riso-ink)]">
                    <Clock className="w-3.5 h-3.5 text-[var(--riso-ink)]" />
                    <span>{currentTask.durationMinutes} min</span>
                  </div>
                </div>

                {/* Titre */}
                <div className="py-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--riso-ink-secondary)] block mb-1">
                    tâche du moment
                  </span>
                  <h2 className="text-2xl xl:text-3xl font-bold text-[var(--riso-ink)] tracking-tight leading-snug font-heading lowercase">
                    {currentTask.title}
                  </h2>
                </div>

                {/* Responsable & Échéance */}
                <div className="flex items-center justify-between text-xs text-[var(--riso-ink-secondary)] pt-4 border-t-2 border-[var(--riso-line)]">
                  {settings.mode === 'groupe' ? (
                    <div className="flex items-center gap-2.5">
                      <AssigneeAvatar assignee={currentTask.assignee} size={28} />
                      <div>
                        <span className="text-[10px] text-[var(--riso-ink-secondary)] block leading-none">responsable</span>
                        <span className="font-bold text-[var(--riso-ink)]">{currentTask.assignee}</span>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2 tabular-nums text-xs">
                    <span className="text-[var(--riso-ink-secondary)]">échéance :</span>
                    <span className="font-bold text-[var(--riso-ink)] bg-[var(--riso-paper)] border-2 border-[var(--riso-ink)] px-2.5 py-0.5 rounded-[8px]">
                      {formatFrenchDate(currentTask.deadline, false)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1 min-h-[44px]"
                    onClick={() => handleStartTask(currentTask)}
                  >
                    <Play className="w-4 h-4 fill-[var(--riso-ink)] text-[var(--riso-ink)]" />
                    <span>commencer cette tâche</span>
                  </Button>

                  {pendingTasks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={handleNextTask}
                      title="passer à une autre tâche"
                    >
                      <span>autre tâche ({safeIndex + 1}/{pendingTasks.length})</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <EmptyState
                message={totalTasks === 0 ? "aucune tâche pour l'instant" : "rien de prévu aujourd'hui."}
                actionText="voir le parcours"
                onAction={() => setActiveTab('parcours')}
              />
            )}
          </div>

          {/* Colonne Droite : Anneaux, Objectif, Tâches suivantes */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            {/* Anneaux de progression concentriques */}
            <Card variant="flat" radius="sm" className="bg-white p-5 flex items-center gap-5 text-[var(--riso-ink)] border-2 border-[var(--riso-line)]">
              <ProgressRing
                outerFraction={taskProgressFraction}
                innerFraction={hoursProgressFraction}
                size={120}
                outerColor="var(--riso-p1)"
                innerColor="var(--riso-p2)"
                label={
                  <span className="tabular-nums text-xs font-bold text-[var(--riso-ink)]">
                    {Math.round(taskProgressFraction * 100)}%
                  </span>
                }
              />

              <div className="space-y-3 text-xs flex-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[999px] bg-[var(--riso-p1)] shrink-0 border border-[var(--riso-ink)]"></span>
                    <span className="font-bold text-[var(--riso-ink)] lowercase">tâches faites</span>
                  </div>
                  <div className="tabular-nums text-[var(--riso-ink-secondary)] pl-5 text-[11px] mt-0.5">
                    <strong className="text-[var(--riso-ink)]">{completedTasks}</strong> sur {totalTasks} ({Math.round(taskProgressFraction * 100)}%)
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[999px] bg-[var(--riso-p2)] shrink-0 border border-[var(--riso-ink)]"></span>
                    <span className="font-bold text-[var(--riso-ink)] lowercase">heures réalisées</span>
                  </div>
                  <div className="tabular-nums text-[var(--riso-ink-secondary)] pl-5 text-[11px] mt-0.5">
                    <strong className="text-[var(--riso-ink)]">{formatHours(actualHoursDone)}</strong> sur {targetTotalHours} h ({Math.round(hoursProgressFraction * 100)}%)
                  </div>
                </div>
              </div>
            </Card>

            {/* Prochain objectif */}
            {nextMilestone && (
              <Card
                variant="default"
                radius="sm"
                interactive
                onClick={() => setActiveTab('parcours')}
                className="p-4 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[8px] bg-[var(--riso-p3-light)] text-[var(--riso-ink)] flex items-center justify-center shrink-0 border-2 border-[var(--riso-ink)]">
                    <IconJalon size={18} className="text-[var(--riso-ink)]" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--riso-ink-secondary)] block">
                      prochain objectif
                    </span>
                    <span className="font-bold text-[var(--riso-ink)] text-xs truncate block lowercase">
                      {nextMilestone.title}
                    </span>
                    <span className="tabular-nums text-[11px] text-[var(--riso-ink-secondary)]">
                      {formatFrenchDate(nextMilestone.calculatedDate, false)}
                    </span>
                  </div>
                </div>

                <Pill variant="default" className="shrink-0 bg-[var(--riso-p1-light)]">
                  {milestoneDays === 0
                    ? "aujourd'hui"
                    : milestoneDays === 1
                    ? 'demain'
                    : milestoneDays! < 0
                    ? `dépassé (${Math.abs(milestoneDays!)} j)`
                    : `dans ${milestoneDays} j`}
                </Pill>
              </Card>
            )}

            {/* Ensuite (les 3 tâches suivantes) */}
            <Card variant="flat" radius="sm" className="bg-white p-4 space-y-3 border-2 border-[var(--riso-line)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--riso-ink)]">
                  ensuite
                </span>
                <span className="text-[11px] tabular-nums text-[var(--riso-ink-secondary)] font-bold">
                  {pendingTasks.length > 1 ? `${Math.min(3, pendingTasks.length - 1)} tâche(s)` : '0 tâche'}
                </span>
              </div>

              {nextThreeTasks.length === 0 ? (
                <p className="text-xs text-[var(--riso-ink-secondary)] py-2">
                  aucune autre tâche en attente.
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
                        className="p-2.5 rounded-[8px] border-2 border-[var(--riso-line)] hover:border-[var(--riso-ink)] hover:bg-[var(--riso-p1-light)] transition-all cursor-pointer flex items-center justify-between gap-3 group min-h-[44px]"
                        title="cliquer pour passer en tâche active"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-[999px] shrink-0 border border-[var(--riso-ink)]"
                            style={{ backgroundColor: tPhaseColor.hex }}
                          ></span>
                          <span className="font-bold text-xs text-[var(--riso-ink)] truncate lowercase">
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {settings.mode === 'groupe' && t.assignee && (
                            <AssigneeAvatar assignee={t.assignee} size={20} />
                          )}
                          <span className="tabular-nums text-[11px] font-bold text-[var(--riso-ink)] bg-[var(--riso-paper)] border border-[var(--riso-line)] px-1.5 py-0.5 rounded-[8px]">
                            {t.durationMinutes} min
                          </span>
                          <span className="text-sm font-bold text-[var(--riso-ink)] group-hover:translate-x-0.5 transition-transform">
                            ›
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Sessions de la semaine */}
            <Card
              variant="default"
              radius="sm"
              interactive
              onClick={() => setActiveTab('sessions')}
              className="p-4 space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--riso-ink)]">
                  sessions de la semaine
                </span>
                <span className="text-xs text-[var(--riso-ink)] font-bold flex items-center gap-1 hover:underline">
                  <span>voir l'agenda</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* 7 Days Row */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {currentWeekDays.map((day) => (
                  <div
                    key={day.iso}
                    className={`p-2 rounded-[8px] border-2 transition-colors min-h-[44px] ${
                      day.isToday
                        ? 'bg-[var(--riso-p1-light)] border-[var(--riso-ink)] font-bold text-[var(--riso-ink)]'
                        : 'bg-[var(--riso-paper)] border-[var(--riso-line)] text-[var(--riso-ink-secondary)] hover:border-[var(--riso-ink)]'
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
                          className={`w-2 h-2 rounded-[999px] border border-[var(--riso-ink)] ${
                            s.status === 'realisee' ? 'bg-[var(--riso-p2)]' : 'bg-[var(--riso-p1)]'
                          }`}
                        ></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal : Ajouter un rendu intermédiaire / Nouvel objectif */}
      {isAddIntermediateOpen && (
        <div
          className="fixed inset-0 z-50 bg-[var(--riso-ink)]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddIntermediateOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-md w-full border-2 border-[var(--riso-ink)] shadow-riso max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[var(--riso-paper)] border-b-2 border-[var(--riso-ink)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[var(--riso-ink)]" />
                <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading lowercase">
                  nouvel objectif : rendu intermédiaire
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddIntermediateOpen(false)}
                className="p-1.5 text-[var(--riso-ink-secondary)] hover:text-[var(--riso-ink)] rounded-[8px] hover:bg-[var(--riso-p1-light)] transition-colors cursor-pointer"
                aria-label="fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIntermediate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-[var(--riso-ink)] mb-1 lowercase">
                    intitulé de l'objectif <span className="text-[var(--riso-p4)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={newIntermediateTitle}
                    onChange={(e) => setNewIntermediateTitle(e.target.value)}
                    placeholder="ex: rendu intermédiaire, revue de maquette…"
                    className="w-full px-3 py-2 bg-white border-2 border-[var(--riso-line)] rounded-[8px] text-[var(--riso-ink)] font-medium focus:border-[var(--riso-ink)] focus:outline-none focus:ring-3 focus:ring-[var(--riso-p3)] min-h-[44px]"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[var(--riso-ink)] mb-1 lowercase">
                      date cible <span className="text-[var(--riso-p4)]">*</span>
                    </label>
                    <input
                      type="date"
                      value={newIntermediateDate}
                      onChange={(e) => setNewIntermediateDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[var(--riso-line)] rounded-[8px] text-[var(--riso-ink)] font-medium focus:border-[var(--riso-ink)] focus:outline-none focus:ring-3 focus:ring-[var(--riso-p3)] min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[var(--riso-ink)] mb-1 lowercase">
                      phase associée
                    </label>
                    <select
                      value={newIntermediatePhaseId}
                      onChange={(e) => setNewIntermediatePhaseId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[var(--riso-line)] rounded-[8px] text-[var(--riso-ink)] font-medium focus:border-[var(--riso-ink)] focus:outline-none focus:ring-3 focus:ring-[var(--riso-p3)] min-h-[44px]"
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
                  <label className="block font-bold text-[var(--riso-ink)] mb-1 lowercase">
                    notes (facultatif)
                  </label>
                  <textarea
                    rows={2}
                    value={newIntermediateNotes}
                    onChange={(e) => setNewIntermediateNotes(e.target.value)}
                    placeholder="critères d'évaluation, livrables attendus…"
                    className="w-full px-3 py-2 bg-white border-2 border-[var(--riso-line)] rounded-[8px] text-[var(--riso-ink)] focus:border-[var(--riso-ink)] focus:outline-none focus:ring-3 focus:ring-[var(--riso-p3)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[var(--riso-line)] shrink-0 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddIntermediateOpen(false)}
                >
                  annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newIntermediateTitle.trim()}
                >
                  créer l'objectif
                </Button>
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
