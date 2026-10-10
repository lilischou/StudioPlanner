import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ProjectData,
  ProjectSettings,
  TeamMember,
  Phase,
  Milestone,
  WorkSession,
  Task,
  Deliverable,
  LogbookEntry,
  AppNotification,
  ProjectReminder,
  NotificationPreferences,
  DependencyAlert,
  DEFAULT_OPERATION_TAGS,
  PlanDiff,
} from '../types/project';
import {
  createBlankProject,
} from '../utils/initialTemplates';
import {
  GeneratePlanParams,
  generateFullProject,
  applyPlanDiff,
  ensureRecurrentSupervisedSessions,
} from '../utils/planGenerator';
import { normalizeTrace, withLegacyMirror } from '../utils/trace';
import {
  recalculatePhaseDates,
  recalculateMilestones,
  validateTaskDependencies,
  autoAdjustSuccessorDates,
  formatISODate,
} from '../utils/dateCalculations';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  computeProjectReminders,
} from '../utils/notificationService';
import {
  PhaseColorKey,
  RISO_PHASE_PALETTE,
  getPhaseColor,
} from '../utils/theme';
import { addDays } from '../utils/localDate';

export interface FocusTarget {
  type: 'task' | 'session';
  id: string;
  title: string;
  durationMinutes: number;
  phaseId: string;
}

export type TabType =
  | 'aujourdhui'
  | 'parcours'
  | 'sessions'
  | 'journal'
  | 'tableau_de_bord'
  | 'parametres'
  | 'feuille_de_route'
  | 'retroplanning'
  | 'checklist'
  | 'livrables';

interface ProjectContextType {
  projects: ProjectData[];
  activeProject: ProjectData;
  activeProjectId: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setActiveProjectId: (id: string) => void;
  // Focus Mode
  activeFocusTarget: FocusTarget | null;
  openFocusMode: (target: FocusTarget) => void;
  closeFocusMode: () => void;
  // Project management & Wizard
  createProjectFromWizard: (params: GeneratePlanParams) => void;
  applyPlanDiffToActiveProject: (diff: PlanDiff, newSettings: Partial<ProjectSettings>, newPhases: Phase[]) => void;
  createNewProject: (
    name: string,
    mode?: 'individuel' | 'groupe',
    startDate?: string,
    deadlineDate?: string,
    teamMembers?: TeamMember[]
  ) => void;
  cloneCurrentProject: (newName?: string) => void;
  deleteProject: (id: string) => void;
  exportProjectJSON: () => void;
  importProjectJSON: (jsonString: string) => boolean;
  // Settings & recalculation
  updateSettings: (newSettings: Partial<ProjectSettings>) => void;
  // Phases
  updatePhases: (newPhases: Phase[]) => void;
  updatePhasePercentage: (phaseId: string, percentage: number) => void;
  updatePhaseFixedEndDate: (phaseId: string, fixedDate?: string) => void;
  addPhase: (phase?: Partial<Phase>) => void;
  updatePhase: (phaseId: string, updates: Partial<Phase>) => void;
  deletePhase: (phaseId: string) => { success: boolean; reason?: string };
  tasksPhaseFilter: string | null;
  setTasksPhaseFilter: (phaseId: string | null) => void;
  // Milestones
  addMilestone: (milestone: Omit<Milestone, 'id' | 'calculatedDate'>) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;
  // Sessions
  addSession: (session: Omit<WorkSession, 'id'>) => void;
  updateSession: (id: string, updates: Partial<WorkSession>) => void;
  deleteSession: (id: string) => void;
  // Tasks & Dependencies
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>, autoAdjustSuccessors?: boolean) => void;
  deleteTask: (id: string) => void;
  addDependency: (taskId: string, predecessorId: string) => boolean;
  removeDependency: (taskId: string, predecessorId: string) => void;
  autoFixSuccessorDeadlines: (taskId: string) => void;
  dependencyAlerts: DependencyAlert[];
  // Deliverables
  addDeliverable: (deliverable: Omit<Deliverable, 'id'>) => void;
  updateDeliverable: (id: string, updates: Partial<Deliverable>) => void;
  deleteDeliverable: (id: string) => void;
  toggleDeliverableCriterion: (deliverableId: string, criterionId: string) => void;
  // Logbook
  addLogbookEntry: (entry: Omit<LogbookEntry, 'id'>) => void;
  updateLogbookEntry: (id: string, updates: Partial<LogbookEntry>) => void;
  deleteLogbookEntry: (id: string) => void;
  journalDraft: Partial<LogbookEntry> | null;
  openJournalWithDraft: (draft: Partial<LogbookEntry>) => void;
  clearJournalDraft: () => void;
  // Notifications & Rappels
  reminders: ProjectReminder[];
  reminderCount: number;
  dismissAllReminders: () => void;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_PROJECTS_KEY = 'studioplanner_projects_v2';
const STORAGE_ACTIVE_ID_KEY = 'studioplanner_active_id_v2';
const STORAGE_PREFS_KEY = 'studioplanner_notification_prefs_v2';
const STORAGE_READ_NOTIFS_KEY = 'studioplanner_read_notifs_v2';

function isExampleObjective(text?: string): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return (
    t === '' ||
    t === 'objectifs de cette phase' ||
    t === 'objectif de cette phase' ||
    t === 'objectif de cette étape' ||
    t === 'objectifs de cette étape' ||
    t === 'objectif de cette etape' ||
    t === 'objectifs de cette etape' ||
    t === 'aucun objectif défini' ||
    t === 'aucun objectif defini' ||
    t === 'objectif' ||
    t === 'objectifs'
  );
}

function isExampleDeliverable(text?: string): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return (
    t === '' ||
    t === 'livrable attendu' ||
    t === 'livrables attendus' ||
    t === 'livrable attendu à cette étape' ||
    t === 'livrable attendu de cette étape' ||
    t === 'livrable attendu a cette etape' ||
    t === 'livrable attendu de cette etape' ||
    t === 'aucun livrable attendu' ||
    t === 'aucun livrable défini'
  );
}

/**
 * Migration douce : ne supprime ni ne remplace jamais les données existantes.
 * Complète uniquement les champs manquants ou vides lors d'une mise à jour de l'app.
 */
export function migrateProjectData(project: ProjectData): ProjectData {
  const p = { ...project };

  // 1. Garantir les 7 étiquettes d'opérations par défaut si vides ou manquantes
  if (!p.settings.customTags || p.settings.customTags.length === 0) {
    p.settings = {
      ...p.settings,
      customTags: [...DEFAULT_OPERATION_TAGS],
    };
  }

  // 2. Harmonisation des réglages de planification (gabarit, rendus intermédiaires, dispo, encadrement)
  p.settings = {
    ...p.settings,
    templateId: p.settings.templateId || 'vierge',
    intermediateDeadlines: Array.isArray(p.settings.intermediateDeadlines)
      ? p.settings.intermediateDeadlines
      : [],
    supervisedSchedule: p.settings.supervisedSchedule || {
      mode: 'dates_libres',
      exceptions: [],
      specificDates: [],
    },
    availability: p.settings.availability || {
      hoursPerWeek: 0,
      preferredDays: [],
    },
  };

  // 3. Migration douce des phases et rétrocompatibilité :
  //    P1 → Exploration (bleu), P2 → Idéation (jaune), P3 → Finalisation (violet).
  //    En gardant dates et tâches intactes.
  if (Array.isArray(p.phases)) {
    // Si le projet a les 6 phases d'origine (p1..p6)
    if (
      p.phases.length === 6 &&
      p.phases[0]?.id === 'p1' &&
      p.phases[5]?.id === 'p6' &&
      (p.phases[1]?.name?.includes('Cadrage') || p.phases[1]?.shortName === 'Cadrage')
    ) {
      const oldP1 = p.phases[0];
      const oldP2 = p.phases[1];
      const oldP3 = p.phases[2];
      const oldP4 = p.phases[3];
      const oldP6 = p.phases[5];

      const p1Start = oldP1.debut || oldP1.calculatedStartDate || p.settings.startDate;
      const p1End = oldP2.fin || oldP2.calculatedEndDate || oldP1.fin || oldP1.calculatedEndDate || p.settings.startDate;
      const p2Start = addDays(p1End, 1);
      const p2End = oldP4.fin || oldP4.calculatedEndDate || oldP3.fin || oldP3.calculatedEndDate || p2Start;
      const p3Start = addDays(p2End, 1);
      const p3End = oldP6.fin || oldP6.calculatedEndDate || p.settings.deadlineDate;

      p.phases = [
        {
          ...oldP1,
          id: 'p1',
          number: 1,
          nom: 'Exploration',
          name: 'Exploration',
          shortName: 'Exploration',
          couleur: 'blue',
          color: '#2F6DBB',
          debut: p1Start,
          fin: p1End,
          calculatedStartDate: p1Start,
          calculatedEndDate: p1End,
          timePercentage: 30,
          objectif: '',
          objective: '',
          livrableAttendu: '',
          deliverableSummary: '',
          source: oldP1.source || 'auto',
        },
        {
          ...oldP3,
          id: 'p2',
          number: 2,
          nom: 'Idéation',
          name: 'Idéation',
          shortName: 'Idéation',
          couleur: 'yellow',
          color: '#F2D21B',
          debut: p2Start,
          fin: p2End,
          calculatedStartDate: p2Start,
          calculatedEndDate: p2End,
          timePercentage: 35,
          objectif: '',
          objective: '',
          livrableAttendu: '',
          deliverableSummary: '',
          source: oldP3.source || 'auto',
        },
        {
          ...oldP6,
          id: 'p3',
          number: 3,
          nom: 'Finalisation',
          name: 'Finalisation',
          shortName: 'Finalisation',
          couleur: 'purple',
          color: '#7A4A9E',
          debut: p3Start,
          fin: p3End,
          calculatedStartDate: p3Start,
          calculatedEndDate: p3End,
          timePercentage: 35,
          objectif: '',
          objective: '',
          livrableAttendu: '',
          deliverableSummary: '',
          source: oldP6.source || 'auto',
        },
      ];

      const remapPhaseId = (oldId: string): string => {
        if (oldId === 'p1' || oldId === 'p2') return 'p1';
        if (oldId === 'p3' || oldId === 'p4') return 'p2';
        return 'p3';
      };

      if (Array.isArray(p.tasks)) {
        p.tasks = p.tasks.map((t) => ({ ...t, phaseId: remapPhaseId(t.phaseId) }));
      }
      if (Array.isArray(p.sessions)) {
        p.sessions = p.sessions.map((s) => ({ ...s, phaseId: remapPhaseId(s.phaseId) }));
      }
      if (Array.isArray(p.milestones)) {
        p.milestones = p.milestones.map((m) => ({ ...m, phaseId: remapPhaseId(m.phaseId) }));
      }
      if (Array.isArray(p.logbook)) {
        p.logbook = p.logbook.map((l) => ({ ...l, phaseId: remapPhaseId(l.phaseId) }));
      }
    } else {
      // Normalisation des champs et correction des phases (3 phases de base)
      // Point 1 : P1 Exploration (bleu), P2 Idéation (jaune), P3 Finalisation (violet)
      // Correction du renommage erroné de la phase 1 en « Idéation »
      p.phases = p.phases.map((ph, idx) => {
        let nom = ph.nom || ph.name || `Phase ${idx + 1}`;
        let couleur = ph.couleur || ph.color;

        if (ph.id === 'p1' || idx === 0) {
          // Phase 1 : Exploration (bleu), correction si renommée Idéation par erreur
          nom = 'Exploration';
          couleur = 'blue';
        } else if (ph.id === 'p2' || idx === 1) {
          nom = 'Idéation';
          couleur = 'yellow';
        } else if (ph.id === 'p3' || idx === 2) {
          nom = 'Finalisation';
          couleur = 'purple';
        }

        const colorEntry = getPhaseColor((couleur as string) || (ph.color as string) || ph.id);
        couleur = colorEntry.key;
        const color = colorEntry.hex;
        const debut = ph.debut || ph.calculatedStartDate || p.settings.startDate;
        const fin = ph.fin || ph.calculatedEndDate || p.settings.deadlineDate;

        // Point 4 : vider si texte d'exemple
        const rawObj = ph.objectif || ph.objective || '';
        const objectif = isExampleObjective(rawObj) ? '' : rawObj.trim();
        const rawLiv = ph.livrableAttendu || ph.deliverableSummary || '';
        const livrableAttendu = isExampleDeliverable(rawLiv) ? '' : rawLiv.trim();

        return {
          ...ph,
          number: ph.number ?? idx + 1,
          nom,
          name: nom,
          shortName: nom,
          couleur,
          color,
          debut,
          fin,
          calculatedStartDate: debut,
          calculatedEndDate: fin,
          objectif,
          objective: objectif,
          livrableAttendu,
          deliverableSummary: livrableAttendu,
          source: ph.source || 'auto',
        };
      });

      // Point 2 : Durées par défaut équilibrées 30 % / 35 % / 35 %
      // Applique au projet actif seulement si l'utilisatrice n'a pas modifié les dates à la main
      const hasManualDates = p.phases.some((ph) => !!ph.fixedEndDate);
      if (!hasManualDates && p.phases.length === 3) {
        p.phases[0].timePercentage = 30;
        p.phases[1].timePercentage = 35;
        p.phases[2].timePercentage = 35;
        p.phases = recalculatePhaseDates(p.phases, p.settings.startDate, p.settings.deadlineDate);
      }
    }
  }

  // 4. Livrables : re-rattache chaque livrable à la phase qui contient sa date de dépôt
  //    (date ≥ rendu final → dernière phase) (Point 3)
  if (Array.isArray(p.deliverables) && Array.isArray(p.phases) && p.phases.length > 0) {
    const lastPhase = p.phases[p.phases.length - 1];
    const firstPhase = p.phases[0];
    const deadlineDate = p.settings.deadlineDate;

    p.deliverables = p.deliverables.map((del) => {
      let phaseId = lastPhase.id;
      if (!del.deadline) {
        phaseId = del.phaseId && p.phases.some((ph) => ph.id === del.phaseId) ? del.phaseId : lastPhase.id;
      } else if (deadlineDate && del.deadline >= deadlineDate) {
        phaseId = lastPhase.id;
      } else {
        const matched = p.phases.find((ph) => {
          const s = ph.debut || ph.calculatedStartDate || '';
          const e = ph.fin || ph.calculatedEndDate || '';
          return s && e && del.deadline >= s && del.deadline <= e;
        });
        if (matched) {
          phaseId = matched.id;
        } else {
          const firstStart = firstPhase.debut || firstPhase.calculatedStartDate || '';
          if (firstStart && del.deadline < firstStart) {
            phaseId = firstPhase.id;
          } else {
            phaseId = lastPhase.id;
          }
        }
      }
      return {
        ...del,
        phaseId,
      };
    });
  }

  // 5. Sanctuarisation des sessions existantes & Point 6 : génération des sessions futures si rythme configuré
  if (Array.isArray(p.sessions)) {
    p.sessions = p.sessions.map((s) => ({
      ...s,
      source: s.source || 'manual',
    }));

    // Si le rythme « tous les jeudis » (ou tout jour récurrent) est réglé, génère les sessions futures manquantes (source auto)
    if (p.settings.supervisedSchedule?.mode === 'recurrent' && p.settings.supervisedSchedule?.dayOfWeek) {
      p.sessions = ensureRecurrentSupervisedSessions(p, true);
    }
    p.settings.targetSessionsCount = p.sessions.length;
  }

  // 6. Sanctuarisation des jalons existants : marquage 'manual' si non défini
  if (Array.isArray(p.milestones)) {
    p.milestones = p.milestones.map((m) => ({
      ...m,
      source: m.source || 'manual',
    }));
  }

  // 7. Sanctuarisation des tâches existantes : marquage 'manual' si non défini
  if (Array.isArray(p.tasks)) {
    p.tasks = p.tasks.map((t) => ({
      ...t,
      source: t.source || 'manual',
    }));
  }

  // 8. Journal : chaque trace affiche le nom réel de sa phase ; compteurs par phase corrects (Point 5)
  if (Array.isArray(p.logbook)) {
    p.logbook = p.logbook.map((entry) => {
      let phaseId = entry.phaseId;
      if (!p.phases || !p.phases.some((ph) => ph.id === phaseId)) {
        if (p.phases && p.phases.length > 0) {
          const matched = p.phases.find((ph) => {
            const s = ph.debut || ph.calculatedStartDate || '';
            const e = ph.fin || ph.calculatedEndDate || '';
            return s && e && entry.date >= s && entry.date <= e;
          });
          phaseId = matched ? matched.id : p.phases[0].id;
        }
      }
      return normalizeTrace({
        ...entry,
        phaseId,
      });
    });
  }

  return p;
}

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize projects list from localStorage or start fresh with a blank project
  const [projects, setProjects] = useState<ProjectData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filtrer tout résidu du projet d'exemple (Vél'Urbain)
          const nonDemo = parsed.filter(
            (p: any) =>
              p &&
              p.id !== 'demo_ecomobilite_2026' &&
              !p.id?.startsWith('demo_') &&
              !p.settings?.name?.toLowerCase().includes("vél'urbain") &&
              !p.settings?.name?.toLowerCase().includes("vel'urbain")
          );
          if (nonDemo.length > 0) {
            return nonDemo.map(migrateProjectData);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse stored projects', e);
    }
    // Par défaut : un projet vierge prêt pour la démarche de design
    const blank = createBlankProject('Mon projet de design', 'individuel');
    return [blank];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (stored && projects.some((p) => p.id === stored)) return stored;
    } catch {}
    return projects[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<TabType>('aujourdhui');

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFS_KEY);
      if (stored) return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_NOTIFICATION_PREFERENCES;
  });

  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_READ_NOTIFS_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });

  const [activeFocusTarget, setActiveFocusTarget] = useState<FocusTarget | null>(null);
  const [journalDraft, setJournalDraft] = useState<Partial<LogbookEntry> | null>(null);
  const [tasksPhaseFilter, setTasksPhaseFilter] = useState<string | null>(null);

  const openFocusMode = (target: FocusTarget) => {
    setActiveFocusTarget(target);
  };

  const closeFocusMode = () => {
    setActiveFocusTarget(null);
  };

  const openJournalWithDraft = (draft: Partial<LogbookEntry>) => {
    setJournalDraft(draft);
    setActiveTab('journal');
  };

  const clearJournalDraft = () => {
    setJournalDraft(null);
  };

  // Current active project
  const activeProject = useMemo(() => {
    const found = projects.find((p) => p.id === activeProjectId);
    if (found) return found;
    return projects[0] || createBlankProject();
  }, [projects, activeProjectId]);

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  // Save active project ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeProjectId);
    } catch {}
  }, [activeProjectId]);

  // Save notification preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(notificationPreferences));
    } catch {}
  }, [notificationPreferences]);

  const STORAGE_DISMISSED_REMINDERS_KEY = 'studioplanner_dismissed_reminders_v2';

  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DISMISSED_REMINDERS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  // Compute dependency alerts for current project
  const dependencyAlerts = useMemo(() => {
    return validateTaskDependencies(activeProject.tasks);
  }, [activeProject.tasks]);

  // Rappels calculés à l'ouverture, 3 types seulement : tâche en retard · échéance dans ≤ 48 h · rendu dans ≤ 7 j.
  // Max 5, triés par urgence.
  const reminders = useMemo(() => {
    const all = computeProjectReminders(activeProject);
    return all.filter((r) => !dismissedReminderIds.has(r.id)).slice(0, 5);
  }, [activeProject, dismissedReminderIds]);

  const reminderCount = reminders.length;

  const dismissAllReminders = () => {
    setDismissedReminderIds((prev) => {
      const next = new Set(prev);
      reminders.forEach((r) => next.add(r.id));
      try {
        localStorage.setItem(STORAGE_DISMISSED_REMINDERS_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const notifications = reminders as any;
  const unreadNotificationCount = reminderCount;

  // Helper to update active project
  const mutateActiveProject = (updater: (prev: ProjectData) => ProjectData) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        const updated = updater(proj);
        return {
          ...updated,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Supprime l'historique d'activité
  const logActivity = (..._args: any[]) => {
    // No-op : plus aucun historique d'activité généré
  };

  // 1. Project CRUD & Wizard
  const createProjectFromWizard = (params: GeneratePlanParams) => {
    const newProj = generateFullProject(params);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('aujourdhui');
  };

  const applyPlanDiffToActiveProject = (
    diff: PlanDiff,
    newSettings: Partial<ProjectSettings>,
    newPhases: Phase[]
  ) => {
    mutateActiveProject((current) => {
      const updated = applyPlanDiff(current, diff, newSettings, newPhases);
      const nextSessions = ensureRecurrentSupervisedSessions(updated, true);
      return {
        ...updated,
        sessions: nextSessions,
        settings: {
          ...updated.settings,
          targetSessionsCount: nextSessions.length,
        },
      };
    });
    logActivity('Planification', 'Planning mis à jour avec préservation de l’historique', 'settings');
  };

  const createNewProject = (
    name: string,
    mode: 'individuel' | 'groupe' = 'individuel',
    startDate?: string,
    deadlineDate?: string,
    teamMembers?: TeamMember[]
  ) => {
    const newProj = createBlankProject(name, mode, startDate, deadlineDate);
    if (teamMembers && teamMembers.length > 0) {
      newProj.settings.team = teamMembers;
    }
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('aujourdhui');
  };

  const cloneCurrentProject = (newName?: string) => {
    const clonedName = newName || `Copie de ${activeProject.settings.name}`;
    const cloned: ProjectData = {
      ...JSON.parse(JSON.stringify(activeProject)),
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        ...activeProject.settings,
        name: clonedName,
      },
      activityLogs: [],
    };
    setProjects((prev) => [cloned, ...prev]);
    setActiveProjectId(cloned.id);
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
      // If deleting the only project, create a blank one
      const fallback = createBlankProject('Nouveau Projet');
      setProjects([fallback]);
      setActiveProjectId(fallback.id);
      return;
    }
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setActiveProjectId(filtered[0].id);
    }
  };

  const exportProjectJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeProject.settings.name.replace(/\s+/g, '_')}_plan.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importProjectJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as ProjectData;
      if (parsed.settings && Array.isArray(parsed.phases) && Array.isArray(parsed.tasks)) {
        const importedProject: ProjectData = {
          ...parsed,
          id: `proj_${Date.now()}_imp`,
          updatedAt: new Date().toISOString(),
        };
        setProjects((prev) => [importedProject, ...prev]);
        setActiveProjectId(importedProject.id);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  };

  // 2. Settings update with auto-recalculation
  const updateSettings = (newSettings: Partial<ProjectSettings>) => {
    mutateActiveProject((prev) => {
      const updatedSettings = { ...prev.settings, ...newSettings };
      // If start or deadline dates change, recalculate phases and milestones
      const datesChanged =
        newSettings.startDate !== undefined || newSettings.deadlineDate !== undefined;

      let newPhases = prev.phases;
      let newMilestones = prev.milestones;

      if (datesChanged) {
        newPhases = recalculatePhaseDates(
          prev.phases,
          updatedSettings.startDate,
          updatedSettings.deadlineDate
        );
        newMilestones = recalculateMilestones(prev.milestones, updatedSettings.deadlineDate);
      }

      let updatedProject: ProjectData = {
        ...prev,
        settings: updatedSettings,
        phases: newPhases,
        milestones: newMilestones,
      };

      if (
        updatedSettings.supervisedSchedule?.mode === 'recurrent' &&
        updatedSettings.supervisedSchedule?.dayOfWeek
      ) {
        const nextSessions = ensureRecurrentSupervisedSessions(updatedProject, true);
        updatedProject = {
          ...updatedProject,
          sessions: nextSessions,
          settings: {
            ...updatedProject.settings,
            targetSessionsCount: nextSessions.length,
          },
        };
      }

      return updatedProject;
    });
    logActivity('Paramètres mis à jour', 'Dates ou informations générales modifiées', 'settings');
  };

  // 3. Phases
  const updatePhases = (newPhases: Phase[]) => {
    mutateActiveProject((prev) => ({
      ...prev,
      phases: recalculatePhaseDates(newPhases, prev.settings.startDate, prev.settings.deadlineDate),
    }));
  };

  const updatePhasePercentage = (phaseId: string, percentage: number) => {
    mutateActiveProject((prev) => {
      const target = prev.phases.find((p) => p.id === phaseId);
      if (!target) return prev;

      const diff = percentage - target.timePercentage;
      const otherPhases = prev.phases.filter((p) => p.id !== phaseId);
      const otherSum = otherPhases.reduce((s, p) => s + p.timePercentage, 0);

      // Redistribute difference proportionately among other phases
      const updatedPhases = prev.phases.map((p) => {
        if (p.id === phaseId) {
          return { ...p, timePercentage: Math.max(1, Math.min(95, percentage)) };
        }
        if (otherSum <= 0) return p;
        const proportion = p.timePercentage / otherSum;
        const adjusted = Math.max(1, Math.round(p.timePercentage - diff * proportion));
        return { ...p, timePercentage: adjusted };
      });

      return {
        ...prev,
        phases: recalculatePhaseDates(updatedPhases, prev.settings.startDate, prev.settings.deadlineDate),
      };
    });
  };

  const updatePhaseFixedEndDate = (phaseId: string, fixedDate?: string) => {
    mutateActiveProject((prev) => {
      const target = prev.phases.find((p) => p.id === phaseId);
      const start = target?.debut || target?.calculatedStartDate;
      if (fixedDate && start && fixedDate < start) {
        return prev;
      }
      const updated = prev.phases.map((p) =>
        p.id === phaseId ? { ...p, fixedEndDate: fixedDate || undefined } : p
      );
      return {
        ...prev,
        phases: recalculatePhaseDates(updated, prev.settings.startDate, prev.settings.deadlineDate),
      };
    });
  };

  const addPhase = (phaseData?: Partial<Phase>) => {
    mutateActiveProject((prev) => {
      const paletteKeys: PhaseColorKey[] = ['blue', 'yellow', 'purple', 'green', 'pink', 'orange'];
      const usedColors = new Set(prev.phases.map((ph) => ph.couleur));
      const nextColor =
        paletteKeys.find((c) => !usedColors.has(c)) ||
        paletteKeys[prev.phases.length % paletteKeys.length];

      const newId = `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nextNum = prev.phases.length + 1;
      const nom = phaseData?.nom || phaseData?.name || `Phase ${nextNum}`;
      const couleur = (phaseData?.couleur || nextColor) as PhaseColorKey;
      const hex = RISO_PHASE_PALETTE[couleur]?.hex || '#2F6DBB';
      const rawObj = phaseData?.objectif || phaseData?.objective || '';
      const objectif = isExampleObjective(rawObj) ? '' : rawObj.trim();
      const rawLiv = phaseData?.livrableAttendu || phaseData?.deliverableSummary || '';
      const livrableAttendu = isExampleDeliverable(rawLiv) ? '' : rawLiv.trim();

      const lastPhase = prev.phases[prev.phases.length - 1];
      const debut = lastPhase
        ? lastPhase.fin || lastPhase.calculatedEndDate || prev.settings.deadlineDate
        : prev.settings.startDate;
      const fin = prev.settings.deadlineDate;

      const newPhasesRaw: Phase[] = [
        ...prev.phases.map((ph) => ({
          ...ph,
          timePercentage: Math.max(5, Math.round((ph.timePercentage || 25) * 0.8)),
        })),
        {
          id: newId,
          number: nextNum,
          nom,
          name: nom,
          shortName: nom,
          couleur,
          color: hex,
          debut,
          fin,
          calculatedStartDate: debut,
          calculatedEndDate: fin,
          objectif,
          objective: objectif,
          keyQuestions: phaseData?.keyQuestions || [],
          methods: phaseData?.methods || [],
          livrableAttendu,
          deliverableSummary: livrableAttendu,
          timePercentage: 20,
          source: 'manual',
        },
      ];

      const recalculated = recalculatePhaseDates(
        newPhasesRaw,
        prev.settings.startDate,
        prev.settings.deadlineDate
      );

      return {
        ...prev,
        phases: recalculated,
      };
    });
    logActivity('Nouvelle phase', 'Phase ajoutée au projet', 'settings');
  };

  const updatePhase = (phaseId: string, updates: Partial<Phase>) => {
    mutateActiveProject((prev) => {
      const updatedPhases = prev.phases.map((ph) => {
        if (ph.id !== phaseId) return ph;
        const nom =
          updates.nom !== undefined
            ? updates.nom
            : updates.name !== undefined
            ? updates.name
            : ph.nom || ph.name;
        const rawCouleur =
          updates.couleur !== undefined
            ? updates.couleur
            : updates.color !== undefined
            ? updates.color
            : ph.couleur || ph.color;
        const paletteEntry = getPhaseColor(rawCouleur as string);
        const couleur = paletteEntry.key;
        const color = paletteEntry.hex;
        const debut =
          updates.debut !== undefined
            ? updates.debut
            : updates.calculatedStartDate !== undefined
            ? updates.calculatedStartDate
            : ph.debut || ph.calculatedStartDate;
        const fin =
          updates.fin !== undefined
            ? updates.fin
            : updates.calculatedEndDate !== undefined
            ? updates.calculatedEndDate
            : ph.fin || ph.calculatedEndDate;
        const rawObj =
          updates.objectif !== undefined
            ? updates.objectif
            : updates.objective !== undefined
            ? updates.objective
            : ph.objectif || ph.objective;
        const objectif = isExampleObjective(rawObj) ? '' : (rawObj || '').trim();
        const rawLiv =
          updates.livrableAttendu !== undefined
            ? updates.livrableAttendu
            : updates.deliverableSummary !== undefined
            ? updates.deliverableSummary
            : ph.livrableAttendu || ph.deliverableSummary;
        const livrableAttendu = isExampleDeliverable(rawLiv) ? '' : (rawLiv || '').trim();

        return {
          ...ph,
          ...updates,
          nom,
          name: nom,
          shortName: updates.shortName || nom,
          couleur,
          color,
          debut,
          fin,
          calculatedStartDate: debut,
          calculatedEndDate: fin,
          objectif,
          objective: objectif,
          livrableAttendu,
          deliverableSummary: livrableAttendu,
        };
      });

      return {
        ...prev,
        phases: updatedPhases,
      };
    });
  };

  const deletePhase = (phaseId: string): { success: boolean; reason?: string } => {
    const currentProj = projects.find((p) => p.id === activeProjectId);
    if (!currentProj) return { success: false, reason: 'Projet introuvable.' };

    if (currentProj.phases.length <= 1) {
      return { success: false, reason: 'Le projet doit comporter au moins une phase.' };
    }

    const hasTasks = currentProj.tasks.some((t) => t.phaseId === phaseId);
    const hasDeliverables = currentProj.deliverables.some((d) => d.phaseId === phaseId);

    if (hasTasks || hasDeliverables) {
      return {
        success: false,
        reason: 'Impossible de supprimer : cette phase contient des tâches ou des livrables.',
      };
    }

    mutateActiveProject((prev) => {
      const remaining = prev.phases
        .filter((ph) => ph.id !== phaseId)
        .map((ph, idx) => ({ ...ph, number: idx + 1 }));

      const recalculated = recalculatePhaseDates(
        remaining,
        prev.settings.startDate,
        prev.settings.deadlineDate
      );

      return {
        ...prev,
        phases: recalculated,
      };
    });

    logActivity('Phase supprimée', 'Suppression d’une phase', 'settings');
    return { success: true };
  };

  // 4. Milestones
  const addMilestone = (milestone: Omit<Milestone, 'id' | 'calculatedDate'>) => {
    const id = `m_${Date.now()}`;
    mutateActiveProject((prev) => {
      const raw = [...prev.milestones, { ...milestone, id, calculatedDate: '' }];
      return {
        ...prev,
        milestones: recalculateMilestones(raw, prev.settings.deadlineDate),
      };
    });
    logActivity('Nouvel objectif', `Objectif "${milestone.title}" ajouté`, 'milestone');
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    mutateActiveProject((prev) => {
      const updated = prev.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m));
      return {
        ...prev,
        milestones: recalculateMilestones(updated, prev.settings.deadlineDate),
      };
    });
  };

  const deleteMilestone = (id: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
  };

  // 5. Work Sessions
  const addSession = (session: Omit<WorkSession, 'id'>) => {
    const id = `s_${Date.now()}`;
    const newSession: WorkSession = { ...session, id };
    mutateActiveProject((prev) => ({
      ...prev,
      sessions: [...prev.sessions, newSession].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    logActivity('Nouvelle session', `Session planifiée le ${newSession.date}`, 'session');
  };

  const updateSession = (id: string, updates: Partial<WorkSession>) => {
    mutateActiveProject((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    logActivity('Session modifiée', `Mise à jour de la session`, 'session');
  };

  const deleteSession = (id: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  };

  // 6. Tasks & Dependencies
  const addTask = (task: Omit<Task, 'id'>) => {
    const count = activeProject.tasks.length + 1;
    const code = task.code || `T${count < 10 ? '0' + count : count}`;
    const id = `t_${Date.now()}`;
    const newTask: Task = { ...task, id, code, dependsOn: task.dependsOn || [] };

    mutateActiveProject((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
    logActivity('Tâche créée', `"${newTask.title}" assignée à ${newTask.assignee}`, 'task');
  };

  const updateTask = (id: string, updates: Partial<Task>, autoAdjustSuccessors: boolean = false) => {
    mutateActiveProject((prev) => {
      let updatedTasks = prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));

      // If auto-adjust successors was requested and deadline moved
      if (autoAdjustSuccessors && updates.deadline) {
        updatedTasks = autoAdjustSuccessorDates(updatedTasks, id);
      }

      return {
        ...prev,
        tasks: updatedTasks,
      };
    });

    if (updates.status) {
      logActivity('Statut de tâche modifié', `Statut mis à jour sur "${updates.status}"`, 'task');
    }
  };

  const deleteTask = (id: string) => {
    mutateActiveProject((prev) => {
      // Remove task and also remove it from any dependsOn lists
      const remainingTasks = prev.tasks
        .filter((t) => t.id !== id)
        .map((t) => ({
          ...t,
          dependsOn: (t.dependsOn || []).filter((predId) => predId !== id),
        }));
      return {
        ...prev,
        tasks: remainingTasks,
      };
    });
    logActivity('Tâche supprimée', `Suppression d'une tâche`, 'task');
  };

  const addDependency = (taskId: string, predecessorId: string): boolean => {
    if (taskId === predecessorId) return false;
    let success = true;
    mutateActiveProject((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task || task.dependsOn?.includes(predecessorId)) {
        success = false;
        return prev;
      }

      const updatedTasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, dependsOn: [...(t.dependsOn || []), predecessorId] } : t
      );
      return {
        ...prev,
        tasks: updatedTasks,
      };
    });
    logActivity('Dépendance ajoutée', `Lien de prédécesseur établi`, 'task');
    return success;
  };

  const removeDependency = (taskId: string, predecessorId: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, dependsOn: (t.dependsOn || []).filter((p) => p !== predecessorId) }
          : t
      ),
    }));
  };

  const autoFixSuccessorDeadlines = (taskId: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      tasks: autoAdjustSuccessorDates(prev.tasks, taskId),
    }));
    logActivity('Ajustement automatique', `Échéances décalées pour respecter les prérequis`, 'task');
  };

  // 7. Deliverables
  const resolveDeliverablePhase = (
    deadline: string | undefined,
    fallbackPhaseId: string | undefined,
    phases: Phase[],
    projectDeadline: string
  ): string => {
    if (!phases || phases.length === 0) return fallbackPhaseId || 'p1';
    const lastPhase = phases[phases.length - 1];
    const firstPhase = phases[0];
    if (!deadline) {
      return fallbackPhaseId && phases.some((p) => p.id === fallbackPhaseId)
        ? fallbackPhaseId
        : lastPhase.id;
    }
    if (projectDeadline && deadline >= projectDeadline) {
      return lastPhase.id;
    }
    const matched = phases.find((p) => {
      const s = p.debut || p.calculatedStartDate || '';
      const e = p.fin || p.calculatedEndDate || '';
      return s && e && deadline >= s && deadline <= e;
    });
    if (matched) return matched.id;
    const firstStart = firstPhase.debut || firstPhase.calculatedStartDate || '';
    if (firstStart && deadline < firstStart) return firstPhase.id;
    return lastPhase.id;
  };

  const addDeliverable = (deliverable: Omit<Deliverable, 'id'>) => {
    const id = `del_${Date.now()}`;
    mutateActiveProject((prev) => {
      const targetPhaseId = resolveDeliverablePhase(
        deliverable.deadline,
        deliverable.phaseId,
        prev.phases,
        prev.settings.deadlineDate
      );
      return {
        ...prev,
        deliverables: [...prev.deliverables, { ...deliverable, id, phaseId: targetPhaseId }],
      };
    });
    logActivity('Livrable ajouté', `"${deliverable.title}"`, 'deliverable');
  };

  const updateDeliverable = (id: string, updates: Partial<Deliverable>) => {
    mutateActiveProject((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => {
        if (d.id !== id) return d;
        const newDeadline = updates.deadline !== undefined ? updates.deadline : d.deadline;
        const targetPhaseId =
          updates.phaseId !== undefined
            ? updates.phaseId
            : updates.deadline !== undefined
            ? resolveDeliverablePhase(newDeadline, d.phaseId, prev.phases, prev.settings.deadlineDate)
            : d.phaseId;
        return { ...d, ...updates, phaseId: targetPhaseId };
      }),
    }));
  };

  const deleteDeliverable = (id: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((d) => d.id !== id),
    }));
  };

  const toggleDeliverableCriterion = (deliverableId: string, criterionId: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        const updatedCriteria = d.criteria.map((c) =>
          c.id === criterionId ? { ...c, verified: !c.verified } : c
        );
        // If all verified, we can offer to set status to 'valide'
        const allVerified = updatedCriteria.length > 0 && updatedCriteria.every((c) => c.verified);
        return {
          ...d,
          criteria: updatedCriteria,
          status: allVerified ? 'valide' : d.status === 'valide' ? 'en_redaction' : d.status,
        };
      }),
    }));
  };

  // 8. Logbook
  const addLogbookEntry = (entry: Omit<LogbookEntry, 'id'>) => {
    const id = `log_${Date.now()}`;
    const newEntry: LogbookEntry = normalizeTrace({ ...entry, ...withLegacyMirror(entry), id });
    mutateActiveProject((prev) => ({
      ...prev,
      logbook: [newEntry, ...prev.logbook],
    }));
    logActivity('Entrée journal', `Journal de bord complété`, 'logbook');
  };

  const updateLogbookEntry = (id: string, updates: Partial<LogbookEntry>) => {
    mutateActiveProject((prev) => ({
      ...prev,
      logbook: prev.logbook.map((l) => (l.id === id ? { ...l, ...withLegacyMirror(updates) } : l)),
    }));
  };

  const deleteLogbookEntry = (id: string) => {
    mutateActiveProject((prev) => ({
      ...prev,
      logbook: prev.logbook.filter((l) => l.id !== id),
    }));
  };

  // 9. Notifications & Rappels
  const markNotificationAsRead = (id: string) => {
    setDismissedReminderIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(STORAGE_DISMISSED_REMINDERS_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markAllNotificationsAsRead = () => {
    dismissAllReminders();
  };

  const updateNotificationPreferences = (prefs: Partial<NotificationPreferences>) => {
    setNotificationPreferences((prev) => ({ ...prev, ...prefs }));
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        activeTab,
        setActiveTab,
        setActiveProjectId,
        activeFocusTarget,
        openFocusMode,
        closeFocusMode,
        createProjectFromWizard,
        applyPlanDiffToActiveProject,
        createNewProject,
        cloneCurrentProject,
        deleteProject,
        exportProjectJSON,
        importProjectJSON,
        updateSettings,
        updatePhases,
        updatePhasePercentage,
        updatePhaseFixedEndDate,
        addPhase,
        updatePhase,
        deletePhase,
        tasksPhaseFilter,
        setTasksPhaseFilter,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        addSession,
        updateSession,
        deleteSession,
        addTask,
        updateTask,
        deleteTask,
        addDependency,
        removeDependency,
        autoFixSuccessorDeadlines,
        dependencyAlerts,
        addDeliverable,
        updateDeliverable,
        deleteDeliverable,
        toggleDeliverableCriterion,
        addLogbookEntry,
        updateLogbookEntry,
        deleteLogbookEntry,
        journalDraft,
        openJournalWithDraft,
        clearJournalDraft,
        reminders,
        reminderCount,
        dismissAllReminders,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        notificationPreferences,
        updateNotificationPreferences,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
