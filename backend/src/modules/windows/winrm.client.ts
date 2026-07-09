import { runPowershell } from 'winrm-client';
import { exec } from 'child_process';

export interface WinRMResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export class WinRMClient {
  private host: string;
  private port: number;
  private username: string;
  private password: string;

  constructor() {
    // Default to the private IP as recommended inside AWS VPC
    this.host = process.env.WINDOWS_HOST_PRIVATE || '172.31.36.142';
    this.port = Number(process.env.WINRM_PORT) || 5985;
    this.username = process.env.WINDOWS_USERNAME || 'administrator';
    this.password = process.env.WINDOWS_PASSWORD || '';
  }

  /**
   * Check connection status with automatic failover from private to public IP
   */
  public async connect(): Promise<boolean> {
    try {
      const start = Date.now();
      const res = await this.execute("Write-Output 'PING'");
      if (res.exitCode === 0) {
        console.log(`[WinRM] Connection verified on host: ${this.host}. Latency: ${Date.now() - start}ms`);
        return true;
      }
    } catch (err: any) {
      console.warn(`[WinRM] Connection failed to host ${this.host}: ${err.message || err}. Checking public failover...`);
    }

    // Try failover to public IP if configured
    const publicHost = process.env.WINDOWS_HOST_PUBLIC;
    if (publicHost && publicHost !== this.host) {
      try {
        console.log(`[WinRM] Attempting failover to public host: ${publicHost}`);
        const result = await runPowershell(
          "Write-Output 'PING'",
          publicHost,
          this.username,
          this.password,
          this.port,
          false,
          false
        );
        if (result) {
          console.log(`[WinRM] Failover successful. Redirecting active host to ${publicHost}`);
          this.host = publicHost;
          return true;
        }
      } catch (failoverErr: any) {
        console.error(`[WinRM] Public failover to ${publicHost} failed:`, failoverErr.message || failoverErr);
      }
    }

    return false;
  }

  /**
   * Execute command on remote host via WinRM (or locally if host is localhost/127.0.0.1)
   */
  public async execute(commandStr: string): Promise<WinRMResult> {
    const startTime = Date.now();
    console.log(`[WinRM] Executing on host [${this.host}]: ${commandStr}`);
    
    // Local loopback fallback for testing outside of AWS VPC
    if (this.host === 'localhost' || this.host === '127.0.0.1') {
      return new Promise((resolve) => {
        exec(commandStr, { shell: 'powershell.exe' }, (error: any, stdout: string, stderr: string) => {
          const executionTimeMs = Date.now() - startTime;
          const exitCode = error ? (error.code ?? 1) : 0;
          
          console.log(`[Local powershell] Execution finished in ${executionTimeMs}ms. Success: ${exitCode === 0}. ExitCode: ${exitCode}`);
          
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode,
            executionTimeMs
          });
        });
      });
    }

    // Remote AWS VPC WinRM Execution
    try {
      const stdout = await runPowershell(
        commandStr,
        this.host,
        this.username,
        this.password,
        this.port,
        false, // useHttps
        false  // rejectUnauthorized
      );

      const executionTimeMs = Date.now() - startTime;
      console.log(`[WinRM] Execution finished in ${executionTimeMs}ms. Success: true.`);

      return {
        stdout: stdout || '',
        stderr: '',
        exitCode: 0,
        executionTimeMs
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errMsg = error.message || String(error);
      console.error(`[WinRM] Command failed after ${executionTimeMs}ms. Error:`, errMsg);
      
      return {
        stdout: '',
        stderr: errMsg,
        exitCode: 1,
        executionTimeMs
      };
    }
  }
}
