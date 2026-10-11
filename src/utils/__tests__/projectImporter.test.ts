import {
  normalizeTemplateId,
  buildProjectFromRawInput,
  extractProjectsListFromJSON,
} from '../projectImporter';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export function runProjectImporterVerification(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  const assert = (condition: boolean, name: string, message?: string) => {
    results.push({
      name,
      passed: !!condition,
      message: condition ? undefined : message || 'Assertion failed',
    });
  };

  try {
    // 1. Normalisation des gabarits
    assert(normalizeTemplateId('semestre') === 'semestre', 'Normalisation semestre');
    assert(normalizeTemplateId('Semestre') === 'semestre', 'Normalisation Semestre avec majuscule');
    assert(normalizeTemplateId('workshop') === 'workshop', 'Normalisation workshop');
    assert(normalizeTemplateId('atelier') === 'workshop', 'Normalisation atelier vers workshop');
    assert(normalizeTemplateId('mémoire') === 'memoire', 'Normalisation mémoire avec accent');
    assert(normalizeTemplateId('concours') === 'concours', 'Normalisation concours');
    assert(normalizeTemplateId('vierge') === 'vierge', 'Normalisation vierge');
    assert(normalizeTemplateId(undefined) === 'vierge', 'Modèle vierge par défaut si indéfini');
    assert(normalizeTemplateId('autre') === 'vierge', 'Modèle vierge par défaut si inconnu');

    // 2. Extraction liste "projets"
    const objWithProjets = {
      projets: [
        { nom: 'Projet 1', modele: 'semestre' },
        { nom: 'Projet 2', modele: 'workshop' },
      ],
    };
    const ext1 = extractProjectsListFromJSON(objWithProjets);
    assert(Array.isArray(ext1) && ext1.length === 2, 'Extraction depuis { projets: [...] }');

    const directArray = [{ nom: 'Projet direct', brief: 'Court brief' }];
    const ext2 = extractProjectsListFromJSON(directArray);
    assert(Array.isArray(ext2) && ext2.length === 1, 'Extraction depuis tableau direct');

    const storage = { studioplanner_active_id: '123' };
    assert(extractProjectsListFromJSON(storage) === null, 'Ignore sauvegarde complète');

    // 3. Construction projet avec jalons et tâches
    const raw = {
      nom: 'Design Circulaire',
      brief: 'Recherche et prototypage autour du réemploi.',
      modele: 'vierge',
      mode: 'individuel',
      dateDebut: '2026-10-15',
      dateRendu: '2026-12-15',
      heuresParSemaine: 10,
      tags: ['recherche', 'atelier'],
      jalons: [
        'Collecte des gisements de matières',
        {
          titre: 'Premier prototype à échelle 1',
          date: '2026-11-20',
          phase: 'Idéation',
        },
      ],
      taches: [
        'Cartographie des acteurs locaux',
        {
          titre: 'Tester la résistance des assemblages',
          phase: 2,
          dureeMinutes: 90,
          statut: 'en_cours',
        },
      ],
    };

    const project = buildProjectFromRawInput(raw);
    assert(project.settings.name === 'Design Circulaire', 'Nom du projet');
    assert(project.settings.description === 'Recherche et prototypage autour du réemploi.', 'Brief du projet');
    assert(project.settings.templateId === 'vierge', 'Template ID vierge');
    assert(project.settings.startDate === '2026-10-15', 'Date début');
    assert(project.settings.deadlineDate === '2026-12-15', 'Date rendu');
    assert(project.settings.availability?.hoursPerWeek === 10, 'Heures par semaine');
    assert(project.settings.customTags?.includes('recherche') === true, 'Tags personnalisés');

    // Jalons
    const hasJalon1 = project.milestones.some((m) => m.title === 'Collecte des gisements de matières');
    const hasJalon2 = project.milestones.some((m) => m.title === 'Premier prototype à échelle 1');
    assert(hasJalon1 && hasJalon2, 'Jalons importés et ajoutés');

    // Tâches
    assert(project.tasks.length === 2, '2 tâches créées');
    assert(project.tasks[0].title === 'Cartographie des acteurs locaux', 'Tâche 1 titre');
    assert(project.tasks[1].title === 'Tester la résistance des assemblages', 'Tâche 2 titre');
    assert(project.tasks[1].durationMinutes === 90, 'Tâche 2 durée');
    assert(project.tasks[1].status === 'en_cours', 'Tâche 2 statut');
  } catch (err: any) {
    results.push({
      name: 'Exception fatale',
      passed: false,
      message: err?.message || String(err),
    });
  }

  const passed = results.every((r) => r.passed);
  return { passed, results };
}
