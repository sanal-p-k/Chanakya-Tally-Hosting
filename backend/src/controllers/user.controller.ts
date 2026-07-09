import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  try {
    const whereClause: any = {};

    // Company Admin is locked to their company's users
    if (req.user.role === 'COMPANY_ADMIN') {
      whereClause.companyId = req.user.companyId;
      whereClause.role = { not: 'SUPER_ADMIN' }; // Cannot view super admins
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        allowedApplications: {
          select: {
            applicationId: true
          }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = users.map((u) => ({
      ...u,
      allowedApplications: u.allowedApplications.map((ua) => ua.applicationId)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { name, email, password, role, companyId, allowedApplications } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    let targetCompanyId = companyId;
    let targetRole = role || 'USER';

    // Enforcement: Company Admin can only create users in their own company and cannot make Super Admins
    if (req.user.role === 'COMPANY_ADMIN') {
      targetCompanyId = req.user.companyId;
      if (targetRole === 'SUPER_ADMIN') {
        targetRole = 'USER';
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: targetRole,
        companyId: targetCompanyId || null
      }
    });

    // Handle initial allowed applications mapping if provided
    if (allowedApplications && Array.isArray(allowedApplications)) {
      await prisma.userApplication.createMany({
        data: allowedApplications.map((appId: string) => ({
          userId: user.id,
          applicationId: appId
        }))
      });
    }

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyId: user.companyId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { id } = req.params;
  const { name, email, role, status, companyId } = req.body;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Role restrictions for Company Admin
    if (req.user.role === 'COMPANY_ADMIN') {
      if (existingUser.companyId !== req.user.companyId) {
        res.status(403).json({ error: 'You are not authorized to update this user.' });
        return;
      }
      if (role === 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Cannot elevate user to SUPER_ADMIN role.' });
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (req.user.role === 'SUPER_ADMIN' && companyId !== undefined) {
      updateData.companyId = companyId || null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { id } = req.params;

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.user.role === 'COMPANY_ADMIN' && existingUser.companyId !== req.user.companyId) {
      res.status(403).json({ error: 'You are not authorized to delete this user.' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'New password is required.' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.user.role === 'COMPANY_ADMIN' && existingUser.companyId !== req.user.companyId) {
      res.status(403).json({ error: 'You are not authorized to update this user.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset completed successfully.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const assignApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { id } = req.params; // User ID
  const { applicationIds } = req.body; // Array of application IDs

  if (!applicationIds || !Array.isArray(applicationIds)) {
    res.status(400).json({ error: 'applicationIds array is required.' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.user.role === 'COMPANY_ADMIN' && existingUser.companyId !== req.user.companyId) {
      res.status(403).json({ error: 'You are not authorized to edit this user.' });
      return;
    }

    // Delete existing links
    await prisma.userApplication.deleteMany({ where: { userId: id } });

    // Link new apps
    if (applicationIds.length > 0) {
      await prisma.userApplication.createMany({
        data: applicationIds.map((appId: string) => ({
          userId: id,
          applicationId: appId
        }))
      });
    }

    res.json({ message: 'Applications updated successfully.' });
  } catch (error) {
    console.error('Assign apps error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
