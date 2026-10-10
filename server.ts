import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST /api/gemini/ask
app.post('/api/gemini/ask', async (req, res) => {
  try {
    const { tache, donnees, schemaJSON, image } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Service Gemini indisponible (clé absente)',
      });
    }

    const prompt = `Tâche demandée : ${tache || ''}\n\nContexte et données fournies :\n${
      typeof donnees === 'string' ? donnees : JSON.stringify(donnees || {}, null, 2)
    }`;

    const config: any = {
      maxOutputTokens: 800,
    };

    if (schemaJSON) {
      config.responseMimeType = 'application/json';
      config.responseSchema = schemaJSON;
    }

    let contents: any = prompt;
    if (image) {
      let mimeType = 'image/jpeg';
      let base64Data = '';
      if (typeof image === 'string') {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        } else {
          base64Data = image;
        }
      } else if (image && image.data) {
        mimeType = image.mimeType || 'image/jpeg';
        base64Data = image.data.replace(/^data:[^;]+;base64,/, '');
      }

      if (base64Data) {
        contents = [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ];
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config,
    });

    const text = response.text?.trim() || '';
    let parsedData: any = text;
    if (schemaJSON || text.startsWith('{') || text.startsWith('[')) {
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = text;
      }
    }

    res.json({ data: parsedData });
  } catch (err: any) {
    console.error('Erreur API Gemini /api/gemini/ask:', err);
    res.status(500).json({
      error: 'Erreur réseau ou quota lors de la communication avec Gemini',
    });
  }
});

// POST /api/action-suggestion
app.post('/api/action-suggestion', async (req, res) => {
  try {
    const { type, phaseName, phaseObjective, deliverableTitle, lastTrace, currentAction } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini non configuré (clé absente)',
      });
    }

    let prompt = '';
    if (type === 'micro_5min') {
      prompt = `Tu es un coach bienveillant spécialisé en méthode de travail et gestion du TDAH.
L'utilisateur est bloqué ou trouve cette action trop difficile : "${currentAction || 'Travailler sur le projet'}".
Découpe cette action en UNE SEULE micro-étape concrète, réalisable en 5 minutes chrono, pour briser l'inertie et démarrer immédiatement.
Exemple : "Ouvre ton carnet et dessine 1 croquis de l'objet" ou "Écris 3 mots-clés sur une feuille blanche".
Règles strictes :
- Action de moins de 90 caractères
- Verbe à l'impératif
- Tutoiement
- Durée fixée à 5 minutes`;
    } else {
      prompt = `Tu es un coach bienveillant spécialisé en démarche design et lutte contre l'inertie TDAH.
Contexte du projet :
- Phase en cours : ${phaseName || 'Exploration'}
- Objectif de phase : ${phaseObjective || 'Avancer sur les bases du projet'}
- Livrable attendu : ${deliverableTitle || 'Livrable intermédiaire'}
- Dernière trace du journal : ${lastTrace || 'Aucune trace récente'}

Propose UNE SEULE action concrète et immédiatement activable pour avancer sans surcharge cognitive.
Règles strictes :
- Action de moins de 90 caractères
- Verbe à l'impératif
- Tutoiement
- Durée estimée obligatoire parmi : 5, 10, 15, 20 ou 25 minutes`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Action concrète de moins de 90 caractères, verbe à l'impératif, tutoiement",
            },
            dureeMinutes: {
              type: Type.INTEGER,
              description: "Durée estimée : 5, 10, 15, 20 ou 25 minutes",
            },
          },
          required: ['action', 'dureeMinutes'],
        },
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);

    const allowedDurations = [5, 10, 15, 20, 25];
    let duration = allowedDurations.includes(parsed.dureeMinutes) ? parsed.dureeMinutes : 15;
    if (type === 'micro_5min') {
      duration = 5;
    }

    res.json({
      action: String(parsed.action || '').slice(0, 90),
      dureeMinutes: duration,
    });
  } catch (err: any) {
    console.error('Erreur API Gemini:', err);
    res.status(500).json({
      error: err.message || 'Erreur lors de la génération',
    });
  }
});

// Vite middleware in dev or static files in production
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`StudioPlanner server running on http://0.0.0.0:${PORT}`);
});
