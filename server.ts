import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import { register, login, logout, me, requestPasswordReset, verifyResetCode, resetPassword } from './server/authController';
import { getAllUsers, updateUserRole, deleteUser, isAdmin, makeMeAdmin } from './server/userController';
import { getModels, saveModel, deleteModel } from './server/modelController';
import { authenticateToken } from './server/middleware';

async function startServer() {
  const app = express();
  const PORT = 7000;

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/me', me);

  // Password Reset Routes
  app.post('/api/auth/forgot-password', requestPasswordReset);
  app.post('/api/auth/verify-code', verifyResetCode);
  app.post('/api/auth/reset-password', resetPassword);

  // Temporary Setup Route
  app.post('/api/setup-admin', makeMeAdmin);

  // Model Routes (Protected)
  app.get('/api/models', authenticateToken, getModels);
  app.post('/api/models', authenticateToken, saveModel);
  app.delete('/api/models/:id', authenticateToken, deleteModel);

  // Admin Routes
  app.get('/api/users', isAdmin, getAllUsers);
  app.put('/api/users/:id/role', isAdmin, updateUserRole);
  app.delete('/api/users/:id', isAdmin, deleteUser);

  // AI Analysis Route — Claude Opus 4.6
  app.post('/api/ai/analyze-stock', async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY non configurée dans le fichier .env' });
    }

    const { materials, stockData, orderQty, currency, modelName } = req.body;

    const materialsText = (materials || []).map((m: any) => {
      const needed = (m.qty || 0) * (orderQty || 1);
      const stock = m.stockActuel ?? 'N/A';
      const shortage = typeof stock === 'number' ? Math.max(0, needed - stock) : 'N/A';
      return `- ${m.name} (${m.categorie || 'autre'}): Prix=${m.unitPrice} ${currency}/u, Besoin=${needed.toFixed(2)} ${m.unit}, Stock=${stock}, Manque=${shortage}, Fournisseur=${m.fournisseur || 'non défini'}, Délai=${m.delaiLivraison || '?'} jours`;
    }).join('\n');

    const prompt = `Tu es un expert en gestion de stock et coût de production pour une usine textile (confection de vêtements).

MODÈLE EN COURS: ${modelName || 'Non spécifié'}
QUANTITÉ COMMANDE: ${orderQty || 1} pièces
DEVISE: ${currency || 'DH'}

ÉTAT DES MATIÈRES PREMIÈRES:
${materialsText || 'Aucune matière saisie.'}

MISSION — Analyse complète et décisions intelligentes:
1. **Alertes Urgentes**: Liste les matières en rupture de stock critique (manque > 0)
2. **Recommandations Commandes**: Quelles matières commander en priorité, chez quel fournisseur, quelle quantité buffer conseilles-tu (stock de sécurité = besoin × 1.2)?
3. **Optimisation Budget**: Si le budget est serré, quelles matières peut-on substituer ou réduire sans compromettre la qualité?
4. **Délais**: Calcule le délai critique (la matière avec le plus long délai de livraison parmi celles en rupture) — est-ce que la production peut commencer à temps?
5. **Indicateur Santé Stock**: Donne un score de 0 à 100 pour l'état du stock avec une couleur (🔴 Critique / 🟡 Attention / 🟢 Bon).

Réponds en français, de façon structurée avec des sections claires. Sois direct et actionnable.`;

    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((b: any) => b.type === 'text');
      const analysis = textBlock && 'text' in textBlock ? textBlock.text : 'Analyse non disponible.';
      return res.json({ analysis });
    } catch (err: any) {
      console.error('Claude API Error:', err);
      return res.status(500).json({ error: err.message || 'Erreur Claude API' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production (if needed, though usually handled by nginx/platform)
    // For this environment, we rely on Vite middleware mostly, but good to have a placeholder
    app.use(express.static('dist'));
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer();
