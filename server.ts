import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me, requestPasswordReset, verifyResetCode, resetPassword } from './server/authController';
import { getAllUsers, updateUserRole, deleteUser, isAdmin } from './server/userController';
import { getModels, saveModel, deleteModel } from './server/modelController';
import { getMagasinProducts, saveMagasinProduct, deleteMagasinProduct, getMagasinLots, getMagasinMouvements, registerMouvement, updateMagasinMouvement, deleteMagasinMouvement, getMagasinCommandes, saveMagasinCommande, deleteMagasinCommande, getMagasinDemandes, saveMagasinDemande, deleteMagasinDemande, getMagasinDechets, saveMagasinDechet, deleteMagasinDechet } from './server/magasinController';
import { getSettings, saveSettings } from './server/settingsController';
import { getProductionLines, updateProductionLine, getProductionDaily } from './server/productionController';
import { authenticateToken } from './server/middleware';

async function startServer() {
  const app = express();
  const PORT = 9000;

  // Security Middlewares
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5000, // Increased for dev
    message: 'Too many requests, please try again later.',
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20, // Max 20 attempts for Auth routes
    message: 'Too many authentication attempts. Please wait 15 minutes.',
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);

  // API Routes
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/me', me);

  // Password Reset Routes
  app.post('/api/auth/forgot-password', requestPasswordReset);
  app.post('/api/auth/verify-code', verifyResetCode);
  app.post('/api/auth/reset-password', resetPassword);

  app.get('/api/models', authenticateToken, getModels);
  app.post('/api/models', authenticateToken, saveModel);
  app.delete('/api/models/:id', authenticateToken, deleteModel);

  // Magasin Routes (Protected)
  app.get('/api/magasin/products', authenticateToken, getMagasinProducts);
  app.post('/api/magasin/products', authenticateToken, saveMagasinProduct);
  app.delete('/api/magasin/products/:id', authenticateToken, deleteMagasinProduct);
  app.get('/api/magasin/lots', authenticateToken, getMagasinLots);
  app.get('/api/magasin/mouvements', authenticateToken, getMagasinMouvements);
  app.post('/api/magasin/mvt', authenticateToken, registerMouvement);
  app.put('/api/magasin/mouvements/:id', authenticateToken, updateMagasinMouvement);
  app.delete('/api/magasin/mouvements/:id', authenticateToken, deleteMagasinMouvement);

  // Commandes, Demandes, Dechets
  app.get('/api/magasin/commandes', authenticateToken, getMagasinCommandes);
  app.post('/api/magasin/commandes', authenticateToken, saveMagasinCommande);
  app.delete('/api/magasin/commandes/:id', authenticateToken, deleteMagasinCommande);

  app.get('/api/magasin/demandes', authenticateToken, getMagasinDemandes);
  app.post('/api/magasin/demandes', authenticateToken, saveMagasinDemande);
  app.delete('/api/magasin/demandes/:id', authenticateToken, deleteMagasinDemande);

  app.get('/api/magasin/dechets', authenticateToken, getMagasinDechets);
  app.post('/api/magasin/dechets', authenticateToken, saveMagasinDechet);
  app.delete('/api/magasin/dechets/:id', authenticateToken, deleteMagasinDechet);

  // Settings Routes
  app.get('/api/settings', authenticateToken, getSettings);
  app.post('/api/settings', authenticateToken, saveSettings);

  // Production Tracking Routes (Suivi Live & Analysis)
  app.get('/api/suivilive/lines', authenticateToken, getProductionLines);
  app.put('/api/suivilive/lines/:id', authenticateToken, updateProductionLine);
  app.get('/api/analysis/stats', authenticateToken, getProductionDaily);


  // Admin Routes
  app.get('/api/users', isAdmin, getAllUsers);
  app.put('/api/users/:id/role', isAdmin, updateUserRole);
  app.delete('/api/users/:id', isAdmin, deleteUser);

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
