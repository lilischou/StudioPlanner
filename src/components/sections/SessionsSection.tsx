import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { WorkSession, SessionType } from '../../types/project';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Users,
  GraduationCap,
  Play,
  Check,
  X,
  BookOpen,
  Trash2,
  Pencil,
} from 'lucide-react';
import {
  diffInDays,
  formatFrenchDate,
  formatISODate,
} from '../../utils/dateCalculations';
import { PHASE_COLORS, RISO_THEME, getPhaseColor, getSessionTypeLabel } from '../../utils/theme';
import { buildGoogleCalendarUrl } from '../../utils/calendarLink';

export const SessionsSection: React.FC = () => {
  const {
    activeProject,
    addSession,
    updateSession,
    deleteSession,
    openFocusMode,
    setActiveTab,
    openJournalWithDraft,
  } = useProject();

  const { sessions, phases, settings } = activeProject;
  const todayISO = formatISODate(new Date());

  // Week navigation offset (0 = current week)
  const [weekOffset, setWeekOffset] = useState(0);

  // Bottom Sheet for session actions
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [actualDurationInput, setActualDurationInput] = useState<number>(2);
  const [moveDateInput, setMoveDateInput] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Floating "+" Add Session Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDay, setAddDay] = useState(todayISO);
  const [addType, setAddType] = useState<SessionType>(
    settings.mode === 'individuel' ? 'individuelle' : 'groupe'
  );
  const [addPhaseId, setAddPhaseId] = useState(phases[0]?.id || 'p1');
  const [addObjective, setAddObjective] = useState('');

  // Listen to keyboard shortcuts and custom events
  React.useEffect(() => {
    const handleNew = () => {
      setIsAddModalOpen(true);
    };
    const handleEscape = () => {
      setSelectedSession(null);
      setIsAddModalOpen(false);
    };
    const handleOpenSpecificSession = (e: Event) => {
      const customEvent = e as CustomEvent<{ sessionId: string }>;
      const targetId = customEvent.detail?.sessionId;
      if (!targetId) return;
      const found = sessions.find((s) => s.id === targetId);
      if (found) {
        const sessionDate = new Date(found.date);
        const todayMonday = getMonday(new Date());
        const diffWeeks = Math.round((sessionDate.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
        setWeekOffset(diffWeeks);
        handleOpenSessionSheet(found);
      }
    };
    window.addEventListener('studioplanner:new', handleNew);
    window.addEventListener('studioplanner:escape', handleEscape);
    window.addEventListener('studioplanner:open-session', handleOpenSpecificSession);
    return () => {
      window.removeEventListener('studioplanner:new', handleNew);
      window.removeEventListener('studioplanner:escape', handleEscape);
      window.removeEventListener('studioplanner:open-session', handleOpenSpecificSession);
    };
  }, [sessions]);

  // Compute Monday of the displayed week
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const mondayDate = getMonday(new Date(baseDate));
  const mondayISO = formatISODate(mondayDate);

  // 7 days of the week (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
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

  const weekSessions = sessions.filter((s) => {
    return s.date >= weekDays[0].iso && s.date <= weekDays[6].iso;
  });

  const totalPlannedHours = sessions.reduce(
    (sum, s) => sum + (s.plannedDurationHours || 0),
    0
  );

  const plannedHoursThisWeek = weekSessions.reduce(
    (sum, s) => sum + (s.plannedDurationHours || 0),
    0
  );

  const realizedHoursThisWeek = weekSessions
    .filter((s) => s.status === 'realisee')
    .reduce(
      (sum, s) => sum + (s.actualDurationHours || s.plannedDurationHours || 0),
      0
    );

  const handleOpenSessionSheet = (session: WorkSession) => {
    setSelectedSession(session);
    setIsEditingTitle(false);
    setActualDurationInput(
      session.actualDurationHours || session.plannedDurationHours || 2
    );
    setMoveDateInput(session.date);
  };

  const handleLaunchSession = (session: WorkSession) => {
    setSelectedSession(null);
    openFocusMode({
      type: 'session',
      id: session.id,
      title: session.objective,
      durationMinutes: Math.round((session.plannedDurationHours || 2) * 60),
      phaseId: session.phaseId,
    });
  };

  const handleMarkAsDone = (session: WorkSession) => {
    updateSession(session.id, {
      status: 'realisee',
      actualDurationHours: actualDurationInput,
    });
    setSelectedSession(null);
  };

  const handleMoveSession = (session: WorkSession) => {
    if (moveDateInput) {
      updateSession(session.id, { date: moveDateInput });
      setSelectedSession(null);
    }
  };

  const handleLogbookFromSession = (session: WorkSession) => {
    openJournalWithDraft({
      date: session.date,
      sessionId: session.id,
      author: settings.team[0]?.name || 'Moi-même',
      phaseId: session.phaseId,
      title: session.objective,
      whatWeDid: `Session ${session.type === 'individuelle' || (session.type as string) === 'solo' ? 'solo' : session.type === 'groupe' ? 'en groupe' : 'encadrée'} : ${session.objective}`,
      whatWeNoticed: '',
      whatWeDecided: '',
      tags: [getSessionTypeLabel(session.type).toLowerCase()],
    });
    updateSession(session.id, { status: 'realisee' });
    setSelectedSession(null);
  };

  const handleQuickAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const plannedDuration =
      addType === 'individuelle'
        ? settings.defaultDurations.individuelle
        : addType === 'groupe'
        ? settings.defaultDurations.groupe
        : settings.defaultDurations.encadree;

    addSession({
      date: addDay,
      type: addType,
      phaseId: addPhaseId,
      objective: addObjective.trim() || 'Session de travail',
      plannedDurationHours: plannedDuration,
      status: 'planifiee',
      attendees: [],
    });

    setAddObjective('');
    setIsAddModalOpen(false);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE VIEW (< 768px)                                      */}
      {/* ============================================================ */}
      <div className="block md:hidden max-w-md mx-auto py-2 px-1 space-y-6 animate-in fade-in duration-200 relative pb-16">
        {/* Bande horizontale des 7 jours & Résumé */}
        <div className="riso-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-[8px] hover:bg-riso-p1-light text-riso-ink transition-colors cursor-pointer border border-transparent hover:border-riso-ink"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h2 className="text-sm font-bold text-riso-ink tracking-tight font-heading">
                Semaine du {formatFrenchDate(mondayISO, false)}
              </h2>
              {weekOffset === 0 && (
                <span className="text-[11px] font-bold text-riso-ink bg-riso-p1-light border-2 border-riso-ink px-2 py-0.5 rounded-[999px]">
                  Semaine en cours
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-[8px] hover:bg-riso-p1-light text-riso-ink transition-colors cursor-pointer border border-transparent hover:border-riso-ink"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7 Days Row */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {weekDays.map((d) => {
              const hasSessions = d.sessions.length > 0;
              const primaryPhase = d.sessions[0]?.phaseId;
              const dotColor = primaryPhase
                ? getPhaseColor(primaryPhase, phases).hex
                : '#2F6DBB';

              return (
                <div
                  key={d.iso}
                  className="flex flex-col items-center justify-center py-1 cursor-pointer select-none"
                >
                  <span className="text-[11px] font-bold text-riso-ink-secondary uppercase">
                    {d.dayName}
                  </span>

                  <div
                    className={`w-8 h-8 rounded-[999px] flex items-center justify-center tabular-nums text-xs font-bold mt-1 transition-all ${
                      d.isToday
                        ? 'border-2 border-riso-ink text-riso-ink bg-riso-p1-light'
                        : 'text-riso-ink hover:bg-riso-p1-light'
                    }`}
                  >
                    {d.dayNum}
                  </div>

                  <div className="h-1.5 flex items-center justify-center mt-1">
                    {hasSessions ? (
                      <span
                        className="w-2 h-2 rounded-[999px] border-2 border-riso-ink"
                        style={{ backgroundColor: dotColor }}
                      ></span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t-2 border-riso-line flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-riso-ink-secondary tabular-nums font-bold">
            <span>
              Total : <strong className="text-riso-ink">{totalPlannedHours} h</strong> prévues ({sessions.length} sessions)
            </span>
            <span>
              Semaine : <strong className="text-riso-ink">{plannedHoursThisWeek} h</strong> prévues ·{' '}
              <strong className="text-riso-p2">{realizedHoursThisWeek} h</strong> faites
            </span>
          </div>
        </div>

        {/* Liste verticale des jours */}
        <div className="space-y-4">
          {weekDays.map((d) => {
            return (
              <div key={d.iso} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-xs font-bold ${d.isToday ? 'text-riso-ink' : 'text-riso-ink-secondary'}`}>
                    {d.dayName}. {d.dayNum}
                  </span>
                  {d.isToday && (
                    <span className="text-[11px] font-bold bg-riso-p1-light text-riso-ink border-2 border-riso-ink px-2 py-0.2 rounded-[999px]">
                      Aujourd'hui
                    </span>
                  )}
                </div>

                {d.sessions.length === 0 ? (
                  <div className="p-3 rounded-[8px] border-2 border-dashed border-riso-line text-center text-xs text-riso-ink-secondary bg-riso-paper">
                    Rien de prévu
                  </div>
                ) : (
                  <div className="space-y-2">
                    {d.sessions.map((session) => {
                      const phase = phases.find((p) => p.id === session.phaseId);
                      const colorInfo = getPhaseColor(phase || session.phaseId, phases);
                      const isDone = session.status === 'realisee';
                      const isPastUncompleted = !isDone && session.date < todayISO;

                      return (
                        <div
                          key={session.id}
                          onClick={() => handleOpenSessionSheet(session)}
                          className={`p-3.5 rounded-[8px] border-2 border-riso-ink transition-all cursor-pointer flex items-center gap-3 ${
                            isDone
                              ? 'bg-riso-p2-light opacity-90'
                              : isPastUncompleted
                              ? 'bg-riso-p5-light'
                              : 'bg-white shadow-riso-press'
                          }`}
                        >
                          {/* Pastille */}
                          <div
                            className="w-10 h-10 rounded-[999px] border-2 border-riso-ink flex items-center justify-center shrink-0 shadow-2xs relative"
                            style={{
                              backgroundColor: isDone ? 'var(--riso-p1-light)' : colorInfo.hex,
                            }}
                          >
                            {(session.type === 'individuelle' || (session.type as string) === 'solo') && (
                              <User className="w-5 h-5 text-riso-ink" />
                            )}
                            {session.type === 'groupe' && (
                              <Users className="w-5 h-5 text-white" />
                            )}
                            {session.type === 'encadree' && (
                              <GraduationCap className="w-5 h-5 text-riso-ink" />
                            )}

                            {isDone && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-riso-p2 border-2 border-riso-ink rounded-[999px] flex items-center justify-center text-white text-[9px] font-bold">
                                ✓
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <h3
                              className={`font-bold text-xs sm:text-sm leading-snug line-clamp-3 ${
                                isDone ? 'line-through text-riso-ink-secondary' : 'text-riso-ink'
                              }`}
                            >
                              {session.objective}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-riso-ink-secondary mt-1 tabular-nums font-bold">
                              <span className="text-riso-ink">
                                {session.plannedDurationHours} h
                              </span>
                              <span>·</span>
                              <span className="truncate text-riso-ink-secondary">
                                {phase?.shortName || phase?.name}
                              </span>
                            </div>
                          </div>

                          {/* Statut & Agenda - reste strictement à l'intérieur */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            <a
                              href={buildGoogleCalendarUrl({
                                title: session.objective,
                                durationMinutes: Math.round((session.plannedDurationHours || 2) * 60),
                                date: session.date,
                                projectName: activeProject.settings.name,
                                phaseName: phase?.shortName || phase?.name,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ajouter à l'Agenda"
                              aria-label="Ajouter à l'Agenda"
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 flex items-center justify-center rounded-[8px] border-2 border-riso-ink bg-white text-riso-ink shadow-riso-press hover:-translate-y-0.5 hover:shadow-riso active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                            </a>

                            {isDone ? (
                              <span className="text-xs text-riso-p2 font-bold riso-pill bg-white">
                                Fait
                              </span>
                            ) : isPastUncompleted ? (
                              <span className="text-[11px] text-riso-p4 font-bold bg-riso-p4-light border-2 border-riso-ink px-2 py-0.5 rounded-[999px] whitespace-normal text-center max-w-[70px]">
                                À replanifier
                              </span>
                            ) : (
                              <span className="text-[11px] text-riso-ink-secondary font-medium">Prévue</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bouton rond flottant « + » */}
        <button
          type="button"
          onClick={() => {
            setAddDay(todayISO);
            setIsAddModalOpen(true);
          }}
          className="fixed bottom-20 right-5 z-30 w-13 h-13 rounded-[999px] bg-riso-p1 hover:bg-riso-ink active:translate-y-1 text-white border-2 border-riso-ink shadow-riso-primary active:shadow-none flex items-center justify-center transition-all cursor-pointer md:hidden"
          title="Nouvelle session"
          aria-label="Nouvelle session"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Bottom Sheet Mobile pour session sélectionnée */}
        {selectedSession && (
          <div
            className="fixed inset-0 z-50 bg-riso-ink/40 backdrop-blur-xs flex md:hidden items-end justify-center"
            onClick={() => setSelectedSession(null)}
          >
            <div
              className="bg-white w-full max-w-lg rounded-t-[16px] border-t-2 border-x-2 border-riso-ink shadow-[0_-4px_0_var(--riso-ink)] max-h-[85vh] flex flex-col p-6 pb-28 sm:pb-8 overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-riso-ink/30 rounded-[999px] mx-auto -mt-2 mb-2 shrink-0"></div>

              <div className="flex items-start justify-between shrink-0 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-riso-ink-secondary uppercase tracking-wider block">
                    Session {getSessionTypeLabel(selectedSession.type)} · {selectedSession.plannedDurationHours} h
                  </span>
                  {isEditingTitle ? (
                    <input
                      type="text"
                      autoFocus
                      value={selectedSession.objective}
                      onChange={(e) => {
                        const newObjective = e.target.value;
                        updateSession(selectedSession.id, { objective: newObjective });
                        setSelectedSession((prev) =>
                          prev ? { ...prev, objective: newObjective } : null
                        );
                      }}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingTitle(false);
                        }
                      }}
                      className="w-full mt-1 px-2.5 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-sm font-bold text-riso-ink focus:outline-none"
                    />
                  ) : (
                    <h3
                      onClick={() => setIsEditingTitle(true)}
                      title="Cliquer pour modifier le titre"
                      className="text-base font-bold text-riso-ink mt-0.5 font-heading cursor-pointer hover:underline flex items-center gap-1.5 group"
                    >
                      <span className="truncate">{selectedSession.objective || 'Sans titre'}</span>
                      <Pencil className="w-3.5 h-3.5 text-riso-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h3>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-1 text-riso-ink-secondary hover:text-riso-ink rounded-[8px]"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleLaunchSession(selectedSession)}
                  className="btn-riso-primary w-full text-xs"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Lancer la session (Mode Focus)</span>
                </button>

                <div className="p-3.5 bg-riso-paper rounded-[8px] border-2 border-riso-ink flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-riso-ink">
                    <Check className="w-4 h-4 text-riso-p2" />
                    <span>Durée réelle :</span>
                    <input
                      type="number"
                      step={0.25}
                      min={0.25}
                      max={12}
                      value={actualDurationInput}
                      onChange={(e) => setActualDurationInput(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-center font-bold text-xs"
                    />
                    <span>h</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMarkAsDone(selectedSession)}
                    className="btn-riso-secondary py-1.5 px-3 text-xs"
                  >
                    Valider
                  </button>
                </div>

                <div className="p-3.5 bg-riso-paper rounded-[8px] border-2 border-riso-ink flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-riso-ink font-bold">
                    <CalendarIcon className="w-4 h-4 text-riso-ink" />
                    <span>Déplacer au :</span>
                    <input
                      type="date"
                      value={moveDateInput}
                      onChange={(e) => setMoveDateInput(e.target.value)}
                      className="px-2 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-xs font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMoveSession(selectedSession)}
                    disabled={!moveDateInput || moveDateInput === selectedSession.date}
                    className="btn-riso-secondary py-1.5 px-3 text-xs"
                  >
                    Déplacer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogbookFromSession(selectedSession)}
                  className="btn-riso-secondary w-full text-xs"
                >
                  <BookOpen className="w-4 h-4 text-riso-ink" />
                  <span>Consigner au journal de bord</span>
                </button>

                <a
                  href={buildGoogleCalendarUrl({
                    title: selectedSession.objective,
                    durationMinutes: Math.round((selectedSession.plannedDurationHours || 2) * 60),
                    date: selectedSession.date,
                    projectName: activeProject.settings.name,
                    phaseName: phases.find((p) => p.id === selectedSession.phaseId)?.shortName || phases.find((p) => p.id === selectedSession.phaseId)?.name,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-riso-secondary w-full text-xs justify-center flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4 text-riso-ink" />
                  <span>Ajouter à l'Agenda</span>
                </a>

                <div className="pt-2 border-t-2 border-riso-line">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer cette session de travail ?')) {
                        deleteSession(selectedSession.id);
                        setSelectedSession(null);
                      }
                    }}
                    className="w-full py-2 px-3 text-xs font-bold text-riso-p4 hover:bg-riso-p4-light rounded-[8px] border-2 border-transparent hover:border-riso-p4 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer cette séance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP / TABLET VIEW (>= 768px)                          */}
      {/* ============================================================ */}
      <div className="hidden md:block max-w-[1280px] mx-auto py-4 px-2 space-y-6 animate-in fade-in duration-200">
        {/* Top Bar Agenda Header */}
        <div className="riso-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 rounded-[8px] hover:bg-riso-p1-light text-riso-ink transition-colors cursor-pointer border-2 border-riso-ink"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-3.5 py-1.5 rounded-[999px] hover:bg-riso-p1-light text-riso-ink text-xs font-bold transition-colors cursor-pointer border-2 border-riso-ink"
            >
              Cette semaine
            </button>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-2 rounded-[8px] hover:bg-riso-p1-light text-riso-ink transition-colors cursor-pointer border-2 border-riso-ink"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="font-bold text-sm text-riso-ink ml-2 font-heading">
              Semaine du {formatFrenchDate(mondayISO, false)} au {formatFrenchDate(weekDays[6].iso, false)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-riso-ink bg-riso-paper px-3.5 py-1.5 rounded-[999px] border-2 border-riso-ink tabular-nums font-bold">
              Total prévu : <strong>{totalPlannedHours} h</strong> ({sessions.length} sessions)
            </div>
            <div className="text-xs text-riso-ink bg-riso-paper px-3.5 py-1.5 rounded-[999px] border-2 border-riso-ink tabular-nums font-bold">
              Semaine : <strong>{plannedHoursThisWeek} h</strong> prévues ·{' '}
              <strong className="text-riso-p2">{realizedHoursThisWeek} h</strong> réalisées
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddDay(todayISO);
              setIsAddModalOpen(true);
            }}
            className="btn-riso-primary text-xs"
            title="Nouvelle session"
            aria-label="Nouvelle session"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle session</span>
          </button>
        </div>

        {/* 7-Column Agenda Grid */}
        <div className="grid grid-cols-7 gap-3 min-h-[540px]">
          {weekDays.map((d) => {
            const hasSessions = d.sessions.length > 0;

            return (
              <div
                key={d.iso}
                className={`flex flex-col rounded-[8px] border-2 border-riso-ink shadow-riso transition-all ${
                  d.isToday ? 'bg-riso-p1-light' : 'bg-white'
                }`}
              >
                {/* Column Day Header */}
                <div
                  className={`p-3 border-b-2 border-riso-ink text-center select-none ${
                    d.isToday ? 'bg-riso-p1-light' : 'bg-riso-paper'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-riso-ink-secondary block">
                    {d.dayName}
                  </span>
                  <div className="mt-0.5 flex items-center justify-center">
                    <span
                      className={`w-7 h-7 rounded-[999px] flex items-center justify-center tabular-nums text-xs font-bold ${
                        d.isToday
                          ? 'bg-riso-ink text-white'
                          : 'text-riso-ink'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                  </div>
                </div>

                {/* Column Body */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {!hasSessions ? (
                    <div className="h-full min-h-[140px]" />
                  ) : (
                    d.sessions.map((session) => {
                      const phase = phases.find((p) => p.id === session.phaseId);
                      const phaseColor = getPhaseColor(phase || session.phaseId, phases);
                      const isDone = session.status === 'realisee';
                      const duration = session.plannedDurationHours || 2;

                      const minHeightClass =
                        duration <= 1
                          ? 'min-h-[75px]'
                          : duration === 2
                          ? 'min-h-[110px]'
                          : 'min-h-[145px]';

                      return (
                        <div
                          key={session.id}
                          onClick={() => handleOpenSessionSheet(session)}
                          className={`${minHeightClass} p-2.5 rounded-[8px] border-2 border-riso-ink bg-white hover:translate-y-[-1px] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                            isDone ? 'opacity-85 bg-riso-p2-light' : ''
                          }`}
                        >
                          {/* Accent Color Left Strip */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5"
                            style={{ backgroundColor: phaseColor.hex }}
                          ></div>

                          <div className="pl-1">
                            <div className="flex items-center gap-1.5 text-[11px] mb-1 tabular-nums font-bold">
                              <span className="min-w-0 flex-1 truncate font-bold text-riso-ink" title={phase?.name || phase?.shortName}>
                                {phase?.shortName || phase?.name || 'Phase'}
                              </span>
                              <span className="shrink-0 whitespace-nowrap bg-riso-paper border-2 border-riso-ink px-1.5 rounded-[999px] text-riso-ink">
                                {duration} h
                              </span>
                            </div>

                            {/* Objectif sur 3 lignes */}
                            <h4
                              className={`text-xs font-bold text-riso-ink leading-snug line-clamp-3 break-words hyphens-auto ${
                                isDone ? 'line-through text-riso-ink-secondary' : ''
                              }`}
                            >
                              {session.objective}
                            </h4>
                          </div>

                          {/* Bottom tags avec étiquette 'Fait' qui reste à l'intérieur */}
                          <div className="pl-1 pt-1.5 flex items-center gap-1 text-[11px] text-riso-ink-secondary border-t border-riso-line mt-2">
                            <span className="min-w-0 inline-flex items-center gap-1 font-bold text-riso-ink truncate">
                              {(session.type === 'individuelle' || (session.type as string) === 'solo') && <User className="w-3 h-3 text-riso-ink" />}
                              {session.type === 'groupe' && settings.mode === 'groupe' && (
                                <Users className="w-3 h-3 text-riso-ink" />
                              )}
                              {session.type === 'encadree' && (
                                <GraduationCap className="w-3 h-3 text-riso-ink" />
                              )}
                              <span>
                                {getSessionTypeLabel(session.type)}
                              </span>
                            </span>

                            <a
                                  href={buildGoogleCalendarUrl({
                                    title: session.objective,
                                    durationMinutes: Math.round(duration * 60),
                                    date: session.date,
                                    projectName: activeProject.settings.name,
                                    phaseName: phase?.shortName || phase?.name,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ajouter à l'Agenda"
                                  aria-label="Ajouter à l'Agenda"
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 w-6 h-6 ml-auto flex items-center justify-center rounded-[8px] border-2 border-riso-ink bg-white text-riso-ink hover:bg-riso-p1-light transition-all cursor-pointer"
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                </a>
                            {isDone && (
                              <span className="bg-riso-p2 text-white font-bold px-1.5 py-0.5 rounded-[999px] text-[10px] flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Fait</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Drawer Desktop (420px) */}
        {selectedSession && (
          <div
            className="fixed inset-0 z-50 bg-riso-ink/40 backdrop-blur-2xs hidden md:flex justify-end"
            onClick={() => setSelectedSession(null)}
          >
            <div
              className="w-[420px] max-w-full h-full bg-white shadow-2xl p-7 border-l-2 border-riso-ink overflow-y-auto animate-in slide-in-from-right duration-200 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pb-4 border-b-2 border-riso-line flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-riso-ink-secondary uppercase tracking-wider block">
                    Session {getSessionTypeLabel(selectedSession.type)} · {selectedSession.plannedDurationHours} h
                  </span>
                  {isEditingTitle ? (
                    <input
                      type="text"
                      autoFocus
                      value={selectedSession.objective}
                      onChange={(e) => {
                        const newObjective = e.target.value;
                        updateSession(selectedSession.id, { objective: newObjective });
                        setSelectedSession((prev) =>
                          prev ? { ...prev, objective: newObjective } : null
                        );
                      }}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingTitle(false);
                        }
                      }}
                      className="w-full mt-1 px-2.5 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-base font-bold text-riso-ink focus:outline-none"
                    />
                  ) : (
                    <h3
                      onClick={() => setIsEditingTitle(true)}
                      title="Cliquer pour modifier le titre"
                      className="text-xl font-bold text-riso-ink mt-1 font-heading cursor-pointer hover:underline flex items-center gap-2 group"
                    >
                      <span>{selectedSession.objective || 'Sans titre'}</span>
                      <Pencil className="w-4 h-4 text-riso-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h3>
                  )}
                  <p className="text-xs text-riso-ink-secondary tabular-nums mt-0.5">
                    Date prévue : {formatFrenchDate(selectedSession.date, false)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-1.5 text-riso-ink-secondary hover:text-riso-ink rounded-[8px] hover:bg-riso-p1-light transition-colors cursor-pointer"
                  title="Fermer (Échap)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleLaunchSession(selectedSession)}
                  className="btn-riso-primary w-full text-xs py-3"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Lancer la session (Mode Focus)</span>
                </button>

                <div className="p-3.5 bg-riso-paper rounded-[8px] border-2 border-riso-ink flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-riso-ink">
                    <Check className="w-4 h-4 text-riso-p2" />
                    <span>Durée réelle passée :</span>
                    <input
                      type="number"
                      step={0.25}
                      min={0.25}
                      max={12}
                      value={actualDurationInput}
                      onChange={(e) => setActualDurationInput(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-center font-bold text-xs"
                    />
                    <span>h</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMarkAsDone(selectedSession)}
                    className="btn-riso-secondary py-1.5 px-3 text-xs"
                  >
                    Valider
                  </button>
                </div>

                <div className="p-3.5 bg-riso-paper rounded-[8px] border-2 border-riso-ink flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-riso-ink font-bold">
                    <CalendarIcon className="w-4 h-4 text-riso-ink" />
                    <span>Déplacer au :</span>
                    <input
                      type="date"
                      value={moveDateInput}
                      onChange={(e) => setMoveDateInput(e.target.value)}
                      className="px-2 py-1 bg-white border-2 border-riso-ink rounded-[8px] text-xs font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMoveSession(selectedSession)}
                    disabled={!moveDateInput || moveDateInput === selectedSession.date}
                    className="btn-riso-secondary py-1.5 px-3 text-xs"
                  >
                    Déplacer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogbookFromSession(selectedSession)}
                  className="btn-riso-secondary w-full text-xs"
                >
                  <BookOpen className="w-4 h-4 text-riso-ink" />
                  <span>Consigner au journal de bord</span>
                </button>

                <a
                  href={buildGoogleCalendarUrl({
                    title: selectedSession.objective,
                    durationMinutes: Math.round((selectedSession.plannedDurationHours || 2) * 60),
                    date: selectedSession.date,
                    projectName: activeProject.settings.name,
                    phaseName: phases.find((p) => p.id === selectedSession.phaseId)?.shortName || phases.find((p) => p.id === selectedSession.phaseId)?.name,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-riso-secondary w-full text-xs justify-center flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4 text-riso-ink" />
                  <span>Ajouter à l'Agenda</span>
                </a>

                <div className="pt-2 border-t-2 border-riso-line text-right">
                  <button
                    type="button"
                    onClick={() => {
                      deleteSession(selectedSession.id);
                      setSelectedSession(null);
                    }}
                    className="text-xs text-riso-p4 hover:underline font-bold cursor-pointer"
                  >
                    Supprimer cette session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajout Rapide */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-riso-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="riso-card max-w-sm w-full p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-riso-line pb-3 shrink-0">
              <h3 className="font-bold text-base text-riso-ink font-heading">
                Nouvelle session
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-riso-ink-secondary hover:text-riso-ink rounded-[8px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSession} className="flex-1 overflow-y-auto pt-4 space-y-4 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-riso-ink block uppercase tracking-wider text-[11px]">
                    1. Choisir le jour
                  </label>
                  <input
                    type="date"
                    value={addDay}
                    onChange={(e) => setAddDay(e.target.value)}
                    className="w-full px-3 py-2 bg-riso-paper border-2 border-riso-ink rounded-[8px] text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-riso-ink block uppercase tracking-wider text-[11px]">
                    2. Type de session
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddType('individuelle')}
                      className={`p-2.5 rounded-[8px] border-2 border-riso-ink text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        addType === 'individuelle'
                          ? 'bg-riso-p1 text-white font-bold shadow-riso-press'
                          : 'bg-riso-paper text-riso-ink'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Solo</span>
                      <span className="text-[10px] opacity-80 tabular-nums">
                        {settings.defaultDurations.individuelle} h
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAddType('groupe')}
                      className={`p-2.5 rounded-[8px] border-2 border-riso-ink text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        addType === 'groupe'
                          ? 'bg-riso-p1 text-white font-bold shadow-riso-press'
                          : 'bg-riso-paper text-riso-ink'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Groupe</span>
                      <span className="text-[10px] opacity-80 tabular-nums">
                        {settings.defaultDurations.groupe} h
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAddType('encadree')}
                      className={`p-2.5 rounded-[8px] border-2 border-riso-ink text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        addType === 'encadree'
                          ? 'bg-riso-p1 text-white font-bold shadow-riso-press'
                          : 'bg-riso-paper text-riso-ink'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Tuteur</span>
                      <span className="text-[10px] opacity-80 tabular-nums">
                        {settings.defaultDurations.encadree} h
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-riso-ink block uppercase tracking-wider text-[11px]">
                    3. Phase associée
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {phases.map((p) => {
                      const color = getPhaseColor(p, phases).hex;
                      const isSelected = addPhaseId === p.id;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setAddPhaseId(p.id)}
                          className={`p-2 rounded-[8px] border-2 border-riso-ink text-left transition-all cursor-pointer truncate flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-riso-p1-light font-bold text-riso-ink'
                              : 'bg-white text-riso-ink-secondary'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-[999px] border-2 border-riso-ink shrink-0"
                            style={{ backgroundColor: color }}
                          ></span>
                          <span className="truncate text-[11px] font-bold">{p.nom || p.name || p.shortName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-riso-ink text-[11px] block font-bold">
                    Objectif de la session
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Atelier de croquis rapides ou tests de maquettes"
                    value={addObjective}
                    onChange={(e) => setAddObjective(e.target.value)}
                    className="w-full px-3 py-2 bg-riso-paper border-2 border-riso-ink rounded-[8px] text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 shrink-0">
                <button
                  type="submit"
                  className="btn-riso-primary w-full text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer la session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
