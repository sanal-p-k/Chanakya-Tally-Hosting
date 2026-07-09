import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { createClient } from 'redis';

// Setup Redis Client with fallback
let redisClient: any = null;
const initRedis = async () => {
  if (redisClient) return redisClient;
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    client.on('error', (err) => console.warn('Redis Client Error:', err));
    await client.connect();
    redisClient = client;
    console.log('Redis connected successfully for sessions.');
  } catch (error) {
    console.warn('Redis failed to connect. Falling back to local memory cache for active sessions.');
    redisClient = {
      store: new Map<string, string>(),
      async set(key: string, value: string) { this.store.set(key, value); },
      async get(key: string) { return this.store.get(key) || null; },
      async del(key: string) { this.store.delete(key); }
    };
  }
  return redisClient;
};

// Auto-run connection check in background
initRedis().catch(() => {});

export const launchApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { applicationId } = req.body;

  if (!applicationId) {
    res.status(400).json({ error: 'ApplicationId is required.' });
    return;
  }

  try {
    // 1. Verify user is allowed to access this application
    const isAllowed = await prisma.userApplication.findFirst({
      where: {
        userId: req.user.id,
        applicationId
      },
      include: {
        application: true
      }
    });

    // Super Admins are allowed to launch any active application
    let app = isAllowed?.application;
    if (!app && req.user.role === 'SUPER_ADMIN') {
      app = await prisma.application.findUnique({
        where: { id: applicationId, status: 'ACTIVE' }
      }) || undefined;
    }

    if (!app) {
      res.status(403).json({ error: 'You are not authorized to run this application.' });
      return;
    }

    // 2. Create Session Log
    const session = await prisma.sessionLog.create({
      data: {
        userId: req.user.id,
        companyId: req.user.companyId || 'global-admin',
        applicationId: app.id,
        applicationName: app.name,
        status: 'ACTIVE'
      }
    });

    // 3. Cache active session details in Redis
    const client = await initRedis();
    const sessionPayload = {
      sessionId: session.id,
      userId: req.user.id,
      applicationId: app.id,
      launchedAt: session.launchedAt.toISOString()
    };
    await client.set(`session:${session.id}`, JSON.stringify(sessionPayload));

    // 4. Return Guacamole Iframe Connection Details
    // Generates a mock or real URL based on configuration
    // Normal Guacamole URL format: http://<guacamole_host>:<port>/guacamole/#/client/c/<conn_id>?token=...
    // In our case, if no live connection details are set, the frontend will detect the connection parameters
    // and boot up our Interactive Windows Simulator.
    res.json({
      sessionId: session.id,
      application: {
        id: app.id,
        name: app.name,
        icon: app.icon,
        description: app.description
      },
      connectionUrl: app.guacamoleConnectionId
        ? `/guacamole/#/client/c/${app.guacamoleConnectionId}`
        : null,
      guacamoleConfig: app.guacamoleConfig
    });
  } catch (error) {
    console.error('Launch app error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'SessionId is required.' });
    return;
  }

  try {
    const session = await prisma.sessionLog.findUnique({ where: { id: sessionId } });

    if (!session) {
      res.status(404).json({ error: 'Session log not found.' });
      return;
    }

    // Update DB Log
    const updated = await prisma.sessionLog.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        status: 'COMPLETED'
      }
    });

    // Remove from Redis Cache
    const client = await initRedis();
    await client.del(`session:${sessionId}`);

    res.json({ message: 'Session terminated successfully.', session: updated });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  try {
    const whereClause: any = {};

    if (req.user.role === 'USER') {
      whereClause.userId = req.user.id;
    } else if (req.user.role === 'COMPANY_ADMIN') {
      whereClause.companyId = req.user.companyId;
    }

    const sessions = await prisma.sessionLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { launchedAt: 'desc' },
      take: 20
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
