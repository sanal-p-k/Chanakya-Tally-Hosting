import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getApps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  try {
    if (req.user.role === 'SUPER_ADMIN') {
      const apps = await prisma.application.findMany({
        orderBy: { name: 'asc' }
      });
      res.json(apps);
      return;
    }

    if (req.user.role === 'COMPANY_ADMIN') {
      const companyApps = await prisma.companyApplication.findMany({
        where: { companyId: req.user.companyId || '' },
        include: { application: true }
      });
      res.json(companyApps.map((ca) => ca.application));
      return;
    }

    // Normal USER: Get only user's explicitly allowed applications (that are also active)
    const userApps = await prisma.userApplication.findMany({
      where: {
        userId: req.user.id,
        application: { status: 'ACTIVE' }
      },
      include: { application: true }
    });
    res.json(userApps.map((ua) => ua.application));
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const createApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, icon, description, executable, guacamoleConnectionId, guacamoleConfig, status } = req.body;

  if (!name || !executable) {
    res.status(400).json({ error: 'Application name and executable path are required.' });
    return;
  }

  try {
    const app = await prisma.application.create({
      data: {
        name,
        icon: icon || 'AppWindow',
        description,
        executable,
        guacamoleConnectionId,
        guacamoleConfig: guacamoleConfig || {},
        status: status || 'ACTIVE'
      }
    });

    // Automatically make it available to all companies by default in seeding phase
    const companies = await prisma.company.findMany();
    if (companies.length > 0) {
      await prisma.companyApplication.createMany({
        data: companies.map((c) => ({
          companyId: c.id,
          applicationId: app.id
        }))
      });
    }

    res.status(201).json(app);
  } catch (error) {
    console.error('Create app error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const updateApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, icon, description, executable, guacamoleConnectionId, guacamoleConfig, status } = req.body;

  try {
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (icon) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (executable) updateData.executable = executable;
    if (guacamoleConnectionId !== undefined) updateData.guacamoleConnectionId = guacamoleConnectionId;
    if (guacamoleConfig !== undefined) updateData.guacamoleConfig = guacamoleConfig;
    if (status) updateData.status = status;

    const updated = await prisma.application.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const deleteApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await prisma.application.delete({ where: { id } });
    res.json({ message: 'Application deleted successfully.' });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getAppById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { id } = req.params;

  try {
    const app = await prisma.application.findUnique({
      where: { id }
    });

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    // Role-based access checks
    if (req.user.role === 'USER') {
      const isAllowed = await prisma.userApplication.findFirst({
        where: {
          userId: req.user.id,
          applicationId: id
        }
      });
      if (!isAllowed) {
        res.status(403).json({ error: 'Forbidden: You do not have access to this application.' });
        return;
      }
    } else if (req.user.role === 'COMPANY_ADMIN') {
      const isAllowed = await prisma.companyApplication.findFirst({
        where: {
          companyId: req.user.companyId || '',
          applicationId: id
        }
      });
      if (!isAllowed) {
        res.status(403).json({ error: 'Forbidden: Your company does not have access to this application.' });
        return;
      }
    }

    res.json(app);
  } catch (error) {
    console.error('Get app by id error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

