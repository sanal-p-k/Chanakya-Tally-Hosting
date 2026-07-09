import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100 // return latest 100 logs
    });
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const clearAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Delete all logs
    await prisma.auditLog.deleteMany({});
    
    // Seed one informational log indicating logs were cleared
    const log = await prisma.auditLog.create({
      data: {
        action: 'LOGS_CLEAR',
        module: 'SETTINGS',
        status: 'INFO',
        message: 'System audit logs cleared by administrator.',
        operator: req.user?.email || 'System'
      }
    });

    res.json({ message: 'Logs successfully cleared.', log });
  } catch (error) {
    console.error('Clear audit logs error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
