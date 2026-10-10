/**
 * Tests de validation déterministes du moteur de planification locale (planGenerator).
 * Vérifie :
 * 1. Le calcul des bornes de phases sans décalage de timezone.
 * 2. Le placement des séances encadrées et le respect strict des exceptions.
 * 3. La répartition des sessions sur les jours préférés (Lun-Dim).
 * 4. La sanctuarisation absolue des éléments passés, réalisés ou marqués manuels.
 */

import {
  calculatePhaseDates,
  generateSupervisedSessions,
  generateAutonomousSessions,
  calculatePlanDiff,
  applyPlanDiff,
  generateFullProject,
} from '../planGenerator';
import { DEFAULT_6_PHASES, PROJECT_TEMPLATES } from '../initialTemplates';
import { getDayOfWeek, addDays } from '../localDate';
import { ProjectData } from '../../types/project';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export function runPlanGeneratorVerification(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  const assert = (condition: boolean, name: string, message?: string) => {
    results.push({
      name,
      passed: !!condition,
      message: condition ? undefined : message || 'Assertion failed',
    });
  };

  try {
    // Test 1: Calcul des phases
    const start = '2026-10-12'; // Lundi
    const end = '2026-12-04'; // Vendredi (~8 semaines)
    const phases = calculatePhaseDates(DEFAULT_6_PHASES, start, end);

    assert(
      phases[0].calculatedStartDate === start,
      'Phases - Début exact',
      `Attendu ${start}, reçu ${phases[0].calculatedStartDate}`
    );
    assert(
      phases[phases.length - 1].calculatedEndDate === end,
      'Phases - Fin exacte',
      `Attendu ${end}, reçu ${phases[phases.length - 1].calculatedEndDate}`
    );

    // Test 2: Séances encadrées récurrentes et exclusion des exceptions
    const exceptionDate = addDays(start, 10); // Jeudi 22 octobre si start est lundi 12 oct
    // Trouvons le premier jeudi (dayOfWeek = 4)
    let firstThursday = start;
    while (getDayOfWeek(firstThursday) !== 4) {
      firstThursday = addDays(firstThursday, 1);
    }
    const secondThursday = addDays(firstThursday, 7);

    const supervised = generateSupervisedSessions(
      {
        mode: 'recurrent',
        dayOfWeek: 4, // Jeudi
        durationHours: 2,
        exceptions: [secondThursday],
        specificDates: [],
      },
      start,
      end,
      phases,
      ['Moi']
    );

    assert(
      supervised.every((s) => getDayOfWeek(s.date) === 4),
      'Encadrement - Tous les jeudis',
      'Une séance n’est pas tombée un jeudi'
    );
    assert(
      !supervised.some((s) => s.date === secondThursday),
      'Encadrement - Respect strict de l’exception',
      `La date d'exception ${secondThursday} a été planifiée par erreur`
    );

    // Test 3: Sessions autonomes sur les jours préférés (Mardi=2, Jeudi=4)
    const autonomous = generateAutonomousSessions(
      {
        hoursPerWeek: 4,
        preferredDays: [2, 4],
      },
      start,
      end,
      phases,
      'individuel',
      ['Moi'],
      new Set(supervised.map((s) => s.date))
    );

    assert(
      autonomous.every((s) => [2, 4].includes(getDayOfWeek(s.date))),
      'Autonomie - Jours préférés respectés',
      'Des sessions ont été placées en dehors des jours préférés'
    );

    // Test 4: Sanctuarisation des éléments passés / réalisés / manuels
    const dummyProject: ProjectData = {
      id: 'proj_test',
      version: 2,
      createdAt: start,
      updatedAt: start,
      settings: {
        name: 'Projet Test',
        description: 'Test',
        startDate: start,
        deadlineDate: end,
        mode: 'individuel',
        team: [{ id: 'm1', name: 'Moi' }],
        targetSessionsCount: 5,
        defaultDurations: { individuelle: 2, groupe: 3, encadree: 2 },
      },
      phases,
      milestones: [
        {
          id: 'm_manual',
          title: 'Mon jalon manuel',
          phaseId: 'p2',
          daysBeforeDeadline: 20,
          useFixedDate: true,
          fixedDate: '2026-10-20',
          calculatedDate: '2026-10-20',
          completed: false,
          source: 'manual', // Manuel !
        },
      ],
      sessions: [
        {
          id: 's_past_done',
          date: '2026-10-01',
          type: 'individuelle',
          phaseId: 'p1',
          objective: 'Session passée déjà faite',
          plannedDurationHours: 2,
          attendees: ['Moi'],
          status: 'realisee', // Faite !
          source: 'auto',
        },
        {
          id: 's_future_manual',
          date: '2026-11-15',
          type: 'groupe',
          phaseId: 'p3',
          objective: 'Session future personnalisée à la main',
          plannedDurationHours: 3,
          attendees: ['Moi'],
          status: 'planifiee',
          source: 'manual', // Manuel !
        },
      ],
      tasks: [],
      deliverables: [],
      logbook: [],
    };

    const diff = calculatePlanDiff(dummyProject, {
      startDate: '2026-10-01',
      deadlineDate: '2026-12-25', // Reporté de 3 semaines
      supervisedSchedule: { mode: 'dates_libres', exceptions: [], specificDates: [] },
      availability: { hoursPerWeek: 6, preferredDays: [1, 3] },
    });

    assert(
      diff.preservedItems.some((item) => item.id === 's_past_done'),
      'Sécurité - Session réalisée préservée',
      'La session réalisée n’a pas été sanctuarisée'
    );
    assert(
      diff.preservedItems.some((item) => item.id === 's_future_manual'),
      'Sécurité - Session manuelle future préservée',
      'La session manuelle n’a pas été sanctuarisée'
    );
    assert(
      diff.preservedItems.some((item) => item.id === 'm_manual'),
      'Sécurité - Jalon manuel préservé',
      'Le jalon manuel n’a pas été sanctuarisé'
    );

    // Test de l'application
    const applied = applyPlanDiff(
      dummyProject,
      diff,
      { startDate: '2026-10-01', deadlineDate: '2026-12-25' },
      phases
    );

    assert(
      applied.sessions.some((s) => s.id === 's_past_done' && s.date === '2026-10-01'),
      'Application - Préservation effective de s_past_done',
      's_past_done a été altérée après application'
    );
    assert(
      applied.sessions.some((s) => s.id === 's_future_manual' && s.date === '2026-11-15'),
      'Application - Préservation effective de s_future_manual',
      's_future_manual a été altérée après application'
    );
    assert(
      applied.milestones.some((m) => m.id === 'm_manual' && m.calculatedDate === '2026-10-20'),
      'Application - Préservation effective de m_manual',
      'm_manual a été altéré après application'
    );
  } catch (err: any) {
    results.push({
      name: 'Exécution globale des tests',
      passed: false,
      message: err.message || String(err),
    });
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
