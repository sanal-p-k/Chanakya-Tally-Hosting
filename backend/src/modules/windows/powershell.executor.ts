import { WinRMClient, WinRMResult } from './winrm.client';

export class PowerShellExecutor {
  private winrmClient: WinRMClient;

  constructor(winrmClient: WinRMClient) {
    this.winrmClient = winrmClient;
  }

  /**
   * Encodes PowerShell scripts in base64 UTF-16LE to safely pass over WinRM
   */
  public async executeScript(script: string): Promise<WinRMResult> {
    try {
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
      const command = `powershell -NoProfile -NonInteractive -EncodedCommand ${encodedScript}`;
      return await this.winrmClient.execute(command);
    } catch (error: any) {
      console.error('[PowerShellExecutor] execution error:', error);
      throw error;
    }
  }
}
