import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { WinRMClient } from './winrm.client';
import { PowerShellExecutor } from './powershell.executor';
import { WindowsService } from './windows.service';
import prisma from '../../utils/prisma';

const winrmClient = new WinRMClient();
const executor = new PowerShellExecutor(winrmClient);
export const windowsService = new WindowsService(winrmClient, executor);

/**
   * Health check endpoint
   */
export const testWindowsConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const result = await windowsService.testConnection();
    const duration = Date.now() - startTime;

    await prisma.auditLog.create({
      data: {
        action: 'SERVER_PING',
        module: 'SERVERS',
        status: 'SUCCESS',
        message: `WinRM health check successful. Latency: ${result.latency}`,
        operator: req.user?.email || 'System'
      }
    });

    res.json(result);
  } catch (error: any) {
    console.error('WinRM connection test failed:', error);
    
    await prisma.auditLog.create({
      data: {
        action: 'SERVER_PING_FAILED',
        module: 'SERVERS',
        status: 'FAILED',
        message: `WinRM health check failed: ${error.message || error}`,
        operator: req.user?.email || 'System'
      }
    });

    res.status(500).json({
      status: 'OFFLINE',
      error: error.message || 'Connection timed out.'
    });
  }
};

/**
   * Proof of Concept test-provision endpoint
   */
export const testProvision = async (req: Request, res: Response): Promise<void> => {
  const username = 'sanal';
  const password = 'sanal123';
  const folderPath = 'C:\\Companies\\Chanakya';

  const responseObj = {
    success: false,
    windowsConnected: false,
    userCreated: false,
    rdpGranted: false,
    folderPermissionGranted: false,
    message: ''
  };

  try {
    // 1. Establish connection to Windows Server
    const connected = await windowsService.connect();
    if (!connected) {
      res.status(500).json({
        ...responseObj,
        message: 'Could not establish connection to Windows Server via WinRM.'
      });
      return;
    }
    responseObj.windowsConnected = true;

    // 2. Check if user 'sanal' already exists
    const exists = await windowsService.userExists(username);
    if (!exists) {
      // Create local user
      const createRes = await windowsService.createLocalUser(username, password);
      if (createRes.exitCode !== 0) {
        res.status(500).json({
          ...responseObj,
          message: `Failed to create local Windows user: ${createRes.stderr || 'unknown error'}`
        });
        return;
      }
      responseObj.userCreated = true;
    } else {
      console.log(`[POC] User '${username}' already exists. Skipping user creation.`);
      responseObj.userCreated = true;
    }

    // 3. Automatically add the user to "Remote Desktop Users" group
    const rdpRes = await windowsService.addRemoteDesktopPermission(username);
    if (rdpRes.exitCode !== 0) {
      res.status(500).json({
        ...responseObj,
        message: `Failed to add user to Remote Desktop Users group: ${rdpRes.stderr || 'unknown error'}`
      });
      return;
    }
    responseObj.rdpGranted = true;

    // 4. Grant Modify permissions to C:\Companies\Chanakya
    const permissionRes = await windowsService.grantFolderPermission(username, folderPath);
    if (permissionRes.exitCode !== 0) {
      res.status(500).json({
        ...responseObj,
        message: `Failed to grant Modify folder permissions on ${folderPath}: ${permissionRes.stderr || 'unknown error'}`
      });
      return;
    }
    responseObj.folderPermissionGranted = true;

    // Create Audit Log of POC
    await prisma.auditLog.create({
      data: {
        action: 'POC_PROVISION_TEST',
        module: 'PROVISIONING',
        status: 'SUCCESS',
        message: `POC Windows provisioning completed for user [sanal] on folder [${folderPath}].`,
        operator: 'System'
      }
    });

    responseObj.success = true;
    responseObj.message = 'Windows provisioning completed successfully.';
    res.json(responseObj);

  } catch (error: any) {
    console.error('[POC] Provisioning test failed:', error);
    res.status(500).json({
      ...responseObj,
      message: `Detailed execution failure: ${error.message || error}`
    });
  }
};
