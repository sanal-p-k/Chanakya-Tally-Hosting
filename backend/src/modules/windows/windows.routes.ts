import { Router } from 'express';
import { testWindowsConnection, testProvision } from './windows.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';

const router = Router();

// Test WinRM connection
router.post('/windows/test', authenticateJWT as any, requireRole(['SUPER_ADMIN']) as any, testWindowsConnection as any);

// Proof of concept test-provision route
router.post('/windows/test-provision', testProvision as any);

export default router;
