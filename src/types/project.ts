export type ProjectMode = 'individuel' | 'groupe';

export const DEFAULT_OPERATION_TAGS = [
  'ralentir',
  'faire dérailler',
  'démonter',
  'réparer',
  'détourner',
  'répéter',
  'priver',
];

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  email?: string;
  color?: string;
}

export type PlanningSource = 'auto' | 'manual' | 'ia';

export type ProjectTemplateId =
  | 'semestre'
  | 'workshop'
  | 'memoire'
  | 'concours'
  | 'vierge';

export interface IntermediateDeadline {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  phaseId?: string;
  deliverableRef?: string;
  source?: PlanningSource;
}

export interface SupervisedSchedule {
  mode: 'recurrent' | 'dates_libres';
  dayOfWeek?: number; // 1 = Lundi, 2 = Mardi ... 7 = Dimanche
  timeSlot?: string; // ex: "09:00 - 12:00" ou "14:00"
  durationHours?: number; // ex: 2 ou 3h
  exceptions: string[]; // dates YYYY-MM-DD exclues (vacances, jours fériés)
  specificDates: string[]; // dates YYYY-MM-DD pour le mode libre ou ajouts
}

export interface ProjectAvailability {
  hoursPerWeek: number; // ex: 8, 12, 20
  preferredDays: number[]; // 1=Lundi..7=Dimanche
}

export interface ProjectSettings {
  name: string;
  description: string;
  brief?: string; // Brief synthétique du projet (2 lignes)
  templateId?: ProjectTemplateId;
  startDate: string; // format YYYY-MM-DD
  deadlineDate: string; // format YYYY-MM-DD
  mode: ProjectMode;
  team: TeamMember[];
  targetSessionsCount: number;
  customTags?: string[]; // étiquettes d'opérations (ex: ralentir, faire dérailler, etc.)
  intermediateDeadlines?: IntermediateDeadline[];
  supervisedSchedule?: SupervisedSchedule;
  availability?: ProjectAvailability;
  defaultDurations: {
    individuelle: number; // in hours, e.g. 2
    groupe: number; // in hours, e.g. 3
    encadree: number; // in hours, e.g. 1
  };
}

export type PhaseColorKey =
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'green'
  | 'pink'
  | 'orange';

export interface Phase {
  id: string;
  nom?: string;
  couleur?: PhaseColorKey | string;
  debut?: string; // YYYY-MM-DD
  fin?: string; // YYYY-MM-DD
  objectif?: string;
  livrableAttendu?: string;
  number: number;
  name: string;
  shortName: string;
  color?: string;
  objective: string;
  keyQuestions: string[];
  methods: string[];
  deliverableSummary: string;
  timePercentage: number; // 0 to 100, sum = 100%
  fixedEndDate?: string; // If imposed by school or client
  source?: PlanningSource; // 'auto' | 'manual'
  // Calculated fields:
  calculatedStartDate?: string;
  calculatedEndDate?: string;
  durationDays?: number;
}

export interface Milestone {
  id: string;
  title: string;
  phaseId: string;
  daysBeforeDeadline: number; // e.g. 30 means J-30
  useFixedDate: boolean;
  fixedDate?: string;
  source?: PlanningSource;
  // Calculated:
  calculatedDate: string;
  deliverableRef?: string;
  completed: boolean;
  notes?: string;
}

export type SessionType = 'individuelle' | 'groupe' | 'encadree';
export type SessionStatus = 'planifiee' | 'realisee' | 'annulee';

export interface WorkSession {
  id: string;
  date: string; // YYYY-MM-DD
  type: SessionType;
  phaseId: string;
  objective: string;
  plannedDurationHours: number;
  actualDurationHours?: number;
  attendees: string[]; // Member names or IDs
  status: SessionStatus;
  notes?: string;
  linkedLogbookId?: string;
  source?: PlanningSource;
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'bloque' | 'fait';

export interface Task {
  id: string;
  code?: string; // e.g. T01, T02 for easy reference
  title: string;
  phaseId: string;
  assignee: string; // Member name, or "Tous"
  deadline: string; // YYYY-MM-DD
  durationMinutes: number; // Max 240 mins (4 hours)
  status: TaskStatus;
  notes?: string;
  source?: PlanningSource;
  // Dependency management:
  dependsOn: string[]; // IDs of predecessor tasks (must be completed before this task)
}

export interface PlanDiffPhaseChange {
  id: string;
  name: string;
  oldStartDate: string;
  newStartDate: string;
  oldEndDate: string;
  newEndDate: string;
  oldPercentage: number;
  newPercentage: number;
}

export interface PlanDiffItemMove {
  id: string;
  title: string;
  type: 'session' | 'milestone' | 'task';
  oldDate: string;
  newDate: string;
}

export interface PlanDiffPreserved {
  id: string;
  title: string;
  type: 'session' | 'milestone' | 'task' | 'phase';
  date: string;
  reason: 'manual' | 'past_or_done';
}

export interface PlanDiff {
  phasesChanged: PlanDiffPhaseChange[];
  itemsMoved: PlanDiffItemMove[];
  sessionsAdded: Omit<WorkSession, 'id'>[];
  sessionsRemoved: WorkSession[];
  milestonesAdded: Omit<Milestone, 'id' | 'calculatedDate'>[];
  milestonesRemoved: Milestone[];
  preservedCount: number;
  preservedItems: PlanDiffPreserved[];
}

export interface DeliverableCriterion {
  id: string;
  title: string;
  verified: boolean;
}

export interface Deliverable {
  id: string;
  title: string;
  phaseId?: string;
  format: string; // e.g. "PDF A4", "Lien Figma interactif", "Dossier de recherche relié"
  deadline: string;
  criteria: DeliverableCriterion[];
  evaluationRubric: string; // e.g. "Cohérence du benchmark / 5, Clarté des insights / 5"
  status: 'non_commence' | 'en_redaction' | 'a_revoir' | 'valide';
  downloadUrlOrLink?: string;
}

export type TraceDocKind = 'link' | 'file';

export type TraceDocType =
  | 'drive-folder'
  | 'drive-file'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'figma'
  | 'miro'
  | 'pdf'
  | 'image'
  | 'other';

/** Document rattaché à une trace : lien externe ou fichier stocké dans IndexedDB. */
export interface TraceDoc {
  id: string;
  kind: TraceDocKind;
  url?: string; // kind === 'link'
  fileRef?: string; // kind === 'file' : clé IndexedDB
  name: string;
  docType: TraceDocType;
  addedAt: string; // ISO
}

/** Couverture : image stockée en IndexedDB + recadrage (point focal x/y en %, zoom ≥ 1). */
export interface TraceCover {
  imageRef: string; // clé IndexedDB ('' = utiliser l'ancienne photoUrl)
  crop: { x: number; y: number; zoom: number };
}

export interface LogbookEntry {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  time?: string; // HH:MM
  title?: string; // Titre de la trace (ex: Variation 3 : copier sans original)
  sessionId?: string; // Session liée
  taskId?: string; // Tâche liée
  author: string;
  phaseId: string;
  // Model required 3-step reflection (champs historiques, conservés et synchronisés avec done/observed/decided):
  whatWeDid: string; // "Ce que tu as fait"
  whatWeNoticed: string; // "Ce que tu constates" (observations, blocages, retours)
  whatWeDecided?: string; // "Ce que tu décides" (facultatif)
  photoUrl?: string; // Ancienne photo de la trace (base64 compressée ou URL) — jamais supprimée par la migration
  tags?: string[]; // Étiquettes optionnelles
  // --- Refonte des traces d'atelier (migration douce : tous facultatifs) ---
  cover?: TraceCover;
  done?: string; // Ce que j'ai fait
  observed?: string; // Ce que je constate
  decided?: string; // Ce que je décide
  workDocs?: TraceDoc[]; // Documents de travail
  results?: { text: string; docs: TraceDoc[] }; // Ce que j'ai produit
}

export interface DependencyAlert {
  taskId: string;
  taskTitle: string;
  predecessorId: string;
  predecessorTitle: string;
  type: 'date_conflict' | 'incomplete_prerequisite' | 'circular';
  message: string;
  severity: 'error' | 'warning';
}

export type ReminderType = 'task_overdue' | 'deadline_48h' | 'rendu_7d';

export interface ProjectReminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  targetTab: 'checklist' | 'livrables';
  targetItemId?: string;
  linkText: string;
  urgency: number;
  badgeLabel: string;
  badgeStyle: 'error' | 'warning' | 'info';
}

export type NotificationType =
  | 'task_upcoming'
  | 'task_overdue'
  | 'dependency_conflict'
  | 'project_change'
  | 'milestone_alert';

export interface AppNotification {
  id: string;
  projectId: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  targetTab?: string;
  targetItemId?: string;
  isRead: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface NotificationPreferences {
  notifyUpcomingTasks: boolean;
  upcomingDaysThreshold: number; // e.g. 7 days
  notifyOverdueTasks: boolean;
  notifyDependencyConflicts: boolean;
  notifyProjectChanges: boolean;
  notifyMilestones: boolean;
  soundEnabled: boolean;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  details: string;
  targetType: 'task' | 'session' | 'milestone' | 'settings' | 'deliverable' | 'logbook';
}

export interface ProjectData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  phases: Phase[];
  milestones: Milestone[];
  sessions: WorkSession[];
  tasks: Task[];
  deliverables: Deliverable[];
  logbook: LogbookEntry[];
  activityLogs?: ActivityLogItem[];
}

