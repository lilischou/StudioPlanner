import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { proposerAction, simplifierAction, isAiEnabled } from '../../ai/gemini';
import { formatISODate } from '../../utils/dateCalculations';
import { toLocalYMD } from '../../utils/localDate';

interface InertiaActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'propose' | 'timer' | 'record' | 'need_time' | 'max_prolongation';

function playTimerDoneSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.18); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.7);
  } catch {
    // Ignore audio context errors
  }
}

export const InertiaActionModal: React.FC<InertiaActionModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, addLogbookEntry, updateTask } = useProject();
  const { tasks, phases, logbook = [], deliverables = [], settings } = activeProject;

  const todayISO = toLocalYMD();

  // Phase en cours
  const currentPhase = useMemo(() => {
    return (
      phases.find((p) => {
        if (p.calculatedStartDate && p.calculatedEndDate) {
          return todayISO >= p.calculatedStartDate && todayISO <= p.calculatedEndDate;
        }
        return false;
      }) || phases[0]
    );
  }, [phases, todayISO]);

  // Tâches non faites de la phase en cours (P2)
  const pendingPhaseTasks = useMemo(() => {
    if (!currentPhase) return tasks.filter((t) => t.status !== 'fait');
    const inPhase = tasks.filter((t) => t.status !== 'fait' && t.phaseId === currentPhase.id);
    if (inPhase.length > 0) return inPhase;
    return tasks.filter((t) => t.status !== 'fait');
  }, [tasks, currentPhase]);

  // État du flux
  const [step, setStep] = useState<ModalStep>('propose');
  const [actionText, setActionText] = useState('');
  const [dureeMinutes, setDureeMinutes] = useState<5 | 10 | 15 | 20 | 25>(25);
  const [originalDureeMinutes, setOriginalDureeMinutes] = useState<5 | 10 | 15 | 20 | 25>(25);
  const [currentPriority, setCurrentPriority] = useState<'p1' | 'p2' | 'p3'>('p1');
  const [p2TaskIndex, setP2TaskIndex] = useState(0);
  const [matchedTaskId, setMatchedTaskId] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [prolongationCount, setProlongationCount] = useState(0);

  // Minuteur principal
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(25 * 60);
  const [initialSeconds, setInitialSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedMinutesRecord, setElapsedMinutesRecord] = useState(25);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Formulaire de trace (Étape 5)
  const [whatIDid, setWhatIDid] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [recordError, setRecordError] = useState('');

  // Mode déblocage (Étape 6)
  const [deblocageTimeLeft, setDeblocageTimeLeft] = useState(300); // 5 min forcé
  const [needTimeReason, setNeedTimeReason] = useState('');
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const deblocageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clampDuration = (mins?: number): 5 | 10 | 15 | 20 | 25 => {
    if (!mins || isNaN(mins)) return 25;
    if (mins <= 5) return 5;
    if (mins <= 10) return 10;
    if (mins <= 15) return 15;
    if (mins <= 20) return 20;
    return 25;
  };

  // Initialisation à l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      setStep('propose');
      setIsTimerRunning(false);
      setProlongationCount(0);
      setWhatIDid('');
      setNextStep('');
      setRecordError('');
      setP2TaskIndex(0);
      resolveAction('p1', 0);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (deblocageTimerRef.current) clearInterval(deblocageTimerRef.current);
    }
  }, [isOpen]);

  // Résolution de l'action selon les 3 priorités
  const resolveAction = async (targetPriority: 'p1' | 'p2' | 'p3', p2Idx = 0) => {
    // P1 : La « prochaine petite étape » notée à la fin de la dernière séance
    if (targetPriority === 'p1') {
      const saved = localStorage.getItem('studioplanner_next_step');
      if (saved && saved.trim().length > 0) {
        setActionText(saved.trim().slice(0, 90));
        setDureeMinutes(25);
        setOriginalDureeMinutes(25);
        setCurrentPriority('p1');
        setMatchedTaskId(null);
        return;
      }
      // Repli immédiat sur P2 si aucune étape P1
      return resolveAction('p2', 0);
    }

    // P2 : La prochaine tâche non faite de la phase en cours
    if (targetPriority === 'p2') {
      if (pendingPhaseTasks.length > 0 && p2Idx < pendingPhaseTasks.length) {
        const task = pendingPhaseTasks[p2Idx];
        const dur = clampDuration(task.durationMinutes);
        setActionText(task.title.slice(0, 90));
        setDureeMinutes(dur);
        setOriginalDureeMinutes(dur);
        setCurrentPriority('p2');
        setP2TaskIndex(p2Idx);
        setMatchedTaskId(task.id);
        return;
      }
      // Repli sur P3 si aucune tâche non faite disponible
      return resolveAction('p3');
    }

    // P3 : Gemini propose 1 action concrète à partir de la phase en cours
    setCurrentPriority('p3');
    setMatchedTaskId(null);

    if (isAiEnabled()) {
      setIsLoadingAi(true);
      try {
        const lastTrace = logbook[logbook.length - 1];
        const lastTraceSummary = lastTrace
          ? `${lastTrace.title || ''} : ${lastTrace.observed || lastTrace.whatWeNoticed || lastTrace.done || ''}`.trim()
          : 'Aucune';
        const currentDeliverable = deliverables.find(
          (d) => d.phaseId === currentPhase?.id && d.status !== 'valide'
        );

        const res = await proposerAction({
          phaseEnCours: currentPhase?.nom || currentPhase?.name || 'Phase en cours',
          livrableAttendu:
            currentDeliverable?.title ||
            currentPhase?.livrableAttendu ||
            currentPhase?.deliverableSummary ||
            'Livrable de la phase',
          derniereTrace: lastTraceSummary,
        });

        if (res && res.action) {
          setActionText(res.action.slice(0, 90));
          setDureeMinutes(res.dureeMinutes);
          setOriginalDureeMinutes(res.dureeMinutes);
          return;
        }
      } catch {
        // Fallback sans IA ci-dessous
      } finally {
        setIsLoadingAi(false);
      }
    }

    // Repli sans IA pour P3
    const phaseName = currentPhase?.nom || currentPhase?.name || 'la phase';
    setActionText(`Fais un point sur ton livrable de ${phaseName}`);
    setDureeMinutes(25);
    setOriginalDureeMinutes(25);
  };

  // « C'est trop difficile » : Gemini réécrit en version 5 min, ou repli manuel
  const handleTooDifficult = async () => {
    if (isAiEnabled()) {
      setIsLoadingAi(true);
      try {
        const res = await simplifierAction(actionText);
        if (res && res.action) {
          setActionText(res.action.slice(0, 90));
          setDureeMinutes(5);
          return;
        }
      } catch {
        // repli manuel
      } finally {
        setIsLoadingAi(false);
      }
    }

    // Repli sans IA : garde le même texte préfixé par « 5 min : commence par », durée = 5
    const prefix = '5 min : commence par ';
    const newText = actionText.startsWith(prefix) ? actionText : `${prefix}${actionText}`;
    setActionText(newText.slice(0, 90));
    setDureeMinutes(5);
  };

  // « Faire autre chose » : propose l'action suivante dans l'ordre de priorité
  const handleDoSomethingElse = () => {
    if (currentPriority === 'p1') {
      resolveAction('p2', 0);
    } else if (currentPriority === 'p2') {
      const nextIdx = p2TaskIndex + 1;
      if (nextIdx < pendingPhaseTasks.length) {
        resolveAction('p2', nextIdx);
      } else {
        resolveAction('p3');
      }
    } else {
      // Si on était en P3, on reboucle vers P2 s'il existe des tâches
      if (pendingPhaseTasks.length > 0) {
        resolveAction('p2', 0);
      } else {
        resolveAction('p3');
      }
    }
  };

  // « Go » : Lance le minuteur en plein écran
  const handleStartTimer = () => {
    const totalSec = dureeMinutes * 60;
    setTimeLeftSeconds(totalSec);
    setInitialSeconds(totalSec);
    setIsTimerRunning(true);
    setStep('timer');
  };

  // Minuteur principal
  useEffect(() => {
    if (step === 'timer' && isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            playTimerDoneSound();
            setElapsedMinutesRecord(dureeMinutes);
            setStep('record');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, isTimerRunning, dureeMinutes]);

  // Bouton discret « Arrêter »
  const handleStopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(false);
    const elapsed = Math.max(1, Math.round((initialSeconds - timeLeftSeconds) / 60));
    setElapsedMinutesRecord(elapsed);
    setStep('record');
  };

  // Minuteur forcé de 5 min pendant le mode déblocage
  useEffect(() => {
    if (step === 'need_time') {
      setDeblocageTimeLeft(300);
      deblocageTimerRef.current = setInterval(() => {
        setDeblocageTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(deblocageTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (deblocageTimerRef.current) clearInterval(deblocageTimerRef.current);
    }

    return () => {
      if (deblocageTimerRef.current) clearInterval(deblocageTimerRef.current);
    };
  }, [step]);

  // Enregistrement de la trace finale dans le journal
  const saveRecord = () => {
    if (!whatIDid.trim()) {
      setRecordError('Veuillez remplir le champ « Ce que j\'ai fait ».');
      return false;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    addLogbookEntry({
      date: formatISODate(now),
      time: `${hh}:${mm}`,
      title: actionText,
      author: settings.team[0]?.name || 'Moi-même',
      phaseId: currentPhase?.id || 'p1',
      taskId: matchedTaskId || undefined,
      whatWeDid: whatIDid.trim(),
      whatWeNoticed: needTimeReason.trim() ? `Déblocage : ${needTimeReason.trim()}` : '',
      whatWeDecided: nextStep.trim() || '',
      done: whatIDid.trim(),
      observed: needTimeReason.trim() ? `Déblocage : ${needTimeReason.trim()}` : '',
      decided: nextStep.trim() || '',
      tags: ['seance', 'je-m-y-mets'],
    });

    if (matchedTaskId) {
      updateTask(matchedTaskId, { status: 'fait' });
    }

    if (nextStep.trim().length > 0) {
      localStorage.setItem('studioplanner_next_step', nextStep.trim());
    } else {
      localStorage.removeItem('studioplanner_next_step');
    }

    return true;
  };

  // 1. Bouton « Prochaine étape »
  const handleProchaineEtape = () => {
    if (!saveRecord()) return;
    setWhatIDid('');
    setNextStep('');
    setRecordError('');
    setProlongationCount(0);
    setStep('propose');
    resolveAction('p1', 0);
  };

  // 2. Bouton « J'ai encore besoin de temps »
  const handleNeedMoreTime = () => {
    if (prolongationCount >= 1) {
      setStep('max_prolongation');
      return;
    }
    setNeedTimeReason('');
    setCheck1(false);
    setCheck2(false);
    setCheck3(false);
    setStep('need_time');
  };

  // Relance du minuteur après déblocage réussi
  const handleConfirmProlongation = () => {
    setProlongationCount(1);
    const totalSec = originalDureeMinutes * 60;
    setTimeLeftSeconds(totalSec);
    setInitialSeconds(totalSec);
    setIsTimerRunning(true);
    setStep('timer');
  };

  // 3. Bouton « Pause »
  const handlePause = () => {
    if (!saveRecord()) return;
    onClose();
  };

  // Lien Google Agenda existant (action=TEMPLATE)
  const getGoogleCalendarUrl = () => {
    const now = new Date();
    const end = new Date(now.getTime() + dureeMinutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatGCal = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const text = encodeURIComponent(actionText || "Séance d'action");
    const dates = `${formatGCal(now)}/${formatGCal(end)}`;
    const details = encodeURIComponent('StudioPlanner · Passer à l\'action');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  };

  // Rendu de l'arc Time Timer
  const progressFraction = initialSeconds > 0 ? timeLeftSeconds / initialSeconds : 0;
  const timerM = Math.floor(timeLeftSeconds / 60);
  const timerS = timeLeftSeconds % 60;
  const timerDisplay = `${String(timerM).padStart(2, '0')}:${String(timerS).padStart(2, '0')}`;

  const deblocageM = Math.floor(deblocageTimeLeft / 60);
  const deblocageS = deblocageTimeLeft % 60;
  const deblocageDisplay = `${String(deblocageM).padStart(2, '0')}:${String(deblocageS).padStart(2, '0')}`;

  const isDeblocageValid = check1 && check2 && check3 && needTimeReason.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Passer de l'inertie à l'action"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#FBFAF6] flex flex-col justify-between text-[#22408F] p-4 sm:p-8 animate-in fade-in duration-150"
    >
      {/* Barre supérieure minimale */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto shrink-0 pb-3 border-b-2 border-[#22408F]">
        <span className="font-heading font-bold text-sm text-[#22408F] lowercase">
          passer à l'action
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#5A6A94] hover:text-[#22408F] rounded-[8px] hover:bg-[#EBF1FF] transition-colors border border-transparent hover:border-[#22408F] cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenu plein écran selon l'étape */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl w-full mx-auto my-6 text-center">
        {/* ============================================================ */}
        {/* 2. UNE SEULE ACTION, EN PLEIN ÉCRAN                          */}
        {/* ============================================================ */}
        {step === 'propose' && (
          <div className="w-full space-y-6 flex flex-col items-center justify-center animate-in fade-in duration-150">
            {isLoadingAi ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="w-8 h-8 rounded-full border-4 border-[#22408F] border-t-transparent animate-spin" />
                <p className="text-sm font-bold text-[#5A6A94]">Gemini réfléchit…</p>
              </div>
            ) : (
              <>
                {/* L'action en gros */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#22408F] font-heading leading-tight tracking-tight select-none max-w-2xl px-2">
                  « {actionText || 'Fais un premier pas sur ton projet'} »
                </h1>

                {/* La durée en dessous, rien d'autre */}
                <p className="text-base sm:text-lg font-bold text-[#5A6A94]">
                  {dureeMinutes} min
                </p>

                {/* Trois boutons : Go · C'est trop difficile · Faire autre chose */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    disabled={isLoadingAi || !actionText}
                    className="btn-riso-primary w-full sm:w-auto text-base sm:text-lg py-3 px-8 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Go</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTooDifficult}
                    disabled={isLoadingAi}
                    className="btn-riso-secondary w-full sm:w-auto text-sm sm:text-base py-3 px-6 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-[#F2661F]" />
                    <span>C'est trop difficile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDoSomethingElse}
                    disabled={isLoadingAi}
                    className="btn-riso-secondary w-full sm:w-auto text-sm sm:text-base py-3 px-6 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-[#5A6A94]" />
                    <span>Faire autre chose</span>
                  </button>
                </div>

                {/* Petit lien discret « Bloquer dans l'Agenda » */}
                <div className="pt-2">
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5A6A94] hover:text-[#22408F] underline cursor-pointer inline-flex items-center gap-1 transition-colors"
                  >
                    Bloquer dans l'Agenda →
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. « GO » : MINUTEUR PLEIN ÉCRAN                             */}
        {/* ============================================================ */}
        {step === 'timer' && (
          <div className="w-full space-y-6 flex flex-col items-center justify-center animate-in fade-in duration-150">
            {/* Jauge circulaire Time Timer qui se vide */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center select-none">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#EBF1FF] fill-white"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#F0505A] fill-transparent transition-all duration-1000 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressFraction)}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Temps restant en grand */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl sm:text-7xl font-extrabold text-[#22408F] tabular-nums font-heading tracking-tight">
                  {timerDisplay}
                </span>
              </div>
            </div>

            {/* Bouton Arrêter discret */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStopTimer}
                className="btn-riso-secondary text-xs sm:text-sm py-1.5 px-4 font-bold text-[#5A6A94] hover:text-[#22408F] cursor-pointer"
              >
                Arrêter
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. FIN DU MINUTEUR : TRACE EN 1 CLIC                         */}
        {/* ============================================================ */}
        {step === 'record' && (
          <div className="w-full max-w-xl text-left bg-white p-6 sm:p-7 rounded-2xl border-2 border-[#22408F] shadow-[0_4px_0_#22408F] space-y-4 animate-in fade-in duration-150">
            {/* Prérempli : titre = l'action ; date et heure actuelles ; durée réelle ; type = Séance */}
            <div className="p-3 bg-[#FBFAF6] border border-[#DCE2EF] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6A94]">
                <span className="px-2 py-0.5 rounded-[999px] bg-[#EBF1FF] text-[#22408F] border border-[#22408F]/20">
                  Séance
                </span>
                <span className="tabular-nums font-mono text-[11px]">
                  {formatISODate(new Date())} · {elapsedMinutesRecord} min
                </span>
              </div>
              <h3 className="font-heading font-bold text-sm text-[#22408F] pt-1">
                {actionText}
              </h3>
            </div>

            {recordError && (
              <div className="p-2 bg-[#FFF0F0] border-2 border-[#F0505A] rounded-[8px] text-xs font-bold text-[#F0505A]">
                {recordError}
              </div>
            )}

            {/* Champs du formulaire */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#22408F] uppercase tracking-wider mb-1">
                  Ce que j'ai fait <span className="text-[#F0505A]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  value={whatIDid}
                  onChange={(e) => {
                    setWhatIDid(e.target.value);
                    if (recordError) setRecordError('');
                  }}
                  placeholder="Qu’as-tu réalisé pendant cette séance ?"
                  className="w-full px-3 py-2 bg-[#FBFAF6] border-2 border-[#22408F] rounded-[8px] text-xs text-[#22408F] focus:outline-none focus:ring-2 focus:ring-[#F2D21B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#22408F] uppercase tracking-wider mb-1">
                  Prochaine petite étape (optionnel)
                </label>
                <input
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="La prochaine micro-action concrète à lancer"
                  className="w-full px-3 py-2 bg-[#FBFAF6] border-2 border-[#22408F] rounded-[8px] text-xs font-bold text-[#22408F] focus:outline-none focus:ring-2 focus:ring-[#F2D21B]"
                />
              </div>
            </div>

            {/* Trois boutons : Prochaine étape · J'ai encore besoin de temps · Pause */}
            <div className="pt-2 border-t-2 border-[#DCE2EF] flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleProchaineEtape}
                className="btn-riso-primary flex-1 text-xs py-2.5 px-4 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Prochaine étape</span>
              </button>

              <button
                type="button"
                onClick={handleNeedMoreTime}
                className="btn-riso-secondary flex-1 text-xs py-2.5 px-3.5 cursor-pointer text-[#C4111C]"
              >
                <AlertCircle className="w-4 h-4 text-[#F0505A]" />
                <span>J'ai encore besoin de temps</span>
              </button>

              <button
                type="button"
                onClick={handlePause}
                className="btn-riso-secondary flex-1 text-xs py-2.5 px-3.5 cursor-pointer text-[#246C3A]"
              >
                <Coffee className="w-4 h-4 text-[#2E8B4A]" />
                <span>Pause</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. « J'AI ENCORE BESOIN DE TEMPS » = MODE DÉBLOCAGE         */}
        {/* ============================================================ */}
        {step === 'need_time' && (
          <div className="w-full max-w-xl text-left bg-white p-6 sm:p-7 rounded-2xl border-2 border-[#22408F] shadow-[0_4px_0_#22408F] space-y-4 animate-in fade-in duration-150">
            {/* Minuteur forcé de 5 min pendant lequel j'écris la trace */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#DCE2EF]">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#22408F] lowercase">
                  mode déblocage
                </h3>
                <p className="text-xs text-[#5A6A94]">
                  Prends ces 5 min pour poser ton constat.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F0] border-2 border-[#F0505A] text-xs font-bold text-[#F0505A] tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>{deblocageDisplay}</span>
              </div>
            </div>

            {/* Justification obligatoire */}
            <div>
              <label className="block text-xs font-bold text-[#22408F] uppercase tracking-wider mb-1">
                Pourquoi j'ai encore besoin de temps ? <span className="text-[#F0505A]">*</span>
              </label>
              <textarea
                rows={2}
                required
                autoFocus
                value={needTimeReason}
                onChange={(e) => setNeedTimeReason(e.target.value)}
                placeholder="Explique ce qui bloque ou ce qu'il reste à finir…"
                className="w-full px-3 py-2 bg-[#FBFAF6] border-2 border-[#22408F] rounded-[8px] text-xs text-[#22408F] focus:outline-none focus:ring-2 focus:ring-[#F2D21B]"
              />
            </div>

            {/* Trois cases obligatoires */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-[#22408F]">
                <input
                  type="checkbox"
                  checked={check1}
                  onChange={(e) => setCheck1(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-[#22408F] accent-[#2F6DBB]"
                />
                <span>Cette action sert le livrable de la phase en cours</span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-[#22408F]">
                <input
                  type="checkbox"
                  checked={check2}
                  onChange={(e) => setCheck2(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-[#22408F] accent-[#2F6DBB]"
                />
                <span>Je ne suis pas en train de peaufiner un détail secondaire</span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-[#22408F]">
                <input
                  type="checkbox"
                  checked={check3}
                  onChange={(e) => setCheck3(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-[#22408F] accent-[#2F6DBB]"
                />
                <span>Je ne me suis pas dispersée sur autre chose</span>
              </label>
            </div>

            {/* Message neutre si une case n'est pas cochée */}
            {!isDeblocageValid && (
              <div className="p-3 bg-[#FBFAF6] border border-[#DCE2EF] rounded-xl text-xs text-[#5A6A94] leading-relaxed">
                Cette action n'est pas prioritaire : passe à la prochaine étape ou fais une pause.
              </div>
            )}

            {/* Actions : Relancer (si tout est coché) OU Passer / Pause */}
            <div className="pt-2 border-t-2 border-[#DCE2EF] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleProchaineEtape}
                  className="btn-riso-secondary text-xs py-2 px-3 cursor-pointer"
                >
                  Prochaine étape
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  className="btn-riso-secondary text-xs py-2 px-3 cursor-pointer"
                >
                  Pause
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmProlongation}
                disabled={!isDeblocageValid}
                className="btn-riso-primary text-xs py-2.5 px-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Relancer ({originalDureeMinutes} min)
              </button>
            </div>
          </div>
        )}

        {/* Écran si déjà prolongé 1 fois : proposer version 5 min ou pause */}
        {step === 'max_prolongation' && (
          <div className="w-full max-w-md text-center bg-white p-6 sm:p-7 rounded-2xl border-2 border-[#22408F] shadow-[0_4px_0_#22408F] space-y-4 animate-in fade-in duration-150">
            <h3 className="font-heading font-bold text-base text-[#22408F]">
              Action déjà prolongée
            </h3>
            <p className="text-xs text-[#5A6A94] leading-relaxed">
              Pour éviter l'hyperfocalisation non productive, termine par une micro-étape de 5 min ou prends une pause.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleTooDifficult();
                  setStep('propose');
                }}
                className="btn-riso-primary text-xs py-2.5 px-4 cursor-pointer"
              >
                Version 5 min
              </button>
              <button
                type="button"
                onClick={handlePause}
                className="btn-riso-secondary text-xs py-2.5 px-4 cursor-pointer"
              >
                Pause
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bas de page discret */}
      <div className="max-w-4xl w-full mx-auto shrink-0 pt-2 border-t-2 border-[#DCE2EF] text-center text-xs text-[#5A6A94]">
        <span>StudioPlanner · Vaincre l'inertie en une seule micro-étape</span>
      </div>
    </div>
  );
};
