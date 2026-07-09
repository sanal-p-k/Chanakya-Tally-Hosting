import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getServers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const servers = await prisma.windowsServer.findMany({
      include: {
        _count: {
          select: { companies: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute mock metrics for running applications and connected users
    const mapped = servers.map(s => {
      let runningApps = 0;
      let connectedUsers = 0;

      if (s.status === 'ONLINE') {
        runningApps = s.name.includes('Primary') ? 4 : 1;
        connectedUsers = s.name.includes('Primary') ? 2 : 0;
      }

      return {
        ...s,
        runningApps,
        connectedUsers,
        companyCount: s._count.companies
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const createServer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, publicIp, privateIp, os, ram, cpu, storage } = req.body;

  if (!name || !publicIp || !privateIp) {
    res.status(400).json({ error: 'Name, public IP, and private IP are required.' });
    return;
  }

  try {
    const server = await prisma.windowsServer.create({
      data: {
        name,
        publicIp,
        privateIp,
        os: os || 'Windows Server 2022 Datacenter',
        ram: ram || '16 GB',
        cpu: cpu || '4 vCPU',
        storage: storage || '256 GB NVMe SSD',
        status: 'ONLINE',
        health: 'HEALTHY'
      }
    });

    // Add Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'SERVER_REGISTER',
        module: 'SERVERS',
        status: 'SUCCESS',
        message: `Registered new Windows Server RDP Node: ${name} [${publicIp}]`,
        operator: req.user?.email || 'System'
      }
    });

    res.status(201).json(server);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const updateServer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, publicIp, privateIp, status, health, os, ram, cpu, storage } = req.body;

  try {
    const server = await prisma.windowsServer.update({
      where: { id },
      data: {
        name,
        publicIp,
        privateIp,
        status,
        health,
        os,
        ram,
        cpu,
        storage
      }
    });

    res.json(server);
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const deleteServer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const server = await prisma.windowsServer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'SERVER_DELETE',
        module: 'SERVERS',
        status: 'WARNING',
        message: `Deleted Windows Server RDP Node: ${server.name} [${server.publicIp}]`,
        operator: req.user?.email || 'System'
      }
    });

    res.json({ message: 'Server deleted successfully.' });
  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const rebootServer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const server = await prisma.windowsServer.findUnique({ where: { id } });
    if (!server) {
      res.status(404).json({ error: 'Server not found.' });
      return;
    }

    // Set server status to REBOOTING in database
    await prisma.windowsServer.update({
      where: { id },
      data: {
        status: 'REBOOTING',
        health: 'WARNING'
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'SERVER_REBOOT',
        module: 'SERVERS',
        status: 'WARNING',
        message: `Initiated simulated remote reboot on Windows Server: ${server.name} [${server.publicIp}]`,
        operator: req.user?.email || 'System'
      }
    });

    // Set server back to ONLINE after 10 seconds asynchronously (to simulate power cycle)
    setTimeout(async () => {
      try {
        await prisma.windowsServer.update({
          where: { id },
          data: {
            status: 'ONLINE',
            health: 'HEALTHY'
          }
        });

        await prisma.auditLog.create({
          data: {
            action: 'SERVER_REBOOT_COMPLETE',
            module: 'SERVERS',
            status: 'SUCCESS',
            message: `Windows Server reboot complete. Services restored on ${server.name} [${server.publicIp}]`,
            operator: 'System Daemon'
          }
        });
      } catch (err) {
        console.error('Failed to complete async server reboot:', err);
      }
    }, 10000);

    res.json({ message: 'Server reboot initiated. Status set to REBOOTING.' });
  } catch (error) {
    console.error('Reboot server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const pingServer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const server = await prisma.windowsServer.findUnique({ where: { id } });
    if (!server) {
      res.status(404).json({ error: 'Server not found.' });
      return;
    }

    // Generate randomized connection status and latency
    const pingLatency = server.status === 'ONLINE' ? Math.floor(Math.random() * 15) + 5 : 999;
    const isOnline = server.status === 'ONLINE';

    res.json({
      serverId: server.id,
      name: server.name,
      isOnline,
      latency: `${pingLatency}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ping server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
