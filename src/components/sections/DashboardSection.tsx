import React, { useMemo, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  formatFrenchDate,
  diffInDays,
  formatISODate,
  addDaysToISO,
} from '../../utils/dateCalculations';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  User,
  GraduationCap,
  FileCheck,
  Check,
} from 'lucide-react';
import { getPhaseColor, getSessionTypeLabel } from '../../utils/theme';
import { isAiEnabled, generateWeeklySummary, WeeklySummary } from '../../ai/gemini';
import { WeeklySummaryModal } from '../modals/WeeklySummaryModal';

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

export const DashboardSection: React.FC = () => {
  const { activeProject, setActiveTab } = useProject();
  const { settings, phases, tasks, sessions, deliverables } = activeProject;
  const todayISO = formatISODate(new Date());

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateWeeklySummary = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const sevenDaysAgoISO = addDaysToISO(todayISO, -7);

      // Traces des 7 derniers jours (titres et constats seulement)
      const recentTraces = (activeProject.logbook || [])
        .filter((tr) => tr.date && tr.date >= sevenDaysAgoISO && tr.date <= todayISO)
        .map((tr) => ({
          titre: tr.title || 'Observation',
          constat: tr.observed || tr.whatWeNoticed || tr.done || tr.whatWeDid || '',
        }));

      // Sessions des 7 derniers jours (titres seulement)
      const recentSessions = (activeProject.sessions || [])
        .filter((s) => s.date && s.date >= sevenDaysAgoISO && s.date <= todayISO)
        .map((s) => ({
          titre: s.objective || 'Session de travail',
        }));

      // Tâches faites des 7 derniers jours (titres seulement)
      const recentDoneTasks = (activeProject.tasks || [])
        .filter(
          (t) =>
            t.status === 'fait' &&
            (!t.deadline || (t.deadline >= sevenDaysAgoISO && t.deadline <= todayISO))
        )
        .map((t) => ({
          titre: t.title,
        }));

      // Replis si aucun élément strict n'est daté dans les 7 jours
      const tracesToSend =
        recentTraces.length > 0
          ? recentTraces
          : (activeProject.logbook || []).slice(-5).map((tr) => ({
              titre: tr.title || 'Observation',
              constat: tr.observed || tr.whatWeNoticed || tr.done || tr.whatWeDid || '',
            }));

      const sessionsToSend =
        recentSessions.length > 0
          ? recentSessions
          : (activeProject.sessions || []).slice(-5).map((s) => ({
              titre: s.objective || 'Session',
            }));

      const doneTasksToSend =
        recentDoneTasks.length > 0
          ? recentDoneTasks
          : (activeProject.tasks || [])
              .filter((t) => t.status === 'fait')
              .slice(-5)
              .map((t) => ({ titre: t.title }));

      const res = await generateWeeklySummary({
        traces: tracesToSend,
        sessions: sessionsToSend,
        tachesFaites: doneTasksToSend,
      });

      if (res.data) {
        setWeeklySummary(res.data);
        setIsSummaryModalOpen(true);
      } else {
        setAiError(res.error || 'Impossible de générer le bilan pour le moment.');
      }
    } catch {
      setAiError('Erreur de connexion à Gemini.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // 1. Délais et dates clés
  const startDate = settings.startDate || todayISO;
  const deadlineDate = settings.deadlineDate || todayISO;
  const daysRemaining = diffInDays(todayISO, deadlineDate);
  const totalDays = Math.max(1, diffInDays(startDate, deadlineDate) + 1);

  // Texte J-68 en Space Grotesk
  const jText = daysRemaining >= 0 ? `J-${daysRemaining}` : `J+${Math.abs(daysRemaining)}`;

  // 2. Phase en cours
  const currentPhase = useMemo(() => {
    if (!phases || phases.length === 0) return null;
    const found = phases.find((ph) => {
      const s = ph.debut || ph.calculatedStartDate || '';
      const e = ph.fin || ph.calculatedEndDate || '';
      return s && e && todayISO >= s && todayISO <= e;
    });
    if (found) return found;
    const first = phases[0];
    const firstStart = first.debut || first.calculatedStartDate || '';
    if (firstStart && todayISO < firstStart) return first;
    return phases[phases.length - 1];
  }, [phases, todayISO]);

  const currentPhaseColor = currentPhase ? getPhaseColor(currentPhase, phases) : null;
  const phaseEnd = currentPhase?.fin || currentPhase?.calculatedEndDate || deadlineDate;
  const daysRemainingInPhase = currentPhase ? diffInDays(todayISO, phaseEnd) : 0;

  // Curseur Aujourd'hui sur la frise
  const todayPercent = Math.min(
    100,
    Math.max(0, (diffInDays(startDate, todayISO) / Math.max(1, totalDays - 1)) * 100)
  );

  // 3. Calcul des Heures par type (Solo / Groupe / Tuteur)
  const hoursStats = useMemo(() => {
    const isSolo = (t: string) => t === 'individuelle' || t === 'Solo' || t === 'solo';
    const isGroupe = (t: string) => t === 'groupe' || t === 'Groupe';
    const isTuteur = (t: string) => t === 'encadree' || t === 'Tuteur' || t === 'tuteur';

    const getStats = (filterFn: (t: string) => boolean, defaultDur: number) => {
      const filtered = sessions.filter((s) => filterFn(s.type));
      const done = filtered
        .filter((s) => s.status === 'realisee')
        .reduce((sum, s) => sum + (s.actualDurationHours || s.plannedDurationHours || defaultDur), 0);
      const planned = filtered
        .filter((s) => s.status !== 'realisee')
        .reduce((sum, s) => sum + (s.plannedDurationHours || defaultDur), 0);
      return { done, planned, total: done + planned };
    };

    const solo = getStats(isSolo, 2);
    const groupe = getStats(isGroupe, 3);
    const tuteur = getStats(isTuteur, 2);

    const totalDone = solo.done + groupe.done + tuteur.done;
    const totalPlanned = solo.planned + groupe.planned + tuteur.planned;

    return {
      solo,
      groupe,
      tuteur,
      totalDone,
      totalPlanned,
      total: totalDone + totalPlanned,
    };
  }, [sessions]);

  // 4. Calcul des Tâches (fait plein, en retard pointillé, à venir trame)
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'fait').length;
    const overdue = tasks.filter((t) => {
      if (t.status === 'fait' || !t.deadline) return false;
      return diffInDays(todayISO, t.deadline) < 0;
    }).length;
    const upcoming = Math.max(0, total - done - overdue);

    return { total, done, overdue, upcoming };
  }, [tasks, todayISO]);

  // 5. Livrables : pile d'étiquettes
  const deliverablesList = useMemo(() => {
    return [...deliverables].sort((a, b) => {
      const da = a.deadline || '9999';
      const db = b.deadline || '9999';
      return da.localeCompare(db);
    });
  }, [deliverables]);

  // 6. Ruban 7 jours : semaine du lundi au dimanche (comme l'onglet Sessions)
  const weekDays = useMemo(() => {
    const today = new Date(todayISO + 'T00:00:00');
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dateISO = formatISODate(dayDate);
      const dayName = dayDate.toLocaleDateString('fr-FR', { weekday: 'short' });
      const dayNumber = dayDate.getDate();
      const monthName = dayDate.toLocaleDateString('fr-FR', { month: 'short' });
      const daySessions = sessions.filter((s) => s.date === dateISO);

      days.push({
        dateISO,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', ''),
        dayNumber,
        monthName,
        isToday: dateISO === todayISO,
        sessions: daySessions,
      });
    }
    return days;
  }, [todayISO, sessions]);

  // 3 prochaines actions (tâches non faites triées par échéance)
  const next3Actions = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'fait')
      .sort((a, b) => {
        const da = a.deadline || '9999';
        const db = b.deadline || '9999';
        return da.localeCompare(db);
      })
      .slice(0, 3);
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* En-tête Synthèse & Action IA Bilan de la semaine */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-riso-ink lowercase">
            synthèse
          </h1>
          <p className="text-xs sm:text-sm text-riso-ink-secondary font-medium">
            Vue d’ensemble de la démarche et indicateurs clés
          </p>
        </div>

        {isAiEnabled() && (
          <button
            type="button"
            disabled={isLoadingAi}
            onClick={handleGenerateWeeklySummary}
            className="btn-riso-secondary py-1.5 px-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{isLoadingAi ? 'Gemini réfléchit…' : '✦ Bilan de la semaine'}</span>
          </button>
        )}
      </div>

      {aiError && (
        <div className="p-3 bg-riso-p4-light border-2 border-riso-p4 rounded-[8px] text-xs font-bold text-riso-p4 flex items-center justify-between">
          <span>{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-riso-p4 hover:underline cursor-pointer ml-3 text-xs"
          >
            Fermer
          </button>
        </div>
      )}

      {/* 1. HÉROS (pleine largeur) */}
      <div className="riso-card p-6 sm:p-8 space-y-6 relative overflow-hidden bg-white">
        {/* Ligne haute : Gauche (J-XX) & Droite (Phase en cours) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Gauche : J-68 en Space Grotesk 96px */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-[72px] sm:text-[96px] leading-none tracking-tight text-riso-ink select-none tabular-nums">
                {jText}
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-riso-ink-secondary mt-2">
              avant le rendu final · {formatFrenchDate(deadlineDate, false)}
            </p>
          </div>

          {/* Droite : Carte « Phase en cours » sur fond pastel de la phase */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {currentPhase && currentPhaseColor ? (
              <div
                className="p-5 rounded-[16px] border-2 border-riso-ink shadow-riso space-y-2.5 transition-all"
                style={{ backgroundColor: currentPhaseColor.bgLight }}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border-2 border-riso-ink text-[11px] font-bold text-riso-ink shadow-xs">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: currentPhaseColor.hex }}
                    />
                    Phase en cours
                  </span>
                  <span className="font-mono text-xs font-bold text-riso-ink">
                    {daysRemainingInPhase > 0
                      ? `${daysRemainingInPhase} j restants`
                      : daysRemainingInPhase === 0
                      ? 'Dernier jour'
                      : 'Phase échue'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-riso-ink font-heading leading-tight">
                    {currentPhase.nom || currentPhase.name}
                  </h3>
                  <p className="text-xs text-riso-ink-secondary font-medium mt-0.5">
                    Du {formatFrenchDate(currentPhase.debut || currentPhase.calculatedStartDate || '')} au{' '}
                    {formatFrenchDate(currentPhase.fin || currentPhase.calculatedEndDate || '')}
                  </p>
                </div>

                <div className="pt-1">
                  <p className="text-xs text-riso-ink font-medium bg-white/80 p-2.5 rounded-[8px] border border-riso-line leading-relaxed">
                    {currentPhase.objectif ||
                      currentPhase.objective ||
                      currentPhase.deliverableSummary ||
                      'Valider les hypothèses clés et structurer les livrables de la phase.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-[16px] border-2 border-riso-ink bg-riso-paper text-center text-xs text-riso-ink-secondary">
                Aucune phase définie.
              </div>
            )}
          </div>
        </div>

        {/* Dessous : Frise des phases (couleurs), curseur « aujourd'hui », losanges pour chaque livrable */}
        <div className="pt-4 border-t-2 border-riso-line space-y-7">
          <div className="flex items-center justify-between text-xs font-bold text-riso-ink">
            <span className="font-heading uppercase tracking-wider text-[11px]">
              Frise chronologique du projet
            </span>
            <span className="text-riso-ink-secondary font-mono text-[11px]">
              {formatFrenchDate(startDate, false)} → {formatFrenchDate(deadlineDate, false)}
            </span>
          </div>

          <div className="relative pt-6 pb-6">
            {/* Curseur Aujourd'hui (étiquette au-dessus + ligne) */}
            <div
              className="absolute top-0 bottom-3 w-[2.5px] bg-riso-ink z-20 pointer-events-none"
              style={{ left: `${todayPercent}%` }}
            >
              <div className="absolute -top-5 -translate-x-1/2 bg-riso-ink text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                Aujourd'hui
              </div>
            </div>

            {/* Barre de frise des phases */}
            <div className="h-9 w-full bg-riso-paper border-2 border-riso-ink rounded-[16px] overflow-hidden flex shadow-riso-press relative">
              {phases.map((phase) => {
                const phaseColor = getPhaseColor(phase, phases);
                const pStart = phase.debut || phase.calculatedStartDate || startDate;
                const pEnd = phase.fin || phase.calculatedEndDate || deadlineDate;
                const pDays = Math.max(1, diffInDays(pStart, pEnd) + 1);
                const pPct = (pDays / totalDays) * 100;

                return (
                  <div
                    key={phase.id}
                    style={{
                      width: `${pPct}%`,
                      backgroundColor: phaseColor.hex,
                    }}
                    className="h-full border-r-2 border-riso-ink last:border-r-0 flex items-center justify-center px-2 relative group overflow-hidden mix-blend-multiply"
                    title={`${phase.nom || phase.name} (${Math.round(pPct)} %)`}
                  >
                    <span className={`${phaseColor.key === 'yellow' ? 'text-riso-ink' : 'text-white'} text-xs font-bold font-heading truncate`}>
                      {phase.nom || phase.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Losanges pour chaque livrable à sa date */}
            {deliverables.map((del) => {
              const delDate = del.deadline || deadlineDate;
              const delDays = diffInDays(startDate, delDate);
              const delPercent = Math.min(
                100,
                Math.max(0, (delDays / Math.max(1, totalDays - 1)) * 100)
              );
              const isDone = del.status === 'valide';
              const isOverdue = !isDone && del.deadline && diffInDays(todayISO, del.deadline) < 0;

              return (
                <div
                  key={del.id}
                  onClick={() => setActiveTab('livrables')}
                  style={{ left: `${delPercent}%` }}
                  className="absolute bottom-1 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-30"
                >
                  <div
                    className={`w-3.5 h-3.5 rotate-45 border-2 border-riso-ink shadow-xs transition-transform group-hover:scale-125 ${
                      isDone
                        ? 'bg-riso-p2'
                        : isOverdue
                        ? 'bg-riso-p4'
                        : 'bg-riso-p3'
                    }`}
                  />
                  <div className="absolute top-5 bg-white border-2 border-riso-ink px-2 py-0.5 rounded-[8px] shadow-sm text-[10px] font-bold text-riso-ink whitespace-nowrap hidden group-hover:block z-40">
                    ◆ {del.title} ({formatFrenchDate(delDate, false)})
                  </div>
                </div>
              );
            })}
          </div>

          {/* Légende de la frise */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-riso-ink-secondary pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {phases.map((ph) => {
                const color = getPhaseColor(ph, phases);
                return (
                  <div key={ph.id} className="flex items-center gap-1.5 font-medium text-riso-ink">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-riso-line"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{ph.nom || ph.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-riso-p2 border-2 border-riso-ink" />
                <span>Validé</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-riso-p4 border-2 border-riso-ink" />
                <span>En retard</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-riso-p3 border-2 border-riso-ink" />
                <span>À venir</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TROIS CARTES DE TAILLES DIFFÉRENTES (Grille Bento) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CARTE 1 : Heures (large) - lg:col-span-6 */}
        <div className="lg:col-span-6 riso-card p-6 flex flex-col justify-between space-y-4 bg-white">
          <div className="flex items-center justify-between border-b-2 border-riso-line pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-riso-ink" />
              <h3 className="font-bold text-sm text-riso-ink uppercase tracking-wider font-heading">
                Heures de travail
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className="riso-text-link text-xs cursor-pointer"
            >
              Sessions →
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="p-8 text-center rounded-[16px] border-2 border-dashed border-riso-line riso-dots-light space-y-2">
              <p className="font-bold text-xs text-riso-ink">Aucune session enregistrée</p>
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className="btn-riso-secondary text-xs py-1.5 px-3.5 cursor-pointer"
              >
                Planifier une session →
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-around">
              {/* Ligne 1 : Solo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-riso-p1" />
                    <span className="font-bold text-riso-ink">Solo</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-riso-ink">
                    {hoursStats.solo.done} h faites · {hoursStats.solo.planned} h prévues
                  </span>
                </div>
                <div className="h-6 w-full bg-riso-paper border-2 border-riso-ink rounded-[8px] overflow-hidden flex shadow-xs">
                  {hoursStats.solo.total > 0 ? (
                    <>
                      <div
                        style={{
                          width: `${(hoursStats.solo.done / hoursStats.solo.total) * 100}%`,
                        }}
                        className="h-full bg-riso-p1 border-r-2 border-riso-ink mix-blend-multiply transition-all"
                        title={`${hoursStats.solo.done} h faites (plein)`}
                      />
                      <div
                        style={{
                          width: `${(hoursStats.solo.planned / hoursStats.solo.total) * 100}%`,
                        }}
                        className="h-full bg-white riso-dots mix-blend-multiply transition-all"
                        title={`${hoursStats.solo.planned} h prévues (trame)`}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full riso-dots-light" />
                  )}
                </div>
              </div>

              {/* Ligne 2 : Groupe */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-riso-p2" />
                    <span className="font-bold text-riso-ink">Groupe</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-riso-ink">
                    {hoursStats.groupe.done} h faites · {hoursStats.groupe.planned} h prévues
                  </span>
                </div>
                <div className="h-6 w-full bg-riso-paper border-2 border-riso-ink rounded-[8px] overflow-hidden flex shadow-xs">
                  {hoursStats.groupe.total > 0 ? (
                    <>
                      <div
                        style={{
                          width: `${(hoursStats.groupe.done / hoursStats.groupe.total) * 100}%`,
                        }}
                        className="h-full bg-riso-p2 border-r-2 border-riso-ink mix-blend-multiply transition-all"
                        title={`${hoursStats.groupe.done} h faites (plein)`}
                      />
                      <div
                        style={{
                          width: `${(hoursStats.groupe.planned / hoursStats.groupe.total) * 100}%`,
                        }}
                        className="h-full bg-white riso-dots mix-blend-multiply transition-all"
                        title={`${hoursStats.groupe.planned} h prévues (trame)`}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full riso-dots-light" />
                  )}
                </div>
              </div>

              {/* Ligne 3 : Tuteur */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-riso-p6" />
                    <span className="font-bold text-riso-ink">Tuteur</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-riso-ink">
                    {hoursStats.tuteur.done} h faites · {hoursStats.tuteur.planned} h prévues
                  </span>
                </div>
                <div className="h-6 w-full bg-riso-paper border-2 border-riso-ink rounded-[8px] overflow-hidden flex shadow-xs">
                  {hoursStats.tuteur.total > 0 ? (
                    <>
                      <div
                        style={{
                          width: `${(hoursStats.tuteur.done / hoursStats.tuteur.total) * 100}%`,
                        }}
                        className="h-full bg-riso-p6 border-r-2 border-riso-ink mix-blend-multiply transition-all"
                        title={`${hoursStats.tuteur.done} h faites (plein)`}
                      />
                      <div
                        style={{
                          width: `${(hoursStats.tuteur.planned / hoursStats.tuteur.total) * 100}%`,
                        }}
                        className="h-full bg-white riso-dots mix-blend-multiply transition-all"
                        title={`${hoursStats.tuteur.planned} h prévues (trame)`}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full riso-dots-light" />
                  )}
                </div>
              </div>

              {/* Légende Fait (plein) / Prévu (trame) */}
              <div className="flex items-center justify-between text-[11px] text-riso-ink-secondary pt-2 border-t border-riso-line">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-riso-ink border-2 border-riso-ink rounded-[8px]" />
                    <span>Fait (plein)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-white riso-dots border-2 border-riso-ink rounded-[8px]" />
                    <span>Prévu (trame)</span>
                  </span>
                </div>
                <span className="font-bold font-mono text-riso-ink">
                  Total : {hoursStats.totalDone} h / {hoursStats.total} h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CARTE 2 : Tâches (anneau segmenté) - lg:col-span-3 */}
        <div className="lg:col-span-3 riso-card p-6 flex flex-col justify-between space-y-4 bg-white">
          <div className="flex items-center justify-between border-b-2 border-riso-line pb-3">
            <h3 className="font-bold text-sm text-riso-ink uppercase tracking-wider font-heading">
              Tâches
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className="riso-text-link text-xs cursor-pointer"
            >
              Tâches →
            </button>
          </div>

          {taskStats.total === 0 ? (
            <div className="p-8 text-center rounded-[16px] border-2 border-dashed border-riso-line riso-dots-light space-y-2">
              <p className="font-bold text-xs text-riso-ink">Aucune tâche</p>
              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className="btn-riso-secondary text-xs py-1.5 px-3.5 cursor-pointer"
              >
                Ajouter une tâche →
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 space-y-4">
              {/* Anneau segmenté en SVG maison */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                  {/* Fond de l'anneau */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="var(--riso-p1-light)"
                    strokeWidth="12"
                  />
                  {/* Segments dynamiques */}
                  {(() => {
                    const total = taskStats.total;
                    const aDone = (taskStats.done / total) * 359.99;
                    const aOverdue = (taskStats.overdue / total) * 359.99;
                    const aUpcoming = (taskStats.upcoming / total) * 359.99;

                    let currentAngle = 0;
                    const paths = [];

                    if (taskStats.done > 0) {
                      const end = currentAngle + aDone;
                      paths.push(
                        <path
                          key="done"
                          d={describeArc(60, 60, 44, currentAngle, end)}
                          fill="none"
                          stroke="var(--riso-p2)"
                          strokeWidth="12"
                        />
                      );
                      currentAngle = end;
                    }

                    if (taskStats.overdue > 0) {
                      const end = currentAngle + aOverdue;
                      paths.push(
                        <path
                          key="overdue"
                          d={describeArc(60, 60, 44, currentAngle, end)}
                          fill="none"
                          stroke="var(--riso-p4)"
                          strokeWidth="12"
                          strokeDasharray="4 3"
                        />
                      );
                      currentAngle = end;
                    }

                    if (taskStats.upcoming > 0) {
                      const end = currentAngle + aUpcoming;
                      paths.push(
                        <path
                          key="upcoming"
                          d={describeArc(60, 60, 44, currentAngle, end)}
                          fill="none"
                          stroke="var(--riso-ink)"
                          strokeWidth="12"
                          strokeDasharray="2 2"
                        />
                      );
                    }

                    return paths;
                  })()}
                </svg>

                {/* Nombre au centre */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="font-heading font-extrabold text-2xl text-riso-ink leading-none tabular-nums">
                    {taskStats.done}/{taskStats.total}
                  </span>
                  <span className="text-[10px] font-bold text-riso-ink-secondary uppercase tracking-wider mt-0.5">
                    faites
                  </span>
                </div>
              </div>

              {/* Légende de l'anneau */}
              <div className="w-full space-y-1 text-xs pt-1">
                <div className="flex items-center justify-between text-riso-p2 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-riso-p2" />
                    <span>Fait (plein)</span>
                  </span>
                  <span className="font-mono">{taskStats.done}</span>
                </div>
                <div className="flex items-center justify-between text-riso-p4 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-riso-p4 bg-riso-p4-light" />
                    <span>En retard (pointillé)</span>
                  </span>
                  <span className="font-mono">{taskStats.overdue}</span>
                </div>
                <div className="flex items-center justify-between text-riso-ink font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-dotted border-riso-ink bg-riso-p1-light" />
                    <span>À venir (trame)</span>
                  </span>
                  <span className="font-mono">{taskStats.upcoming}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARTE 3 : Livrables (pile d'étiquettes) - lg:col-span-3 */}
        <div className="lg:col-span-3 riso-card p-6 flex flex-col justify-between space-y-4 bg-white">
          <div className="flex items-center justify-between border-b-2 border-riso-line pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-riso-ink" />
              <h3 className="font-bold text-sm text-riso-ink uppercase tracking-wider font-heading">
                Livrables
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('livrables')}
              className="riso-text-link text-xs cursor-pointer"
            >
              Livrables →
            </button>
          </div>

          {deliverablesList.length === 0 ? (
            <div className="p-8 text-center rounded-[16px] border-2 border-dashed border-riso-line riso-dots-light space-y-2">
              <p className="font-bold text-xs text-riso-ink">Aucun livrable</p>
              <button
                type="button"
                onClick={() => setActiveTab('livrables')}
                className="btn-riso-secondary text-xs py-1.5 px-3.5 cursor-pointer"
              >
                Ajouter un livrable →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72 pr-1">
              {deliverablesList.map((del) => {
                const delPhase = phases.find((p) => p.id === del.phaseId) || phases[0];
                const phaseColor = getPhaseColor(delPhase, phases);
                const isDone = del.status === 'valide';
                const isOverdue = !isDone && del.deadline && diffInDays(todayISO, del.deadline) < 0;

                return (
                  <div
                    key={del.id}
                    onClick={() => setActiveTab('livrables')}
                    className="p-3 rounded-[8px] border-2 border-riso-ink shadow-riso-press transition-all hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-2"
                    style={{ backgroundColor: phaseColor.bgLight }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full border border-riso-line shrink-0"
                          style={{ backgroundColor: phaseColor.hex }}
                        />
                        <span className="text-xs font-bold text-riso-ink truncate">
                          {del.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-riso-ink-secondary font-mono mt-0.5">
                        Dépôt : {formatFrenchDate(del.deadline, false)}
                      </div>
                    </div>

                    {/* Statut par forme : ✓ validé (plein), pointillé en retard, trame à venir */}
                    <div className="shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[999px] bg-riso-p2 text-white border-2 border-riso-ink font-bold text-[10px]">
                          <Check className="w-3 h-3" />
                          <span>Validé</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[999px] bg-riso-p4-light text-riso-p4 border-2 border-dashed border-riso-p4 font-bold text-[10px]">
                          <span>En retard</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[999px] bg-white riso-dots text-riso-ink border-2 border-riso-ink font-bold text-[10px]">
                          <span>À venir</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. CETTE SEMAINE : Ruban 7 jours avec blocs de sessions + « 3 prochaines actions » */}
      <div className="riso-card p-6 sm:p-7 space-y-6 bg-white">
        <div className="flex items-center justify-between border-b-2 border-riso-line pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-riso-ink" />
            <h3 className="font-bold text-sm text-riso-ink uppercase tracking-wider font-heading">
              Cette semaine
            </h3>
          </div>
          <span className="text-xs text-riso-ink-secondary font-medium">
            Du {formatFrenchDate(weekDays[0].dateISO, false)} au {formatFrenchDate(weekDays[6].dateISO, false)}
          </span>
        </div>

        {/* Grille : Ruban 7 jours (pleine largeur) */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
            {weekDays.map((day) => (
              <div
                key={day.dateISO}
                className={`p-2.5 rounded-[16px] border-2 transition-all min-h-[110px] flex flex-col justify-between ${
                  day.isToday
                    ? 'border-riso-ink bg-riso-p1-light shadow-riso'
                    : 'border-riso-line bg-riso-paper hover:border-riso-ink'
                }`}
              >
                <div className="flex items-center justify-between border-b border-riso-line pb-1">
                  <span className="font-bold text-xs text-riso-ink">{day.dayName}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-bold text-riso-ink">
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-riso-p1" />
                    )}
                  </div>
                </div>

                {/* Blocs de sessions du jour */}
                <div className="space-y-1.5 my-1.5 flex-1">
                  {day.sessions.length > 0 ? (
                    day.sessions.map((sess) => {
                      const sessPhase = phases.find((p) => p.id === sess.phaseId) || phases[0];
                      const sessColor = getPhaseColor(sessPhase, phases);

                      return (
                        <div
                          key={sess.id}
                          onClick={() => setActiveTab('sessions')}
                          className="p-1.5 rounded-[8px] border-2 border-riso-ink bg-white shadow-2xs text-[10px] space-y-0.5 cursor-pointer hover:bg-riso-p3-light transition-colors"
                        >
                          <div className="flex items-center gap-1 font-bold text-riso-ink truncate">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: sessColor.hex }}
                            />
                            <span className="truncate">{getSessionTypeLabel(sess.type)}</span>
                          </div>
                          <div className="text-[9px] text-riso-ink-secondary truncate">
                            {sess.plannedDurationHours || 2} h · {sess.objective}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-riso-ink-secondary/60 italic">
                      —
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-riso-ink-secondary font-medium text-right">
                  {day.sessions.length > 0
                    ? `${day.sessions.length} session${day.sessions.length > 1 ? 's' : ''}`
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 prochaines actions */}
        <div className="pt-4 border-t-2 border-riso-line space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-riso-ink uppercase tracking-wider font-heading">
              3 prochaines actions
            </h4>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className="riso-text-link text-xs cursor-pointer"
            >
              Toutes les tâches →
            </button>
          </div>

          {next3Actions.length === 0 ? (
            <div className="p-6 text-center rounded-[16px] border-2 border-dashed border-riso-line riso-dots-light space-y-2">
              <p className="font-bold text-xs text-riso-ink">Aucune tâche en attente</p>
              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className="btn-riso-secondary text-xs py-1.5 px-3.5 cursor-pointer"
              >
                Ajouter une tâche →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {next3Actions.map((task) => {
                const taskPhase = phases.find((p) => p.id === task.phaseId) || phases[0];
                const phaseColor = getPhaseColor(taskPhase, phases);
                const isOverdue = task.deadline && diffInDays(todayISO, task.deadline) < 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTab('checklist')}
                    className="p-3.5 rounded-[16px] border-2 border-riso-ink bg-riso-paper hover:bg-white shadow-riso-press transition-all cursor-pointer flex flex-col justify-between space-y-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className="px-2 py-0.5 rounded-full font-bold text-[10px] border border-riso-line"
                          style={{
                            backgroundColor: phaseColor.bgLight,
                            color: 'var(--riso-ink)',
                          }}
                        >
                          {taskPhase.nom || taskPhase.name}
                        </span>
                        {task.deadline && (
                          <span
                            className={`font-mono font-bold text-[10px] ${
                              isOverdue ? 'text-riso-p4' : 'text-riso-ink-secondary'
                            }`}
                          >
                            {formatFrenchDate(task.deadline, false)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-riso-ink line-clamp-2">
                        {task.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-riso-ink-secondary pt-1 border-t border-riso-line">
                      <span>{task.durationMinutes ? `${task.durationMinutes} min` : 'Action'}</span>
                      {settings.mode === 'groupe' && task.assignee && (
                        <span className="font-semibold truncate max-w-[100px]">
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <WeeklySummaryModal
        isOpen={isSummaryModalOpen}
        summary={weeklySummary}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </div>
  );
};
