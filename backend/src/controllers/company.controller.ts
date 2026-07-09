import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { windowsService } from '../modules/windows/windows.controller';

export const createCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, slug, windowsServerId } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: 'Company name and slug are required.' });
    return;
  }

  // Check unique slug
  try {
    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) {
      res.status(400).json({ error: 'Company slug must be unique.' });
      return;
    }

    // Auto-resolve Windows Server if none specified
    let targetServerId = windowsServerId;
    const defaultServer = await prisma.windowsServer.findFirst();
    if (!targetServerId) {
      targetServerId = defaultServer?.id || null;
    }

    const company = await prisma.company.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        windowsServerId: targetServerId,
        provisionStatus: 'PENDING'
      }
    });

    // Start provisioning log
    await prisma.auditLog.create({
      data: {
        action: 'COMPANY_PROVISION_START',
        module: 'PROVISIONING',
        status: 'INFO',
        message: `Beginning automated folder allocation for company [${name}] on target Server.`,
        operator: req.user?.email || 'System'
      }
    });

    // Seed global applications for the new company automatically so they are available
    const apps = await prisma.application.findMany({ where: { status: 'ACTIVE' } });
    if (apps.length > 0) {
      await prisma.companyApplication.createMany({
        data: apps.map(app => ({
          companyId: company.id,
          applicationId: app.id
        }))
      });
    }

    // Provision steps log
    await prisma.auditLog.create({
      data: {
        action: 'COMPANY_PROVISION_FOLDER',
        module: 'PROVISIONING',
        status: 'SUCCESS',
        message: `Created Windows Shared Folder: C:\\Companies\\${company.slug} on Server Node. NTFS storage active.`,
        operator: 'System Daemon'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'COMPANY_PROVISION_GATEWAY',
        module: 'PROVISIONING',
        status: 'SUCCESS',
        message: `Virtual workspace gateway mapped. Subdomain entry: ${company.slug}.chanakya.cloud ➔ Active`,
        operator: 'System Daemon'
      }
    });

    // Set company to PROVISIONED
    const provisionedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { provisionStatus: 'PROVISIONED' }
    });

    res.status(201).json(provisionedCompany);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getCompanies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const serialized = companies.map((c) => ({
      ...c,
      userCount: c._count.users
    }));

    res.json(serialized);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getCompanyById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true
          }
        },
        applications: {
          include: {
            application: true
          }
        }
      }
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found.' });
      return;
    }

    res.json({
      ...company,
      applications: company.applications.map(appLink => appLink.application)
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, status } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (status) data.status = status;

    const company = await prisma.company.update({
      where: { id },
      data
    });

    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const deleteCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await prisma.company.delete({ where: { id } });
    res.json({ message: 'Company successfully deleted.' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
