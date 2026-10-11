import {
  ProjectData,
  ProjectTemplateId,
  Milestone,
  Task,
  TaskStatus,
  DEFAULT_OPERATION_TAGS,
} from '../types/project';
import {
  toLocalDateStr,
  getTodayLocalDateStr,
  addDays,
  parseLocalDate,
} from './localDate';
import { recalculatePhaseDates } from './dateCalculations';
import { PROJECT_TEMPLATES } from './initialTemplates';

export interface RawMilestoneInput {
  id?: string;
  titre?: string;
  title?: string;
  nom?: string;
  name?: string;
  date?: string;
  datePrevue?: string;
  calculatedDate?: string;
  fixedDate?: string;
  phaseId?: string;
  phase?: string | number;
  completed?: boolean;
  terminee?: boolean;
  notes?: string;
}

export interface RawTaskInput {
  id?: string;
  code?: string;
  titre?: string;
  title?: string;
  nom?: string;
  name?: string;
  phaseId?: string;
  phase?: string | number;
  deadline?: string;
  echeance?: string;
  date?: string;
  durationMinutes?: number;
  dureeMinutes?: number;
  duree?: number;
  status?: string;
  statut?: string;
  assignee?: string;
  responsable?: string;
  notes?: string;
  dependsOn?: string[];
}

export interface RawProjectInput {
  nom?: string;
  name?: string;
  brief?: string;
  description?: string;
  modele?: string;
  modèle?: string;
  template?: string;
  templateId?: string;
  mode?: 'individuel' | 'groupe' | string;
  dateDebut?: string;
  startDate?: string;
  debut?: string;
  dateRendu?: string;
  deadlineDate?: string;
  fin?: string;
  rendu?: string;
  heuresParSemaine?: number;
  hoursPerWeek?: number;
  tags?: string[];
  customTags?: string[];
  jalons?: Array<string | RawMilestoneInput>;
  milestones?: Array<string | RawMilestoneInput>;
  taches?: Array<string | RawTaskInput>;
  tasks?: Array<string | RawTaskInput>;
}

/**
 * Normalise l'identifiant du modèle de projet (vierge par défaut).
 */
export function normalizeTemplateId(modele?: string): ProjectTemplateId {
  if (!modele) return 'vierge';
  const clean = modele
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (clean.includes('semestre')) return 'semestre';
  if (clean.includes('workshop') || clean.includes('atelier')) return 'workshop';
  if (clean.includes('memoire')) return 'memoire';
  if (clean.includes('concours')) return 'concours';
  if (clean.includes('vierge')) return 'vierge';
  return 'vierge'; // « vierge » par défaut
}

/**
 * Crée un nouveau projet basé sur un gabarit (identique au bouton « + Nouveau projet »).
 */
export function createProjectFromTemplate(
  templateId: ProjectTemplateId = 'vierge',
  name: string = 'Nouveau projet',
  mode: 'individuel' | 'groupe' = 'individuel',
  startDate?: string,
  deadlineDate?: string,
  options?: {
    brief?: string;
    heuresParSemaine?: number;
    tags?: string[];
  }
): ProjectData {
  const template = PROJECT_TEMPLATES[templateId] || PROJECT_TEMPLATES.vierge;
  const start = startDate || getTodayLocalDateStr();
  const defaultWeeks = template.durationWeeksSuggested || 8;
  const end = deadlineDate || addDays(start, defaultWeeks * 7);

  const phases = recalculatePhaseDates(
    template.phases.map((p) => ({ ...p, source: 'auto' })),
    start,
    end
  );

  const startMs = parseLocalDate(start).getTime();
  const endMs = parseLocalDate(end).getTime();

  const initialMilestones: Milestone[] = template.defaultMilestones.map((m, idx) => {
    const pct = m.percentagePoint || 100;
    const dateMs = startMs + ((endMs - startMs) * pct) / 100;
    const calcDate = toLocalDateStr(new Date(dateMs));
    return {
      id: `m_${Date.now()}_${idx}`,
      title: m.title,
      phaseId: m.phaseId || 'p3',
      daysBeforeDeadline: 0,
      useFixedDate: true,
      fixedDate: calcDate,
      calculatedDate: calcDate,
      completed: false,
      source: 'auto',
    };
  });

  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      name,
      description: options?.brief || template.description || 'Démarche de projet en design.',
      color: '#2F6DBB',
      templateId,
      startDate: start,
      deadlineDate: end,
      mode,
      team:
        mode === 'individuel'
          ? [{ id: 'mem_1', name: 'Moi-même (Designer)', role: 'Designer', color: '#2F6DBB' }]
          : [
              { id: 'mem_1', name: 'Membre 1', role: 'Designer', color: '#2F6DBB' },
              { id: 'mem_2', name: 'Membre 2', role: 'Designer', color: '#2E8B4A' },
            ],
      targetSessionsCount: 12,
      customTags: options?.tags && options.tags.length > 0 ? options.tags : [...DEFAULT_OPERATION_TAGS],
      intermediateDeadlines: [],
      supervisedSchedule: {
        mode: 'dates_libres',
        exceptions: [],
        specificDates: [],
      },
      availability: {
        hoursPerWeek: options?.heuresParSemaine || template.recommendedHoursPerWeek || 8,
        preferredDays: [2, 4],
      },
      defaultDurations: {
        individuelle: 2,
        groupe: 3,
        encadree: 2,
      },
    },
    phases,
    milestones: initialMilestones,
    sessions: [
      {
        id: `sess_${Date.now()}`,
        date: start,
        type: mode === 'individuel' ? 'individuelle' : 'groupe',
        phaseId: phases[0]?.id || 'p1',
        objective: 'Lancement du projet : clarification du sujet et planning',
        plannedDurationHours: 2,
        attendees: mode === 'individuel' ? ['Moi-même (Designer)'] : ['Membre 1', 'Membre 2'],
        status: 'planifiee',
        source: 'auto',
      },
    ],
    tasks: [],
    deliverables: template.defaultDeliverables.map((d) => ({
      ...d,
      phaseId: d.phaseId || 'p3',
      deadline: end,
    })),
    logbook: [],
    activityLogs: [],
  };
}

/**
 * Construit un objet ProjectData à partir d'une définition brute de projet
 * (nom, brief, modele, mode, dateDebut, dateRendu, heuresParSemaine, tags, jalons, taches).
 */
export function buildProjectFromRawInput(raw: RawProjectInput): ProjectData {
  const nom = (raw.nom || raw.name || 'Nouveau projet').trim();
  const brief = (raw.brief || raw.description || '').trim();
  const modele = normalizeTemplateId(raw.modele || raw.modèle || raw.template || raw.templateId);
  const rawMode = (raw.mode || 'individuel').toLowerCase().trim();
  const mode: 'individuel' | 'groupe' = rawMode === 'groupe' ? 'groupe' : 'individuel';
  const dateDebut = raw.dateDebut || raw.startDate || raw.debut || getTodayLocalDateStr();
  const dateRendu = raw.dateRendu || raw.deadlineDate || raw.fin || raw.rendu;
  const heuresParSemaine = raw.heuresParSemaine || raw.hoursPerWeek;
  const tags = raw.tags || raw.customTags;

  const project = createProjectFromTemplate(modele, nom, mode, dateDebut, dateRendu, {
    brief,
    heuresParSemaine,
    tags,
  });

  const phases = project.phases;
  const deadline = project.settings.deadlineDate;

  // Résolution robuste de phaseId à partir d'un identifiant, d'un numéro ou d'un nom de phase
  const resolvePhaseId = (phaseRef?: string | number): string => {
    if (!phaseRef) return phases[0]?.id || 'p1';
    const str = String(phaseRef).toLowerCase().trim();
    const found = phases.find(
      (p) =>
        p.id.toLowerCase() === str ||
        String(p.number) === str ||
        p.nom?.toLowerCase() === str ||
        p.name?.toLowerCase() === str ||
        p.shortName?.toLowerCase() === str
    );
    return found ? found.id : phases[0]?.id || 'p1';
  };

  // Ajout des jalons fournis
  const rawJalons = raw.jalons || raw.milestones;
  if (Array.isArray(rawJalons) && rawJalons.length > 0) {
    const additionalMilestones: Milestone[] = rawJalons.map((j, idx) => {
      if (typeof j === 'string') {
        const targetPhase = phases[Math.min(idx, phases.length - 1)] || phases[0];
        return {
          id: `m_imp_${Date.now()}_${idx}`,
          title: j.trim(),
          phaseId: targetPhase?.id || 'p1',
          daysBeforeDeadline: 0,
          useFixedDate: true,
          fixedDate: targetPhase?.calculatedEndDate || deadline,
          calculatedDate: targetPhase?.calculatedEndDate || deadline,
          completed: false,
          source: 'manual',
        };
      }
      const title = (j.titre || j.title || j.nom || j.name || `Jalon ${idx + 1}`).trim();
      const phaseId = resolvePhaseId(j.phaseId || j.phase);
      const phaseObj = phases.find((p) => p.id === phaseId);
      const date =
        j.date || j.datePrevue || j.fixedDate || j.calculatedDate || phaseObj?.calculatedEndDate || deadline;
      const completed = Boolean(j.completed || j.terminee);
      return {
        id: `m_imp_${Date.now()}_${idx}`,
        title,
        phaseId,
        daysBeforeDeadline: 0,
        useFixedDate: true,
        fixedDate: date,
        calculatedDate: date,
        completed,
        notes: j.notes || '',
        source: 'manual',
      };
    });

    project.milestones = [...project.milestones, ...additionalMilestones];
  }

  // Ajout des tâches fournies
  const rawTaches = raw.taches || raw.tasks;
  if (Array.isArray(rawTaches) && rawTaches.length > 0) {
    const newTasks: Task[] = rawTaches.map((t, idx) => {
      if (typeof t === 'string') {
        return {
          id: `t_imp_${Date.now()}_${idx}`,
          code: `T${String(idx + 1).padStart(2, '0')}`,
          title: t.trim(),
          phaseId: phases[0]?.id || 'p1',
          assignee: mode === 'individuel' ? 'Moi-même (Designer)' : 'Tous',
          deadline,
          durationMinutes: 45,
          status: 'a_faire',
          dependsOn: [],
          source: 'manual',
        };
      }

      const title = (t.titre || t.title || t.nom || t.name || `Tâche ${idx + 1}`).trim();
      const phaseId = resolvePhaseId(t.phaseId || t.phase);
      const code = t.code || `T${String(idx + 1).padStart(2, '0')}`;
      const taskDeadline = t.deadline || t.echeance || t.date || deadline;

      let dur = 45;
      if (typeof t.durationMinutes === 'number') dur = t.durationMinutes;
      else if (typeof t.dureeMinutes === 'number') dur = t.dureeMinutes;
      else if (typeof t.duree === 'number') dur = t.duree > 8 ? t.duree : t.duree * 60;

      const rawStatus = (t.statut || t.status || 'a_faire').toLowerCase().trim();
      let status: TaskStatus = 'a_faire';
      if (rawStatus === 'fait' || rawStatus === 'done' || rawStatus === 'termine') status = 'fait';
      else if (rawStatus === 'en_cours' || rawStatus === 'in_progress') status = 'en_cours';
      else if (rawStatus === 'bloque' || rawStatus === 'blocked') status = 'bloque';

      const assignee =
        t.assignee || t.responsable || (mode === 'individuel' ? 'Moi-même (Designer)' : 'Tous');

      return {
        id: `t_imp_${Date.now()}_${idx}`,
        code,
        title,
        phaseId,
        assignee,
        deadline: taskDeadline,
        durationMinutes: dur,
        status,
        notes: t.notes || '',
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [],
        source: 'manual',
      };
    });

    project.tasks = newTasks;
  }

  return project;
}

/**
 * Détecte si un contenu JSON parsé représente une liste de "projets".
 */
export function extractProjectsListFromJSON(parsed: any): RawProjectInput[] | null {
  if (!parsed) return null;

  if (Array.isArray(parsed.projets) && parsed.projets.length > 0) {
    return parsed.projets;
  }

  if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
    return parsed.projects;
  }

  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (
      first &&
      typeof first === 'object' &&
      (first.nom || first.name || first.modele || first.taches || first.jalons || first.brief || first.dateDebut)
    ) {
      return parsed;
    }
  }

  return null;
}
