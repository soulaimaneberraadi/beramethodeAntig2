import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { register, login, logout, me, requestPasswordReset, verifyResetCode, resetPassword } from './server/authController';
import { getAllUsers, updateUserRole, deleteUser, isAdmin, makeMeAdmin } from './server/userController';
import { getModels, saveModel, deleteModel } from './server/modelController';
import { authenticateToken } from './server/middleware';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
