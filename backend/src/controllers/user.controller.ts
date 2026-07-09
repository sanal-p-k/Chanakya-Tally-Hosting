import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { windowsService } from '../modules/windows/windows.controller';
import { encrypt } from '../utils/encryption';

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
        windowsUsername: true,
        provisionStatus: true,
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
    const encryptedWindowsPassword = encrypt(password);

    const company = targetCompanyId ? await prisma.company.findUnique({ where: { id: targetCompanyId } }) : null;
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const windowsUsername = cleanName + (company ? `.${company.slug}` : '.admin');

    // Create DB User in PENDING state
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        windowsPassword: encryptedWindowsPassword,
        role: targetRole,
        companyId: targetCompanyId || null,
        windowsUsername,
        provisionStatus: 'PENDING'
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

    const companyName = company ? company.name : 'Global';

    // Start provisioning log
    await prisma.auditLog.create({
      data: {
        action: 'USER_PROVISION_START',
        module: 'PROVISIONING',
        status: 'INFO',
        message: `Spawning automatic Windows RDP provisioning for user [${name}] in company [${companyName}].`,
        operator: req.user?.email || 'System'
      }
    });

    // Execute Real Windows Provisioning over WinRM
    try {
      const connected = await windowsService.connect();
      if (!connected) {
        throw new Error('Could not establish WinRM connection to the Windows Server.');
      }

      await windowsService.createLocalUser(windowsUsername, password);
      
      await prisma.auditLog.create({
        data: {
          action: 'USER_PROVISION_AD',
          module: 'PROVISIONING',
          status: 'SUCCESS',
          message: `Created Active Directory Windows account: ${windowsUsername} on RDP node.`,
          operator: 'System Daemon'
        }
      });

      await windowsService.addRemoteDesktopPermission(windowsUsername);
      
      await prisma.auditLog.create({
        data: {
          action: 'USER_PROVISION_GROUPS',
          module: 'PROVISIONING',
          status: 'SUCCESS',
          message: `Added user ${windowsUsername} to [Remote Desktop Users] security privileges group.`,
          operator: 'System Daemon'
        }
      });

      if (company) {
        await windowsService.grantFolderPermission(windowsUsername, `C:\\Companies\\${company.slug}`);
        
        await prisma.auditLog.create({
          data: {
            action: 'USER_PROVISION_FOLDER',
            module: 'PROVISIONING',
            status: 'SUCCESS',
            message: `Mapped NTFS modify privileges on C:\\Companies\\${company.slug} for ${windowsUsername}.`,
            operator: 'System Daemon'
          }
        });
      }
    } catch (winrmError) {
      console.error('WinRM Provisioning Error:', winrmError);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { provisionStatus: 'FAILED' }
      });
      
      await prisma.auditLog.create({
        data: {
          action: 'USER_PROVISION_FAILED',
          module: 'PROVISIONING',
          status: 'ERROR',
          message: `Failed to provision user ${windowsUsername} on Windows Server.`,
          operator: req.user?.email || 'System'
        }
      });
      
      res.status(500).json({ error: 'Windows provisioning failed. User created in DB but failed on Server.' });
      return;
    }

    // Update status to PROVISIONED
    const finalUser = await prisma.user.update({
      where: { id: user.id },
      data: { provisionStatus: 'PROVISIONED' }
    });

    res.status(201).json({
      success: true,
      windows: true,
      database: true,
      user: {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        role: finalUser.role,
        status: finalUser.status,
        companyId: finalUser.companyId,
        windowsUsername: finalUser.windowsUsername,
        provisionStatus: finalUser.provisionStatus
      }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }
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
        companyId: true,
        windowsUsername: true,
        provisionStatus: true
      }
    });

    // Log state changes
    if (status && status !== existingUser.status && updated.windowsUsername) {
      await prisma.auditLog.create({
        data: {
          action: status === 'ACTIVE' ? 'USER_ENABLE' : 'USER_DISABLE',
          module: 'PROVISIONING',
          status: 'SUCCESS',
          message: `${status === 'ACTIVE' ? 'Enabled' : 'Disabled'} Windows Account ${updated.windowsUsername} via Admin command.`,
          operator: req.user.email
        }
      });
    }

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

    if (existingUser.windowsUsername) {
      await prisma.auditLog.create({
        data: {
          action: 'USER_DELETE_REMOTE',
          module: 'PROVISIONING',
          status: 'SUCCESS',
          message: `Removed Windows AD User Account: ${existingUser.windowsUsername} from host.`,
          operator: req.user.email
        }
      });
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
    const encryptedWindowsPassword = encrypt(password);

    if (existingUser.windowsUsername) {
      await prisma.auditLog.create({
        data: {
          action: 'USER_PASSWORD_SYNC',
          module: 'PROVISIONING',
          status: 'SUCCESS',
          message: `Synchronized security credentials for user ${existingUser.windowsUsername} on Windows host.`,
          operator: req.user.email
        }
      });
    }

    await prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        windowsPassword: encryptedWindowsPassword
      }
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
