/**
 * Module unique d'intégration Gemini (côté client).
 * Appels côté serveur via l'intégration Gemini d'AI Studio : la clé n'apparaît jamais dans le code client.
 */

export interface GeminiResponse<T = any> {
  data: T | null;
  error?: string;
  cached?: boolean;
}

export interface SuggestedAction {
  action: string;
  dureeMinutes: 5 | 10 | 15 | 20 | 25;
}

const AI_ENABLED_KEY = 'studioplanner_gemini_enabled';
const AI_USAGE_KEY = 'studioplanner_ai_usage';
const AI_CACHE_KEY = 'studioplanner_ai_cache_v2';
const DAILY_LIMIT = 30;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Interrupteur : désactivé par défaut.
 */
export function isAiEnabled(): boolean {
  try {
    const val = localStorage.getItem(AI_ENABLED_KEY);
    return val === 'true'; // false par défaut
  } catch {
    return false;
  }
}

export function setAiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AI_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Compteur d'appels du jour sur 30.
 */
export function getAiDailyUsage(): { count: number; max: number; enabled: boolean } {
  const enabled = isAiEnabled();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return { count: Number(parsed.count) || 0, max: DAILY_LIMIT, enabled };
      }
    }
  } catch {
    // Ignore
  }
  return { count: 0, max: DAILY_LIMIT, enabled };
}

function incrementDailyUsage(): void {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    let count = 0;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        count = Number(parsed.count) || 0;
      }
    }
    count += 1;
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify({ date: today, count }));
  } catch {
    // Ignore
  }
}

function getCacheEntry<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store[key];
    if (entry && entry.expiresAt > Date.now()) {
      return entry.result;
    }
  } catch {
    // Ignore
  }
  return null;
}

function setCacheEntry<T>(key: string, result: T): void {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    for (const k of Object.keys(store)) {
      if (store[k]?.expiresAt <= now) {
        delete store[k];
      }
    }
    store[key] = {
      result,
      expiresAt: now + CACHE_TTL_MS,
    };
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore
  }
}

function hashInput(tache: string, donnees?: any, schemaJSON?: any, image?: any): string {
  try {
    const imgKey = typeof image === 'string' ? `${image.slice(0, 100)}_${image.length}` : '';
    const str = `${tache}_${JSON.stringify(donnees || '')}_${JSON.stringify(schemaJSON || '')}_${imgKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `gemini_${Math.abs(hash)}`;
  } catch {
    return `gemini_${tache.slice(0, 30)}`;
  }
}

/**
 * Fonction centrale demandée : askGemini(tache, donnees, schemaJSON).
 * Garde-fous :
 * · appel uniquement sur clic utilisateur, jamais au chargement ni en boucle ;
 * · cache : même entrée → réponse en cache (localStorage, 7 jours) ;
 * · plafond 30 appels/jour ; au-delà → message « Limite du jour atteinte » ;
 * · erreur réseau/quota → message court en français, l'app continue sans IA.
 */
export async function askGemini<T = any>(
  tache: string,
  donnees?: any,
  schemaJSON?: any,
  image?: string
): Promise<GeminiResponse<T>> {
  // 1. Vérifie si l'IA est activée dans Réglages
  if (!isAiEnabled()) {
    return { data: null, error: "L'aide de Gemini est désactivée dans les réglages." };
  }

  // 2. Vérifie le plafond journalier de 30 appels
  const usage = getAiDailyUsage();
  if (usage.count >= DAILY_LIMIT) {
    return { data: null, error: "Limite du jour atteinte" };
  }

  // 3. Cache 7 jours localStorage
  const cacheKey = hashInput(tache, donnees, schemaJSON, image);
  const cachedData = getCacheEntry<T>(cacheKey);
  if (cachedData !== null) {
    return { data: cachedData, cached: true };
  }

  // 4. Appel côté serveur
  try {
    const res = await fetch('/api/gemini/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tache,
        donnees,
        schemaJSON,
        image,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return { data: null, error: "Limite du jour atteinte" };
      }
      return { data: null, error: "Service momentanément indisponible" };
    }

    const json = await res.json();
    if (json.error) {
      return { data: null, error: "Service momentanément indisponible" };
    }

    // Succès : incrémentation et mise en cache
    incrementDailyUsage();
    setCacheEntry<T>(cacheKey, json.data);

    return { data: json.data };
  } catch {
    return { data: null, error: "Erreur de connexion à Gemini" };
  }
}

/**
 * Helpers pour le mode anti-inertie
 */
export interface ActionProposition {
  action: string;
  dureeMinutes: 5 | 10 | 15 | 20 | 25;
}

export async function proposerAction(contexte: {
  phaseEnCours?: string;
  livrableAttendu?: string;
  derniereTrace?: string;
}): Promise<ActionProposition | null> {
  const schema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: "Action concrète de moins de 90 caractères, verbe à l'impératif, tutoiement",
      },
      dureeMinutes: {
        type: 'integer',
        enum: [5, 10, 15, 20, 25],
        description: "Durée estimée : 5, 10, 15, 20 ou 25 minutes",
      },
    },
    required: ['action', 'dureeMinutes'],
  };

  const tache =
    "Propose UNE SEULE action concrète et immédiatement activable pour avancer sans surcharge cognitive (< 90 caractères, verbe à l'impératif, tutoiement, durée parmi 5, 10, 15, 20 ou 25 min).";

  const res = await askGemini<ActionProposition>(tache, contexte, schema);
  if (res.data && res.data.action) {
    const rawDur = Number(res.data.dureeMinutes);
    const validDurs: (5 | 10 | 15 | 20 | 25)[] = [5, 10, 15, 20, 25];
    const dureeMinutes = validDurs.includes(rawDur as any) ? (rawDur as 5 | 10 | 15 | 20 | 25) : 15;
    return {
      action: String(res.data.action).slice(0, 90),
      dureeMinutes,
    };
  }
  return null;
}

export async function simplifierAction(action: string): Promise<ActionProposition | null> {
  const schema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: "Micro-action concrète de 5 min chrono, verbe à l'impératif, tutoiement, < 90 caractères",
      },
      dureeMinutes: {
        type: 'integer',
        enum: [5],
        description: "Toujours 5",
      },
    },
    required: ['action', 'dureeMinutes'],
  };

  const tache = `Découpe cette action en UNE SEULE micro-étape concrète, très simple et réalisable en 5 minutes chrono pour briser l'inertie : "${action}". Moins de 90 caractères, verbe à l'impératif, tutoiement.`;

  const res = await askGemini<ActionProposition>(tache, { action }, schema);
  if (res.data && res.data.action) {
    return {
      action: String(res.data.action).slice(0, 90),
      dureeMinutes: 5,
    };
  }
  return null;
}

export const requestActionSuggestion = (params: any) =>
  proposerAction({
    phaseEnCours: params.phaseName,
    livrableAttendu: params.deliverableTitle,
    derniereTrace: params.lastTrace,
  });

export const requestMicroAction5Min = simplifierAction;

export interface ProposedTask {
  titre: string;
  dureeMinutes: number;
  ordre: number;
}

export async function suggestTasksForPhase(params: {
  nomPhase: string;
  objectif: string;
  livrableAttendu: string;
  datesPhase: string;
  briefProjet: string;
}): Promise<GeminiResponse<ProposedTask[]>> {
  const schema = {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: '3 à 6 tâches pour cette phase de design',
        items: {
          type: 'object',
          properties: {
            titre: {
              type: 'string',
              description: "Verbe d'action, moins de 60 caractères",
            },
            dureeMinutes: {
              type: 'integer',
              description: 'Durée en minutes de 30 à 240',
            },
            ordre: {
              type: 'integer',
              description: "Ordre chronologique de la tâche",
            },
          },
          required: ['titre', 'dureeMinutes', 'ordre'],
        },
      },
    },
    required: ['tasks'],
  };

  const tache = "Propose 3 à 6 tâches concrètes pour cette phase du projet de design. Format : titre (verbe d'action, < 60 car.), dureeMinutes (30 à 240), ordre.";

  const res = await askGemini<{ tasks: ProposedTask[] } | ProposedTask[]>(tache, params, schema);
  if (res.data) {
    const list = Array.isArray(res.data) ? res.data : (res.data.tasks || []);
    const cleanList: ProposedTask[] = list.map((item, idx) => ({
      titre: String(item.titre || '').slice(0, 60),
      dureeMinutes: Math.min(240, Math.max(30, Number(item.dureeMinutes) || 60)),
      ordre: Number(item.ordre) || idx + 1,
    }));
    return { data: cleanList, cached: res.cached };
  }
  return { data: null, error: res.error || 'Impossible de générer des propositions' };
}

export interface FormulationSuggestion {
  titre: string;
  constat: string;
  tags: string[];
}

export async function suggestFormulation(params: {
  constat: string;
  photo?: string;
  tagsExistants: string[];
}): Promise<GeminiResponse<FormulationSuggestion>> {
  const schema = {
    type: 'object',
    properties: {
      titre: {
        type: 'string',
        description: 'Titre court et pertinent de la trace (< 50 caractères)',
      },
      constat: {
        type: 'string',
        description: 'Reformulation claire et structurée du constat',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '1 à 3 tags choisis strictement parmi les tags existants fournis',
      },
    },
    required: ['titre', 'constat', 'tags'],
  };

  const tache = "Aide à formuler cette trace du journal de bord de design. À partir du constat (et de la photo si présente), propose : 1) un titre court (< 50 car.), 2) une reformulation claire du constat, 3) 1 à 3 tags choisis STRICTEMENT parmi la liste des tags existants fournis.";

  const donnees = {
    constat: params.constat || "Observation d'atelier",
    tagsExistants: params.tagsExistants,
  };

  const res = await askGemini<FormulationSuggestion>(tache, donnees, schema, params.photo);
  if (res.data) {
    let validTags = Array.isArray(res.data.tags) ? res.data.tags : [];
    if (params.tagsExistants.length > 0) {
      const allowed = new Set(params.tagsExistants.map((t) => t.toLowerCase()));
      validTags = validTags.filter((t) => allowed.has(t.toLowerCase())).slice(0, 3);
      if (validTags.length === 0 && params.tagsExistants.length > 0) {
        validTags = [params.tagsExistants[0]];
      }
    }

    return {
      data: {
        titre: String(res.data.titre || '').slice(0, 50),
        constat: String(res.data.constat || ''),
        tags: validTags.slice(0, 3),
      },
      cached: res.cached,
    };
  }

  return {
    data: null,
    error: res.error || 'Impossible de proposer une reformulation pour le moment.',
  };
}

export interface WeeklySummary {
  fait: string;
  constate: string;
  prochaineEtape: string;
}

export async function generateWeeklySummary(params: {
  traces: { titre: string; constat: string }[];
  sessions: { titre: string }[];
  tachesFaites: { titre: string }[];
}): Promise<GeminiResponse<WeeklySummary>> {
  const schema = {
    type: 'object',
    properties: {
      fait: {
        type: 'string',
        description: "Partie 'Fait' : ce qui a été accompli durant la semaine, rédigé à la 1re personne, sans tutoiement.",
      },
      constate: {
        type: 'string',
        description: "Partie 'Constaté' : retours, constats, blocages ou apprentissages, rédigé à la 1re personne, sans tutoiement.",
      },
      prochaineEtape: {
        type: 'string',
        description: "Partie 'Prochaine étape' : ce qui est prévu pour la suite, rédigé à la 1re personne, sans tutoiement.",
      },
    },
    required: ['fait', 'constate', 'prochaineEtape'],
  };

  const tache =
    "Rédige un bilan de la semaine pour ce projet de design en 3 parties : Fait · Constaté · Prochaine étape. Contraintes impératives : 150 mots maximum au total, AUCUN tutoiement (interdit : rédigé à la 1re personne 'je' ou 'nous'). Base-toi uniquement sur les données fournies (traces, sessions, tâches faites).";

  const res = await askGemini<WeeklySummary>(tache, params, schema);
  if (res.data) {
    return {
      data: {
        fait: String(res.data.fait || '').trim(),
        constate: String(res.data.constate || '').trim(),
        prochaineEtape: String(res.data.prochaineEtape || '').trim(),
      },
      cached: res.cached,
    };
  }

  return {
    data: null,
    error: res.error || 'Impossible de générer le bilan pour le moment.',
  };
}

