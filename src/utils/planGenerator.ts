/**
 * Moteur de planification automatique locale (0 appel API) et comparateur de diff sécurisé.
 * Sanctuarise à 100 % les éléments passés, réalisés ou marqués manuels.
 */

import {
  ProjectData,
  ProjectSettings,
  Phase,
  Milestone,
  WorkSession,
  IntermediateDeadline,
  SupervisedSchedule,
  ProjectAvailability,
  ProjectTemplateId,
  PlanDiff,
  PlanDiffItemMove,
  PlanDiffPhaseChange,
  PlanDiffPreserved,
} from '../types/project';
import {
  toLocalDateStr,
  getTodayLocalDateStr,
  parseLocalDate,
  addDays,
  getDaysDifference,
  getDayOfWeek,
  isBeforeOrEqual,
  isDateInRange,
} from './localDate';
import { PROJECT_TEMPLATES } from './initialTemplates';

const PHASE_OBJECTIVES_SAMPLE: Record<string, string[]> = {
  p1: [
    'Immersion terrain, observations et benchmark exploratoire',
    'Entretiens utilisateurs et identification des irritants',
    'Cartographie d’acteurs et analyse de l’écosystème',
    'Synthèse des données qualitatives et personas initiaux',
  ],
  p2: [
    'Analyse des tensions clés et opportunités de design',
    'Définition du persona prioritaire et cartographie du parcours usager',
    'Formulation de la question directrice (HMW)',
    'Validation de la note de cadrage et critères de succès',
  ],
  p3: [
    'Atelier de créativité et divergence tous azimuts',
    'Exploration de variations formelles et d’usages',
    'Sélection des 2 à 3 concepts clés et scénarisation',
    'Mise en forme des planches de concepts préliminaires',
  ],
  p4: [
    'Prototypage rapide basse fidélité (papier / carton / wireframes)',
    'Crash-tests utilisateurs et observation des incompréhensions',
    'Itération moyenne fidélité sur les points de friction',
    'Consolidation du prototype interactif ou physique',
  ],
  p5: [
    'Prise de recul critique et alignement avec le parti-pris de design',
    'Arbitrages éco-responsables, techniques et d’usage',
    'Affinement du positionnement et argumentaire',
  ],
  p6: [
    'Exécution soignée des livrables finaux et finitions graphiques',
    'Mise en page du carnet de démarche et synthèse des annexes',
    'Répétition du pitch et préparation du diaporama de soutenance',
    'Dépôt final des fichiers et soutenance devant le jury',
  ],
};

/**
 * Calcule les dates de début et fin de chaque phase au prorata des pourcentages.
 */
export function calculatePhaseDates(
  phases: Phase[],
  startDate: string,
  deadlineDate: string
): Phase[] {
  const totalDays = Math.max(1, getDaysDifference(startDate, deadlineDate));
  let currentStart = startDate;

  return phases.map((phase, index) => {
    // Si la phase a une date de fin fixée manuellement
    if (phase.fixedEndDate) {
      const pStart = currentStart;
      const pEnd = phase.fixedEndDate < pStart ? pStart : phase.fixedEndDate;
      currentStart = addDays(pEnd, 1);
      return {
        ...phase,
        nom: phase.nom || phase.name,
        name: phase.nom || phase.name,
        debut: pStart,
        fin: pEnd,
        calculatedStartDate: pStart,
        calculatedEndDate: pEnd,
        durationDays: Math.max(1, getDaysDifference(pStart, pEnd) + 1),
      };
    }

    const isLast = index === phases.length - 1;
    let phaseDays = Math.round((phase.timePercentage / 100) * totalDays);
    if (isLast) {
      // S'assure que la dernière phase atteint exactement la deadline
      const pStart = currentStart;
      const pEnd = deadlineDate >= pStart ? deadlineDate : pStart;
      return {
        ...phase,
        nom: phase.nom || phase.name,
        name: phase.nom || phase.name,
        debut: pStart,
        fin: pEnd,
        calculatedStartDate: pStart,
        calculatedEndDate: pEnd,
        durationDays: Math.max(1, getDaysDifference(pStart, pEnd) + 1),
      };
    }

    phaseDays = Math.max(1, phaseDays);
    const pStart = currentStart;
    const pEnd = addDays(pStart, phaseDays - 1);
    currentStart = addDays(pEnd, 1);

    return {
      ...phase,
      nom: phase.nom || phase.name,
      name: phase.nom || phase.name,
      debut: pStart,
      fin: pEnd,
      calculatedStartDate: pStart,
      calculatedEndDate: pEnd,
      durationDays: phaseDays,
    };
  });
}

/**
 * Trouve la phase active à une date donnée.
 */
export function getPhaseAtDate(phases: Phase[], dateStr: string): Phase {
  const match = phases.find((p) => {
    const s = p.debut || p.calculatedStartDate;
    const e = p.fin || p.calculatedEndDate;
    return s && e && isDateInRange(dateStr, s, e);
  });
  if (match) return match;
  const firstStart = phases[0]?.debut || phases[0]?.calculatedStartDate || '';
  if (phases[0] && dateStr < firstStart) return phases[0];
  return phases[phases.length - 1] || phases[0];
}

/**
 * Génère toutes les séances encadrées selon le planning configuré.
 */
export function generateSupervisedSessions(
  schedule: SupervisedSchedule | undefined,
  startDate: string,
  deadlineDate: string,
  phases: Phase[],
  attendees: string[]
): Omit<WorkSession, 'id'>[] {
  if (!schedule) return [];

  const sessions: Omit<WorkSession, 'id'>[] = [];
  const duration = schedule.durationHours || 2;
  const timeSlot = schedule.timeSlot ? ` (${schedule.timeSlot})` : '';

  if (schedule.mode === 'recurrent' && schedule.dayOfWeek) {
    const targetDay = schedule.dayOfWeek; // 1=Lundi .. 7=Dimanche
    let curr = startDate;
    let counter = 1;

    while (isBeforeOrEqual(curr, deadlineDate)) {
      if (getDayOfWeek(curr) === targetDay) {
        // Vérifie si la date est exclue
        if (!schedule.exceptions.includes(curr)) {
          const ph = getPhaseAtDate(phases, curr);
          sessions.push({
            date: curr,
            type: 'encadree',
            phaseId: ph.id,
            objective: `Séance encadrée #${counter} — Suivi de projet & retours${timeSlot}`,
            plannedDurationHours: duration,
            attendees: [...attendees],
            status: 'planifiee',
            source: 'auto',
          });
          counter++;
        }
      }
      curr = addDays(curr, 1);
    }
  } else if (schedule.mode === 'dates_libres') {
    schedule.specificDates.forEach((d, idx) => {
      if (isDateInRange(d, startDate, deadlineDate) && !schedule.exceptions.includes(d)) {
        const ph = getPhaseAtDate(phases, d);
        sessions.push({
          date: d,
          type: 'encadree',
          phaseId: ph.id,
          objective: `Séance encadrée #${idx + 1} — Point d'étape${timeSlot}`,
          plannedDurationHours: duration,
          attendees: [...attendees],
          status: 'planifiee',
          source: 'auto',
        });
      }
    });
  }

  return sessions;
}

/**
 * Garantit la présence des séances encadrées futures manquantes si le rythme récurrent est réglé (source auto).
 */
export function ensureRecurrentSupervisedSessions(
  project: ProjectData,
  onlyFuture: boolean = true
): WorkSession[] {
  const sched = project.settings.supervisedSchedule;
  if (!sched || sched.mode !== 'recurrent' || !sched.dayOfWeek) {
    return project.sessions || [];
  }

  const targetDay = sched.dayOfWeek;
  const duration =
    sched.durationHours ||
    project.settings.defaultDurations?.encadree ||
    2;
  const timeSlot = sched.timeSlot ? ` (${sched.timeSlot})` : '';
  const exceptions = sched.exceptions || [];
  const today = getTodayLocalDateStr();
  const startDate = project.settings.startDate;
  const deadlineDate = project.settings.deadlineDate;
  const attendeeNames =
    project.settings.team?.map((m) => m.name) || ['Moi-même'];

  const existingSupervisedDates = new Set(
    (project.sessions || [])
      .filter((s) => s.type === 'encadree')
      .map((s) => s.date)
  );

  let curr = startDate;
  let counter =
    (project.sessions || []).filter((s) => s.type === 'encadree').length + 1;
  const newSessions: WorkSession[] = [...(project.sessions || [])];
  let added = false;

  while (isBeforeOrEqual(curr, deadlineDate)) {
    if (getDayOfWeek(curr) === targetDay) {
      const isEligible = !onlyFuture || curr >= today;
      if (isEligible && !exceptions.includes(curr) && !existingSupervisedDates.has(curr)) {
        const ph = getPhaseAtDate(project.phases, curr);
        newSessions.push({
          id: `sess_auto_sup_${curr}`,
          date: curr,
          type: 'encadree',
          phaseId: ph.id,
          objective: `Séance encadrée #${counter} — Suivi de projet & retours${timeSlot}`,
          plannedDurationHours: duration,
          attendees: [...attendeeNames],
          status: 'planifiee',
          source: 'auto',
        });
        existingSupervisedDates.add(curr);
        counter++;
        added = true;
      }
    }
    curr = addDays(curr, 1);
  }

  if (added) {
    newSessions.sort((a, b) => a.date.localeCompare(b.date));
  }
  return newSessions;
}

/**
 * Génère les sessions de travail autonomes réparties sur les jours préférés.
 */
export function generateAutonomousSessions(
  availability: ProjectAvailability | undefined,
  startDate: string,
  deadlineDate: string,
  phases: Phase[],
  mode: 'individuel' | 'groupe',
  attendees: string[],
  supervisedDates: Set<string>
): Omit<WorkSession, 'id'>[] {
  if (!availability || availability.hoursPerWeek <= 0 || availability.preferredDays.length === 0) {
    return [];
  }

  const sessions: Omit<WorkSession, 'id'>[] = [];
  const sessionType = mode === 'individuel' ? 'individuelle' : 'groupe';
  const sessionDuration = mode === 'individuel' ? 2 : 3;

  // Nombre de sessions par semaine visé
  const sessionsPerWeek = Math.max(
    1,
    Math.min(availability.preferredDays.length, Math.round(availability.hoursPerWeek / sessionDuration))
  );
  const activeDays = availability.preferredDays.slice(0, sessionsPerWeek);

  let curr = startDate;
  const phaseCounters: Record<string, number> = {};

  while (isBeforeOrEqual(curr, deadlineDate)) {
    const day = getDayOfWeek(curr);
    if (activeDays.includes(day)) {
      // Si une séance encadrée n'est pas déjà présente ce jour
      const hasSupervised = supervisedDates.has(curr);
      const ph = getPhaseAtDate(phases, curr);
      const c = (phaseCounters[ph.id] || 0) + 1;
      phaseCounters[ph.id] = c;

      const samples = PHASE_OBJECTIVES_SAMPLE[ph.id] || [];
      const sampleText = samples[(c - 1) % samples.length] || `Travail d’atelier : ${ph.shortName}`;

      sessions.push({
        date: curr,
        type: sessionType,
        phaseId: ph.id,
        objective: hasSupervised
          ? `Atelier autonome complémentaire : ${sampleText}`
          : `${ph.shortName} — ${sampleText}`,
        plannedDurationHours: sessionDuration,
        attendees: [...attendees],
        status: 'planifiee',
        source: 'auto',
      });
    }
    curr = addDays(curr, 1);
  }

  return sessions;
}

/**
 * Génère les jalons alignés sur les rendus intermédiaires et les pourcentages types.
 */
export function generateMilestones(
  templateId: ProjectTemplateId,
  intermediateDeadlines: IntermediateDeadline[] | undefined,
  phases: Phase[],
  startDate: string,
  deadlineDate: string
): Omit<Milestone, 'id'>[] {
  const milestones: Omit<Milestone, 'id'>[] = [];
  const tpl = PROJECT_TEMPLATES[templateId] || PROJECT_TEMPLATES.vierge;

  // 1. Jalons issus des rendus intermédiaires renseignés
  if (intermediateDeadlines && intermediateDeadlines.length > 0) {
    intermediateDeadlines.forEach((dead) => {
      const ph = getPhaseAtDate(phases, dead.date);
      milestones.push({
        title: dead.name,
        phaseId: dead.phaseId || ph.id,
        daysBeforeDeadline: Math.max(0, getDaysDifference(dead.date, deadlineDate)),
        useFixedDate: true,
        fixedDate: dead.date,
        calculatedDate: dead.date,
        deliverableRef: dead.deliverableRef,
        completed: false,
        source: dead.source || 'auto',
      });
    });
  } else {
    // 2. Sinon, utilise les jalons par défaut du gabarit au prorata des pourcentages
    const totalDays = Math.max(1, getDaysDifference(startDate, deadlineDate));
    tpl.defaultMilestones.forEach((m) => {
      const offsetDays = Math.round((m.percentagePoint / 100) * totalDays);
      const date = addDays(startDate, offsetDays);
      const effectiveDate = isBeforeOrEqual(date, deadlineDate) ? date : deadlineDate;
      const ph = getPhaseAtDate(phases, effectiveDate);

      milestones.push({
        title: m.title,
        phaseId: m.phaseId || ph.id,
        daysBeforeDeadline: Math.max(0, getDaysDifference(effectiveDate, deadlineDate)),
        useFixedDate: true,
        fixedDate: effectiveDate,
        calculatedDate: effectiveDate,
        completed: false,
        source: 'auto',
      });
    });
  }

  // Jalon final garanti si non présent
  const hasFinal = milestones.some((m) => m.calculatedDate === deadlineDate);
  if (!hasFinal) {
    const lastPh = phases[phases.length - 1] || phases[0];
    milestones.push({
      title: 'Rendu final & soutenance',
      phaseId: lastPh.id,
      daysBeforeDeadline: 0,
      useFixedDate: true,
      fixedDate: deadlineDate,
      calculatedDate: deadlineDate,
      completed: false,
      source: 'auto',
    });
  }

  return milestones;
}

/**
 * Paramètres pour la génération ou reprogrammation d'un projet.
 */
export interface GeneratePlanParams {
  name: string;
  brief?: string;
  templateId: ProjectTemplateId;
  startDate: string;
  deadlineDate: string;
  mode: 'individuel' | 'groupe';
  teamMembers: { id: string; name: string; role?: string; color?: string }[];
  intermediateDeadlines: IntermediateDeadline[];
  supervisedSchedule: SupervisedSchedule;
  availability: ProjectAvailability;
  customPhases?: Phase[]; // Si l'utilisateur a ajusté les pourcentages sur la frise
}

/**
 * Génère un projet flambant neuf à partir des paramètres du wizard.
 */
export function generateFullProject(params: GeneratePlanParams): ProjectData {
  const tpl = PROJECT_TEMPLATES[params.templateId] || PROJECT_TEMPLATES.vierge;
  const basePhases = params.customPhases || tpl.phases;
  const phases = calculatePhaseDates(basePhases, params.startDate, params.deadlineDate);

  const attendeeNames = params.teamMembers.map((m) => m.name);

  // Séances encadrées
  const supervised = generateSupervisedSessions(
    params.supervisedSchedule,
    params.startDate,
    params.deadlineDate,
    phases,
    attendeeNames
  );
  const supervisedDates = new Set(supervised.map((s) => s.date));

  // Sessions autonomes
  const autonomous = generateAutonomousSessions(
    params.availability,
    params.startDate,
    params.deadlineDate,
    phases,
    params.mode,
    attendeeNames,
    supervisedDates
  );

  // Jalons
  const rawMilestones = generateMilestones(
    params.templateId,
    params.intermediateDeadlines,
    phases,
    params.startDate,
    params.deadlineDate
  );

  const sessions: WorkSession[] = [...supervised, ...autonomous]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s, idx) => ({
      ...s,
      id: `sess_auto_${Date.now()}_${idx}`,
    }));

  const milestones: Milestone[] = rawMilestones.map((m, idx) => ({
    ...m,
    id: `m_${Date.now()}_${idx}`,
  }));

  const deliverables = tpl.defaultDeliverables.map((d) => ({
    ...d,
    deadline: params.deadlineDate,
  }));

  const settings: ProjectSettings = {
    name: params.name,
    description: params.brief || tpl.description,
    brief: params.brief,
    templateId: params.templateId,
    startDate: params.startDate,
    deadlineDate: params.deadlineDate,
    mode: params.mode,
    team: params.teamMembers,
    targetSessionsCount: sessions.length,
    intermediateDeadlines: params.intermediateDeadlines,
    supervisedSchedule: params.supervisedSchedule,
    availability: params.availability,
    defaultDurations: {
      individuelle: 2,
      groupe: 3,
      encadree: params.supervisedSchedule.durationHours || 2,
    },
  };

  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings,
    phases,
    milestones,
    sessions,
    tasks: [],
    deliverables,
    logbook: [],
    activityLogs: [],
  };
}

/**
 * Calcule le différentiel précis avant toute modification des réglages.
 * RÈGLE ABSOLUE : préserve tout élément passé, réalisé ou manuel.
 */
export function calculatePlanDiff(
  current: ProjectData,
  newParams: {
    startDate: string;
    deadlineDate: string;
    templateId?: ProjectTemplateId;
    intermediateDeadlines?: IntermediateDeadline[];
    supervisedSchedule?: SupervisedSchedule;
    availability?: ProjectAvailability;
    phases?: Phase[];
  }
): PlanDiff {
  const today = getTodayLocalDateStr();

  // 1. Nouvelles phases
  const basePhases = newParams.phases || current.phases;
  const newPhases = calculatePhaseDates(basePhases, newParams.startDate, newParams.deadlineDate);

  const phasesChanged: PlanDiffPhaseChange[] = [];
  current.phases.forEach((oldPh) => {
    const newPh = newPhases.find((p) => p.id === oldPh.id);
    if (newPh) {
      if (
        oldPh.calculatedStartDate !== newPh.calculatedStartDate ||
        oldPh.calculatedEndDate !== newPh.calculatedEndDate ||
        oldPh.timePercentage !== newPh.timePercentage
      ) {
        phasesChanged.push({
          id: oldPh.id,
          name: oldPh.name,
          oldStartDate: oldPh.calculatedStartDate || '',
          newStartDate: newPh.calculatedStartDate || '',
          oldEndDate: oldPh.calculatedEndDate || '',
          newEndDate: newPh.calculatedEndDate || '',
          oldPercentage: oldPh.timePercentage,
          newPercentage: newPh.timePercentage,
        });
      }
    }
  });

  // 2. Inventaire des éléments sanctuarisés
  const preservedItems: PlanDiffPreserved[] = [];

  current.sessions.forEach((s) => {
    const isPast = s.date < today;
    const isDone = s.status === 'realisee';
    const isManual = s.source === 'manual';
    if (isPast || isDone) {
      preservedItems.push({
        id: s.id,
        title: s.objective,
        type: 'session',
        date: s.date,
        reason: 'past_or_done',
      });
    } else if (isManual) {
      preservedItems.push({
        id: s.id,
        title: s.objective,
        type: 'session',
        date: s.date,
        reason: 'manual',
      });
    }
  });

  current.milestones.forEach((m) => {
    const isPast = m.calculatedDate < today;
    const isDone = m.completed;
    const isManual = m.source === 'manual';
    if (isPast || isDone) {
      preservedItems.push({
        id: m.id,
        title: m.title,
        type: 'milestone',
        date: m.calculatedDate,
        reason: 'past_or_done',
      });
    } else if (isManual) {
      preservedItems.push({
        id: m.id,
        title: m.title,
        type: 'milestone',
        date: m.calculatedDate,
        reason: 'manual',
      });
    }
  });

  // 3. Calcul des nouvelles sessions futures
  const attendeeNames = current.settings.team.map((m) => m.name);
  const sched = newParams.supervisedSchedule || current.settings.supervisedSchedule;
  const avail = newParams.availability || current.settings.availability;

  const newSupervised = generateSupervisedSessions(
    sched,
    newParams.startDate,
    newParams.deadlineDate,
    newPhases,
    attendeeNames
  );
  const supervisedDates = new Set(newSupervised.map((s) => s.date));

  const newAutonomous = generateAutonomousSessions(
    avail,
    newParams.startDate,
    newParams.deadlineDate,
    newPhases,
    current.settings.mode,
    attendeeNames,
    supervisedDates
  );

  const allGeneratedFuture = [...newSupervised, ...newAutonomous].filter((s) => s.date >= today);

  // Sessions actuelles futures automatiques (qui sont recalculables)
  const currentFutureAutoSessions = current.sessions.filter(
    (s) => s.date >= today && s.status !== 'realisee' && s.source !== 'manual'
  );

  const sessionsAdded: Omit<WorkSession, 'id'>[] = [];
  const sessionsRemoved: WorkSession[] = [];
  const itemsMoved: PlanDiffItemMove[] = [];

  // Rapprochement simple pour détecter les déplacements
  const matchedOldIds = new Set<string>();

  allGeneratedFuture.forEach((newS) => {
    // Trouve une session du même type non encore appariée
    const candidate = currentFutureAutoSessions.find(
      (oldS) => !matchedOldIds.has(oldS.id) && oldS.type === newS.type
    );
    if (candidate) {
      matchedOldIds.add(candidate.id);
      if (candidate.date !== newS.date) {
        itemsMoved.push({
          id: candidate.id,
          title: candidate.objective,
          type: 'session',
          oldDate: candidate.date,
          newDate: newS.date,
        });
      }
    } else {
      sessionsAdded.push(newS);
    }
  });

  // Celles non appariées sont supprimées
  currentFutureAutoSessions.forEach((oldS) => {
    if (!matchedOldIds.has(oldS.id)) {
      sessionsRemoved.push(oldS);
    }
  });

  // 4. Jalons futurs
  const currentFutureAutoMilestones = current.milestones.filter(
    (m) => m.calculatedDate >= today && !m.completed && m.source !== 'manual'
  );

  const tplId = newParams.templateId || current.settings.templateId || 'vierge';
  const newGeneratedMilestones = generateMilestones(
    tplId,
    newParams.intermediateDeadlines || current.settings.intermediateDeadlines,
    newPhases,
    newParams.startDate,
    newParams.deadlineDate
  ).filter((m) => m.calculatedDate >= today);

  const milestonesAdded: Omit<Milestone, 'id' | 'calculatedDate'>[] = [];
  const milestonesRemoved: Milestone[] = [];
  const matchedOldMIds = new Set<string>();

  newGeneratedMilestones.forEach((newM) => {
    const candidate = currentFutureAutoMilestones.find(
      (oldM) => !matchedOldMIds.has(oldM.id) && oldM.title.toLowerCase() === newM.title.toLowerCase()
    );
    if (candidate) {
      matchedOldMIds.add(candidate.id);
      if (candidate.calculatedDate !== newM.calculatedDate) {
        itemsMoved.push({
          id: candidate.id,
          title: candidate.title,
          type: 'milestone',
          oldDate: candidate.calculatedDate,
          newDate: newM.calculatedDate,
        });
      }
    } else {
      milestonesAdded.push(newM);
    }
  });

  currentFutureAutoMilestones.forEach((oldM) => {
    if (!matchedOldMIds.has(oldM.id)) {
      milestonesRemoved.push(oldM);
    }
  });

  return {
    phasesChanged,
    itemsMoved,
    sessionsAdded,
    sessionsRemoved,
    milestonesAdded,
    milestonesRemoved,
    preservedCount: preservedItems.length,
    preservedItems,
  };
}

/**
 * Applique le PlanDiff sur le projet courant de manière non destructive.
 */
export function applyPlanDiff(
  current: ProjectData,
  diff: PlanDiff,
  newSettings: Partial<ProjectSettings>,
  newPhases: Phase[]
): ProjectData {
  const removedSessionIds = new Set(diff.sessionsRemoved.map((s) => s.id));
  const removedMilestoneIds = new Set(diff.milestonesRemoved.map((m) => m.id));

  const movesMap = new Map<string, string>();
  diff.itemsMoved.forEach((mv) => movesMap.set(mv.id, mv.newDate));

  // 1. Met à jour les sessions existantes
  const updatedSessions: WorkSession[] = current.sessions
    .filter((s) => !removedSessionIds.has(s.id))
    .map((s) => {
      if (movesMap.has(s.id)) {
        const newD = movesMap.get(s.id)!;
        const ph = getPhaseAtDate(newPhases, newD);
        return {
          ...s,
          date: newD,
          phaseId: ph.id,
        };
      }
      return s;
    });

  // 2. Ajoute les nouvelles sessions
  diff.sessionsAdded.forEach((sAdd, idx) => {
    updatedSessions.push({
      ...sAdd,
      id: `sess_auto_${Date.now()}_${idx}`,
    });
  });

  updatedSessions.sort((a, b) => a.date.localeCompare(b.date));

  // 3. Met à jour les jalons
  const updatedMilestones: Milestone[] = current.milestones
    .filter((m) => !removedMilestoneIds.has(m.id))
    .map((m) => {
      if (movesMap.has(m.id)) {
        const newD = movesMap.get(m.id)!;
        const ph = getPhaseAtDate(newPhases, newD);
        return {
          ...m,
          calculatedDate: newD,
          fixedDate: m.useFixedDate ? newD : m.fixedDate,
          phaseId: ph.id,
        };
      }
      return m;
    });

  diff.milestonesAdded.forEach((mAdd, idx) => {
    updatedMilestones.push({
      ...mAdd,
      id: `m_auto_${Date.now()}_${idx}`,
      calculatedDate: mAdd.fixedDate || (newSettings.deadlineDate || current.settings.deadlineDate),
    });
  });

  updatedMilestones.sort((a, b) => a.calculatedDate.localeCompare(b.calculatedDate));

  return {
    ...current,
    updatedAt: new Date().toISOString(),
    settings: {
      ...current.settings,
      ...newSettings,
      targetSessionsCount: updatedSessions.length,
    },
    phases: newPhases,
    sessions: updatedSessions,
    milestones: updatedMilestones,
  };
}
