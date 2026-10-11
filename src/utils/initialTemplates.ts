import {
  ProjectData,
  Phase,
  Milestone,
  Deliverable,
  ProjectTemplateId,
  DEFAULT_OPERATION_TAGS,
} from '../types/project';
import {
  toLocalDateStr,
  getTodayLocalDateStr,
  addDays,
  parseLocalDate,
} from './localDate';
import { recalculatePhaseDates } from './dateCalculations';

export interface ProjectTemplateConfig {
  id: ProjectTemplateId;
  name: string;
  badge: string;
  description: string;
  durationWeeksSuggested: number;
  recommendedHoursPerWeek: number;
  phases: Phase[];
  defaultMilestones: { title: string; phaseId: string; percentagePoint: number }[];
  defaultDeliverables: Deliverable[];
}

export const DEFAULT_3_PHASES: Phase[] = [
  {
    id: 'p1',
    number: 1,
    name: 'Exploration',
    nom: 'Exploration',
    shortName: 'Exploration',
    couleur: 'blue',
    color: '#2F6DBB',
    objective: '',
    keyQuestions: [
      'Quels sont les besoins réels et non formulés des usagers ?',
      'Quel est l\'état de l\'art et les solutions concurrentes (benchmark) ?',
      'Quelles sont les contraintes techniques, éthiques et environnementales ?',
    ],
    methods: [
      'Entretiens semi-directifs et observations in situ',
      'Benchmark concurrentiel et veille prospective',
      'Cartographie d\'acteurs et carte d\'empathie',
    ],
    deliverableSummary: '',
    objectif: '',
    livrableAttendu: '',
    timePercentage: 30,
    source: 'auto',
  },
  {
    id: 'p2',
    number: 2,
    name: 'Idéation',
    nom: 'Idéation',
    shortName: 'Idéation',
    couleur: 'yellow',
    color: '#F2D21B',
    objective: '',
    keyQuestions: [
      'Quelles sont les différentes voies de solution envisageables ?',
      'Quels scénarios d\'usage génèrent le plus de valeur ?',
      'Quels retours usagers guident les itérations ?',
    ],
    methods: [
      'Atelier de créativité et planches de variations',
      'Prototypage rapide (papier, interactif, volume)',
      'Tests usagers et analyse des retours',
    ],
    deliverableSummary: '',
    objectif: '',
    livrableAttendu: '',
    timePercentage: 35,
    source: 'auto',
  },
  {
    id: 'p3',
    number: 3,
    name: 'Finalisation',
    nom: 'Finalisation',
    shortName: 'Finalisation',
    couleur: 'purple',
    color: '#7A4A9E',
    objective: '',
    keyQuestions: [
      'Tous les attendus du projet sont-ils complétés avec rigueur ?',
      'Comment scénariser la restitution pour valoriser la démarche ?',
    ],
    methods: [
      'Exécution graphique et mise en page soignée',
      'Consolidation de la documentation et du carnet de bord',
      'Préparation de la soutenance et pitch',
    ],
    deliverableSummary: '',
    objectif: '',
    livrableAttendu: '',
    timePercentage: 35,
    source: 'auto',
  },
];

export const DEFAULT_6_PHASES: Phase[] = [
  {
    id: 'p1',
    number: 1,
    name: 'Immersion & Exploration',
    shortName: 'Exploration',
    objective: 'Comprendre en profondeur le contexte, les usagers et l\'écosystème.',
    keyQuestions: [
      'Quels sont les besoins réels et non formulés des usagers ?',
      'Quel est l\'état de l\'art et les solutions concurrentes (benchmark) ?',
      'Quelles sont les contraintes techniques, éthiques et environnementales ?',
    ],
    methods: [
      'Entretiens semi-directifs et observations in situ',
      'Benchmark concurrentiel et veille prospective',
      'Cartographie d\'acteurs et carte d\'empathie',
    ],
    deliverableSummary: 'Dossier de recherche terrain & benchmark synthétique',
    timePercentage: 20,
    source: 'auto',
  },
  {
    id: 'p2',
    number: 2,
    name: 'Cadrage & Problématique',
    shortName: 'Cadrage',
    objective: 'Formuler l\'angle d\'attaque, synthétiser les insights et définir les personas.',
    keyQuestions: [
      'Quelle tension ou opportunité clé avons-nous identifiée ?',
      'Pour qui conçoit-on en priorité (persona clé et parcours actuel) ?',
      'Comment formuler la question directrice (« Comment pourrions-nous... ») ?',
    ],
    methods: [
      'Matrice des insights et regroupement par affinités',
      'Fiches personas et User Journey Map (parcours usager)',
      'Formulation HMW (How Might We) et critères de succès',
    ],
    deliverableSummary: 'Note de cadrage, persona validé & question de recherche',
    timePercentage: 15,
    source: 'auto',
  },
  {
    id: 'p3',
    number: 3,
    name: 'Idéation & Variations',
    shortName: 'Idéation',
    objective: 'Générer un large éventail de pistes créatives et explorer différentes voies de réponse.',
    keyQuestions: [
      'Quelles sont les différentes typologies de réponse envisageables ?',
      'Comment combiner des approches divergentes sans s\'autocensurer ?',
      'Quels scénarios d\'usage génèrent le plus de valeur perçue ?',
    ],
    methods: [
      'Atelier de créativité (croquis rapides en 8 variations, analogie forcée, SCAMPER)',
      'Moodboards thématiques et planches de variations',
      'Scénarios d\'usage sous forme de storyboards rapides',
    ],
    deliverableSummary: 'Planches de variations créatives & sélection de 2-3 concepts',
    timePercentage: 20,
    source: 'auto',
  },
  {
    id: 'p4',
    number: 4,
    name: 'Prototypage & Expérimentation',
    shortName: 'Prototypage',
    objective: 'Donner corps aux concepts, tester rapidement et itérer avec les utilisateurs.',
    keyQuestions: [
      'Quel niveau de fidélité est requis pour tester l\'hypothèse clé ?',
      'Quelles sont les incompréhensions ou frictions observées en test ?',
      'Comment itérer sans repartir de zéro ?',
    ],
    methods: [
      'Prototypage basse à moyenne fidélité (papier, carton, wireframes)',
      'Protocole de test usager (tâches guidées, pensée à voix haute)',
      'Grille d\'analyse des retours et matrice d\'itérations',
    ],
    deliverableSummary: 'Prototype interactif ou physique & synthèse des tests usagers',
    timePercentage: 20,
    source: 'auto',
  },
  {
    id: 'p5',
    number: 5,
    name: 'Prise de recul & Positionnement',
    shortName: 'Prise de recul',
    objective: 'Évaluer la viabilité globale, assumer un parti-pris singulier et affiner les choix.',
    keyQuestions: [
      'En quoi la proposition se distingue-t-elle singulièrement ?',
      'Quels arbitrages éco-responsables et économiques intégrer ?',
      'Quelle posture de designer défendons-nous dans ce projet ?',
    ],
    methods: [
      'Analyse critique en regard de la problématique initiale',
      'Matrice faisabilité / désirabilité / viabilité / éco-conception',
      'Manifeste ou note d\'intention de design',
    ],
    deliverableSummary: 'Note de positionnement critique & arbitrages finaux',
    timePercentage: 10,
    source: 'auto',
  },
  {
    id: 'p6',
    number: 6,
    name: 'Finalisation & Rendu',
    shortName: 'Rendu',
    objective: 'Produire les livrables finaux irréprochables et préparer la soutenance orale.',
    keyQuestions: [
      'Tous les attendus académiques ou professionnels sont-ils complétés ?',
      'La narration (storytelling) du carnet de bord est-elle captivante ?',
      'Comment scénariser l\'oral pour convaincre le jury ?',
    ],
    methods: [
      'Exécution graphique et mise en page soignée du livrable',
      'Consolidation du carnet de démarche et des annexes',
      'Répétition chronométrée du pitch et diaporama épuré',
    ],
    deliverableSummary: 'Dossier final, prototype fonctionnel, carnet & diaporama d\'oral',
    timePercentage: 15,
    source: 'auto',
  },
];

export const PROJECT_TEMPLATES: Record<ProjectTemplateId, ProjectTemplateConfig> = {
  semestre: {
    id: 'semestre',
    name: 'Projet de cours semestriel',
    badge: '14 à 16 semaines',
    description: 'Format académique classique avec suivi régulier, rendu intermédiaire et jury final.',
    durationWeeksSuggested: 14,
    recommendedHoursPerWeek: 8,
    phases: DEFAULT_3_PHASES.map((p) => ({ ...p })),
    defaultMilestones: [
      { title: 'Synthèse du benchmark & personas', phaseId: 'p1', percentagePoint: 30 },
      { title: 'Revue intermédiaire des concepts', phaseId: 'p2', percentagePoint: 65 },
      { title: 'Rendu final & soutenance', phaseId: 'p3', percentagePoint: 100 },
    ],
    defaultDeliverables: [
      {
        id: 'del_1',
        title: 'Dossier de recherche & Cadrage exploratoire',
        phaseId: 'p1',
        format: 'PDF A4 paysage interactif',
        deadline: '',
        criteria: [
          { id: 'c1', title: 'Benchmark exhaustif et personas validés', verified: false },
          { id: 'c2', title: 'Question directrice HMW claire', verified: false },
        ],
        evaluationRubric: 'Rigueur méthodologique / 10, Clarté des insights / 10',
        status: 'non_commence',
      },
      {
        id: 'del_2',
        title: 'Prototype testé & Scénario d’usage',
        phaseId: 'p2',
        format: 'Lien Figma cliquable & synthèse de tests',
        deadline: '',
        criteria: [
          { id: 'c3', title: 'Flux interactif complet sans rupture', verified: false },
          { id: 'c4', title: 'Retours de 3 testeurs intégrés', verified: false },
        ],
        evaluationRubric: 'Ergonomie / 10, Créativité de la solution / 10',
        status: 'non_commence',
      },
      {
        id: 'del_3',
        title: 'Dossier final, Carnet de bord & Soutenance',
        phaseId: 'p3',
        format: 'Dossier relié + diaporama de pitch',
        deadline: '',
        criteria: [
          { id: 'c5', title: 'Carnet de démarche exhaustif', verified: false },
          { id: 'c6', title: 'Soutenance fluide et soignée', verified: false },
        ],
        evaluationRubric: 'Qualité globale du livrable / 20',
        status: 'non_commence',
      },
    ],
  },

  workshop: {
    id: 'workshop',
    name: 'Workshop 1 à 2 semaines',
    badge: '1 à 2 semaines intensives',
    description: 'Sprint court et intense centré sur l’idéation rapide, la fabrication et le pitch.',
    durationWeeksSuggested: 2,
    recommendedHoursPerWeek: 25,
    phases: DEFAULT_3_PHASES.map((p) => ({ ...p })),
    defaultMilestones: [
      { title: 'Angle d’attaque & persona express', phaseId: 'p1', percentagePoint: 25 },
      { title: 'Crash-test du premier prototype', phaseId: 'p2', percentagePoint: 65 },
      { title: 'Pitch final & démonstration', phaseId: 'p3', percentagePoint: 100 },
    ],
    defaultDeliverables: [
      {
        id: 'del_w1',
        title: 'Prototype démonstrateur & vidéo 1 min',
        phaseId: 'p2',
        format: 'Vidéo de démonstration ou maquette interactive',
        deadline: '',
        criteria: [
          { id: 'c_w1', title: 'Proposition de valeur compréhensible en 30s', verified: false },
        ],
        evaluationRubric: 'Impact / 10, Faisabilité / 10',
        status: 'non_commence',
      },
      {
        id: 'del_w2',
        title: 'Pitch deck de présentation (5 min)',
        phaseId: 'p3',
        format: 'Diaporama 10 slides',
        deadline: '',
        criteria: [
          { id: 'c_w2', title: 'Storytelling percutant et démonstration en direct', verified: false },
        ],
        evaluationRubric: 'Présentation orale / 10, Démarche / 10',
        status: 'non_commence',
      },
    ],
  },

  memoire: {
    id: 'memoire',
    name: 'Mémoire / recherche',
    badge: '16 à 24 semaines',
    description: 'Projet d’investigation théorique et pratique avec temps long de terrain et rédaction.',
    durationWeeksSuggested: 20,
    recommendedHoursPerWeek: 12,
    phases: DEFAULT_3_PHASES.map((p) => ({ ...p })),
    defaultMilestones: [
      { title: 'État de l’art & revue de littérature', phaseId: 'p1', percentagePoint: 30 },
      { title: 'Problématique finale & protocole d’expérimentation', phaseId: 'p2', percentagePoint: 65 },
      { title: 'Dépôt du mémoire & soutenance de recherche', phaseId: 'p3', percentagePoint: 100 },
    ],
    defaultDeliverables: [
      {
        id: 'del_m1',
        title: 'Note d’intention & revue bibliographique',
        phaseId: 'p1',
        format: 'Document rédigé (15 pages)',
        deadline: '',
        criteria: [
          { id: 'c_m1', title: 'Sources académiques et contextualisation rigoureuse', verified: false },
        ],
        evaluationRubric: 'Rigueur théorique / 20',
        status: 'non_commence',
      },
      {
        id: 'del_m2',
        title: 'Mémoire relié & production plastique / design',
        phaseId: 'p3',
        format: 'Ouvrage relié (60-80 pages) + artefact',
        deadline: '',
        criteria: [
          { id: 'c_m2', title: 'Cohérence entre hypothèse, terrain et conclusion', verified: false },
        ],
        evaluationRubric: 'Portée de la contribution / 20',
        status: 'non_commence',
      },
    ],
  },

  concours: {
    id: 'concours',
    name: 'Concours',
    badge: '4 à 8 semaines',
    description: 'Objectif fort, format imposé, date butoir stricte et rendu ultra-visuel.',
    durationWeeksSuggested: 6,
    recommendedHoursPerWeek: 15,
    phases: DEFAULT_3_PHASES.map((p) => ({ ...p })),
    defaultMilestones: [
      { title: 'Sélection de l’axe différenciant', phaseId: 'p1', percentagePoint: 30 },
      { title: 'Validation des planches visuelles clés', phaseId: 'p2', percentagePoint: 65 },
      { title: 'Dépôt officiel du dossier de candidature', phaseId: 'p3', percentagePoint: 100 },
    ],
    defaultDeliverables: [
      {
        id: 'del_c1',
        title: 'Planches concours A1/A2 & Note de synthèse',
        phaseId: 'p3',
        format: 'Planches haute définition selon règlement',
        deadline: '',
        criteria: [
          { id: 'c_c1', title: 'Conformité stricte au règlement du concours', verified: false },
          { id: 'c_c2', title: 'Impact visuel fort et singularité du concept', verified: false },
        ],
        evaluationRubric: 'Originalité / 10, Réalisation / 10',
        status: 'non_commence',
      },
    ],
  },

  vierge: {
    id: 'vierge',
    name: 'Vierge',
    badge: 'Libre',
    description: 'Structure simple en 3 phases, prête à être configurée à la main.',
    durationWeeksSuggested: 8,
    recommendedHoursPerWeek: 6,
    phases: DEFAULT_3_PHASES.map((p) => ({ ...p })),
    defaultMilestones: [
      { title: 'Point d’étape intermédiaire', phaseId: 'p2', percentagePoint: 50 },
      { title: 'Rendu final', phaseId: 'p3', percentagePoint: 100 },
    ],
    defaultDeliverables: [
      {
        id: 'del_v1',
        title: 'Livrable final du projet',
        phaseId: 'p3',
        format: 'À définir selon le sujet',
        deadline: '',
        criteria: [
          { id: 'c_v1', title: 'Livrable complet conforme aux objectifs', verified: false },
        ],
        evaluationRubric: 'Évaluation globale / 20',
        status: 'non_commence',
      },
    ],
  },
};

/**
 * Création d'un projet vierge par défaut.
 */
export function createBlankProject(
  name: string = 'Mon projet de design',
  mode: 'individuel' | 'groupe' = 'individuel',
  startDate?: string,
  deadlineDate?: string
): ProjectData {
  const start = startDate || getTodayLocalDateStr();
  const end = deadlineDate || addDays(start, 56); // 8 semaines par défaut

  const template = PROJECT_TEMPLATES.vierge;

  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      name,
      description: 'Démarche de projet en design.',
      color: '#2F6DBB',
      templateId: 'vierge',
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
      customTags: [...DEFAULT_OPERATION_TAGS],
      intermediateDeadlines: [],
      supervisedSchedule: {
        mode: 'dates_libres',
        exceptions: [],
        specificDates: [],
      },
      availability: {
        hoursPerWeek: 8,
        preferredDays: [2, 4], // Mardi, Jeudi par défaut
      },
      defaultDurations: {
        individuelle: 2,
        groupe: 3,
        encadree: 2,
      },
    },
    phases: recalculatePhaseDates(
      template.phases.map((p) => ({ ...p, source: 'auto' })),
      start,
      end
    ),
    milestones: [
      {
        id: 'm_final',
        title: 'Rendu final & soutenance',
        phaseId: 'p3',
        daysBeforeDeadline: 0,
        useFixedDate: true,
        fixedDate: end,
        calculatedDate: end,
        completed: false,
        source: 'auto',
      },
    ],
    sessions: [
      {
        id: 'sess_init',
        date: start,
        type: mode === 'individuel' ? 'individuelle' : 'groupe',
        phaseId: 'p1',
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
