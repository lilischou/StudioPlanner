import React, { useState, useEffect, useRef } from 'react';
import { useProject, FocusTarget } from '../../context/ProjectContext';
import {
  X,
  Play,
  Pause,
  Check,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { PHASE_COLORS } from '../sections/TodaySection';
import { formatISODate } from '../../utils/dateCalculations';

export const FocusModeModal: React.FC = () => {
  const {
    activeProject,
    activeFocusTarget,
    closeFocusMode,
    updateTask,
    updateSession,
    addSession,
    setActiveTab,
    openJournalWithDraft,
  } = useProject();

  if (!activeFocusTarget) return null;

  return (
    <FocusModeContent
      target={activeFocusTarget}
      onClose={closeFocusMode}
      updateTask={updateTask}
      updateSession={updateSession}
      addSession={addSession}
      setActiveTab={setActiveTab}
      openJournalWithDraft={openJournalWithDraft}
      settingsMode={activeProject.settings.mode}
    />
  );
};

interface ContentProps {
  target: FocusTarget;
  onClose: () => void;
  updateTask: any;
  updateSession: any;
  addSession: any;
  setActiveTab: any;
  openJournalWithDraft: (draft: any) => void;
  settingsMode: string;
}

const FocusModeContent: React.FC<ContentProps> = ({
  target,
  onClose,
  updateTask,
  updateSession,
  addSession,
  setActiveTab,
  openJournalWithDraft,
  settingsMode,
}) => {
  const totalSecondsPlanned = Math.max(60, (target.durationMinutes || 45) * 60);

  // Time tracking based on real start timestamp so timer survives recalculations
  const startTimeRef = useRef<number>(Date.now());
  const pausedAccumulatedRef = useRef<number>(0);
  const pauseStartRef = useRef<number | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompletedState, setIsCompletedState] = useState(false);

  // Tick effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused && !isCompletedState) {
        const now = Date.now();
        const effectiveElapsed = Math.floor(
          (now - startTimeRef.current - pausedAccumulatedRef.current) / 1000
        );
        setElapsedSeconds(effectiveElapsed);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isPaused, isCompletedState]);

  // Handle Pause / Resume
  const togglePause = () => {
    if (isPaused) {
      // Resuming
      if (pauseStartRef.current) {
        pausedAccumulatedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setIsPaused(false);
    } else {
      // Pausing
      pauseStartRef.current = Date.now();
      setIsPaused(true);
    }
  };

  // Remaining and overtime calculation
  const remainingSeconds = Math.max(0, totalSecondsPlanned - elapsedSeconds);
  const overtimeSeconds = Math.max(0, elapsedSeconds - totalSecondsPlanned);
  const isTimeOver = elapsedSeconds >= totalSecondsPlanned;

  // Fraction for the emptying circular disk (from 1 down to 0)
  const remainingFraction = Math.max(0, remainingSeconds / totalSecondsPlanned);

  // Color of phase
  const phaseColor = PHASE_COLORS[target.phaseId] || {
    bg: 'bg-riso-p5',
    hex: 'var(--riso-p5)',
    text: 'text-riso-ink',
  };

  // SVG circular disk parameters
  const size = 260;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingFraction);

  // Format time display
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle "J'ai fini"
  const handleFinish = () => {
    const todayISO = formatISODate(new Date());
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const actualHours = Math.round((actualMinutes / 60) * 10) / 10;

    if (target.type === 'task') {
      // Mark task as done
      updateTask(target.id, { status: 'fait' });

      // Record a completed session
      addSession({
        date: todayISO,
        type: settingsMode === 'individuel' ? 'individuelle' : 'groupe',
        phaseId: target.phaseId,
        objective: target.title,
        plannedDurationHours: Math.round((target.durationMinutes / 60) * 10) / 10,
        actualDurationHours: actualHours,
        attendees: [],
        status: 'realisee',
      });
    } else if (target.type === 'session') {
      // Mark session as done
      updateSession(target.id, {
        status: 'realisee',
        actualDurationHours: actualHours,
      });
    }

    setIsCompletedState(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-riso-ink flex flex-col justify-between text-white p-6 sm:p-10 select-none animate-in fade-in duration-200">
      {/* 3. Croix discrète pour quitter */}
      <div className="flex items-center justify-between max-w-lg w-full mx-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-riso-ink-subtle">
          Mode Focus
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-riso-ink-subtle hover:text-white rounded-full hover:bg-riso-p1 transition-colors cursor-pointer"
          aria-label="Quitter le mode focus"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!isCompletedState ? (
        /* Active Focus View */
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg w-full mx-auto space-y-8 my-auto">
          {/* Au-dessus : Titre de la tâche */}
          <div className="text-center px-4 space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {target.title}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-riso-ink border border-riso-ink text-xs text-riso-ink-subtle">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: phaseColor.hex }}
              ></span>
              <span>Durée prévue : {target.durationMinutes} min</span>
            </div>
          </div>

          {/* Au centre : Grand minuteur visuel circulaire qui se vide */}
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="rotate-[-90deg]"
            >
              {/* Background circle track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="var(--riso-ink)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Progress emptying circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={phaseColor.hex}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 ease-linear"
              />
            </svg>

            {/* Inner Content : Temps restant en gros chiffres */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-white tabular-nums">
                {isTimeOver
                  ? `+${formatTime(overtimeSeconds)}`
                  : formatTime(remainingSeconds)}
              </span>

              <span className="text-xs text-riso-ink-subtle mt-2 font-medium">
                {isPaused
                  ? 'En pause'
                  : isTimeOver
                  ? 'Temps prévu écoulé'
                  : 'Temps restant'}
              </span>
            </div>
          </div>

            {/* Notification douce si le temps est dépassé, sans culpabiliser */}
            {isTimeOver && (
              <div className="px-4 py-2 bg-riso-ink/90 border border-riso-ink rounded-[16px] text-center text-xs text-riso-ink-subtle animate-in fade-in">
                <span>Le temps prévu est écoulé. Prenez le temps nécessaire pour conclure votre geste.</span>
              </div>
            )}

          {/* Trois boutons seulement : Pause / Reprendre et J'ai fini */}
          <div className="w-full flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={togglePause}
              className="py-3 px-5 rounded-[16px] bg-riso-ink hover:bg-riso-p1 active:scale-95 border border-riso-ink text-riso-line text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reprendre</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="py-3.5 px-8 rounded-[16px] bg-white hover:bg-riso-p1-light active:scale-95 text-riso-ink font-bold text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>J'ai fini</span>
            </button>
          </div>
        </div>
      ) : (
        /* 4. Écran de fin avec la mascotte et « C'est fait. » */
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full mx-auto space-y-6 text-center my-auto animate-in zoom-in-95 duration-200">
          {/* Mascotte de StudioPlanner dans un carré blanc arrondi (mode sombre) */}
          <div className="w-24 h-24 rounded-[24px] bg-white border border-riso-ink p-2 flex items-center justify-center shadow-2xl relative">
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
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
              style={{ backgroundColor: phaseColor.hex }}
            >
              ✓
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              C'est fait.
            </h2>
            <p className="text-xs text-riso-ink-subtle max-w-xs leading-relaxed">
              Session enregistrée avec succès. Votre avancement et vos anneaux sont à jour.
            </p>
          </div>

          <div className="w-full space-y-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                openJournalWithDraft({
                  date: formatISODate(new Date()),
                  phaseId: target.phaseId,
                  taskId: target.type === 'task' ? target.id : undefined,
                  sessionId: target.type === 'session' ? target.id : undefined,
                  title: target.title,
                  whatWeDid: `Travail sur : ${target.title} (${Math.max(1, Math.round(elapsedSeconds / 60))} min)`,
                  whatWeNoticed: '',
                  whatWeDecided: '',
                  tags: target.type === 'task' ? ['répéter'] : ['détourner'],
                });
              }}
              className="w-full py-3.5 px-6 rounded-[16px] bg-white hover:bg-riso-p1-light text-riso-ink font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ajouter une trace au journal</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-6 rounded-[16px] bg-riso-ink hover:bg-riso-p1 text-riso-ink-subtle font-semibold text-xs transition-colors cursor-pointer"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {/* Bottom spacer for centering */}
      <div className="h-6"></div>
    </div>
  );
};
