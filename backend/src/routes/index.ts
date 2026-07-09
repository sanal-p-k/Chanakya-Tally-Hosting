import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  assignApplications
} from '../controllers/user.controller';
import {
  getApps,
  getAppById,
  createApp,
  updateApp,
  deleteApp
} from '../controllers/app.controller';
import {
  launchApp,
  endSession,
  getSessions
} from '../controllers/session.controller';
import windowsRoutes from '../modules/windows/windows.routes';
import {
  getServers,
  createServer,
  updateServer,
  deleteServer,
  rebootServer,
  pingServer
} from '../controllers/server.controller';
import {
  getAuditLogs,
  clearAuditLogs
} from '../controllers/audit.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// --- Auth Routes ---
router.post('/auth/login', login);
router.get('/auth/me', authenticateJWT as any, getMe as any);

// --- Company Routes (Super Admin) ---
router.get('/companies', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, getCompanies as any);
router.post('/companies', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, createCompany as any);
router.get('/companies/:id', authenticateJWT as any, getCompanyById as any);
router.put('/companies/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, updateCompany as any);
router.delete('/companies/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, deleteCompany as any);

// --- User Routes (Admin & Super Admin) ---
router.get('/users', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, getUsers as any);
router.post('/users', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, createUser as any);
router.put('/users/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, updateUser as any);
router.delete('/users/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, deleteUser as any);
router.post('/users/:id/reset-password', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, resetPassword as any);
router.post('/users/:id/assign-apps', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, assignApplications as any);

// --- Application Routes ---
router.get('/apps', authenticateJWT as any, getApps as any);
router.get('/apps/:id', authenticateJWT as any, getAppById as any);
router.post('/apps', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, createApp as any);
router.put('/apps/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, updateApp as any);
router.delete('/apps/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, deleteApp as any);

// --- Session Routes ---
router.post('/sessions/launch', authenticateJWT as any, launchApp as any);
router.post('/sessions/end', authenticateJWT as any, endSession as any);
router.get('/sessions', authenticateJWT as any, getSessions as any);

// --- Windows Server Routes ---
router.get('/servers', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, getServers as any);
router.post('/servers', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, createServer as any);
router.put('/servers/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, updateServer as any);
router.delete('/servers/:id', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, deleteServer as any);
router.post('/servers/:id/reboot', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, rebootServer as any);
router.get('/servers/:id/ping', authenticateJWT as any, pingServer as any);

// --- Audit Log Routes ---
router.get('/audit-logs', authenticateJWT as any, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any, getAuditLogs as any);
router.post('/audit-logs/clear', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, clearAuditLogs as any);

// --- Windows WinRM Routes ---
router.use(windowsRoutes);

export default router;
