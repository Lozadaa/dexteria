/**
 * Runner
 *
 * Command execution with logging, timeout, and policy enforcement.
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PolicyGuard } from '../../services/PolicyGuard';
import { LocalKanbanStore } from '../../services/LocalKanbanStore';
import type { Policy, CommandRunMetadata } from '../../../shared/types';
import { createRunId } from '../../../shared/schemas';

export interface RunOptions {
  cmd: string;
  cwd?: string;
  timeoutSec?: number;
  taskId: string;
  runId?: string;
  env?: Record<string, string>;
}

export interface RunResult {
  success: boolean;
  exitCode: number | null;
  timedOut: boolean;
  logPath: string;
  metadataPath: string;
  error?: string;
  durationMs: number;
}

export class Runner {
  private projectRoot: string;
  private policyGuard: PolicyGuard;
  private store: LocalKanbanStore;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private cancellationTokens: Map<string, boolean> = new Map();

  constructor(projectRoot: string, policy: Policy, store: LocalKanbanStore) {
    this.projectRoot = path.resolve(projectRoot);
    this.policyGuard = new PolicyGuard(projectRoot, policy);
    this.store = store;
  }

  /**
   * Run a command with logging and timeout.
   */
  async run(options: RunOptions): Promise<RunResult> {
    const runId = options.runId || createRunId();
    const startTime = Date.now();

    // Validate command
    const validation = this.policyGuard.validateCommand(options.cmd);
    if (!validation.allowed) {
      return {
        success: false,
        exitCode: null,
        timedOut: false,
        logPath: '',
        metadataPath: '',
        error: validation.reason,
        durationMs: 0,
      };
    }

    // Validate and resolve cwd
    let cwd = this.projectRoot;
    if (options.cwd) {
      const cwdPath = path.isAbsolute(options.cwd)
        ? options.cwd
        : path.join(this.projectRoot, options.cwd);

      if (!cwdPath.startsWith(this.projectRoot)) {
        return {
          success: false,
          exitCode: null,
          timedOut: false,
          logPath: '',
          metadataPath: '',
          error: `CWD must be within project root: ${options.cwd}`,
          durationMs: 0,
        };
      }
      cwd = cwdPath;
    }

    // Ensure run directory exists
    const runDir = this.store.ensureCommandRunDir(options.taskId);
    const logPath = path.join(runDir, `${runId}.log`);
    const metadataPath = path.join(runDir, `${runId}.json`);

    // Create log stream
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    // Write header
    const header = `\n${'='.repeat(60)}\nCommand: ${options.cmd}\nCWD: ${cwd}\nStarted: ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`;
    logStream.write(header);

    // Parse command
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', options.cmd] : ['-c', options.cmd];

    // Merge environment
    const env = {
      ...process.env,
      ...options.env,
    };

    return new Promise<RunResult>((resolve) => {
      let timedOut = false;
      let exitCode: number | null = null;
      let timeoutHandle: NodeJS.Timeout | null = null;

      // Spawn process
      const proc = spawn(shell, shellArgs, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(runId, proc);
      this.cancellationTokens.set(runId, false);

      // Handle stdout
      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        logStream.write(text);
      });

      // Handle stderr
      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        logStream.write(`[STDERR] ${text}`);
      });

      // Handle timeout
      const timeoutMs = (options.timeoutSec || 120) * 1000;
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        logStream.write(`\n[TIMEOUT] Command exceeded ${options.timeoutSec || 120}s limit\n`);
        proc.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }, timeoutMs);

      // Handle process exit
      proc.on('close', (code) => {
        exitCode = code;

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        this.activeProcesses.delete(runId);
        this.cancellationTokens.delete(runId);

        const durationMs = Date.now() - startTime;

        // Write footer
        const footer = `\n${'='.repeat(60)}\nExit Code: ${exitCode}\nDuration: ${durationMs}ms\nTimed Out: ${timedOut}\nCompleted: ${new Date().toISOString()}\n${'='.repeat(60)}\n`;
        logStream.write(footer);
        logStream.end();

        // Write metadata
        const metadata: CommandRunMetadata = {
          runId,
          taskId: options.taskId,
          command: options.cmd,
          cwd,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          exitCode: exitCode ?? undefined,
          timedOut,
          logPath,
        };

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Log activity
        this.store.logActivity('command_executed', {
          command: options.cmd,
          exitCode,
          timedOut,
          durationMs,
        }, { taskId: options.taskId, runId });

        resolve({
          success: exitCode === 0 && !timedOut,
          exitCode,
          timedOut,
          logPath,
          metadataPath,
          durationMs,
        });
      });

      // Handle errors
      proc.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        this.activeProcesses.delete(runId);
        this.cancellationTokens.delete(runId);

        const durationMs = Date.now() - startTime;

        logStream.write(`\n[ERROR] ${error.message}\n`);
        logStream.end();

        resolve({
          success: false,
          exitCode: null,
          timedOut: false,
          logPath,
          metadataPath,
          error: error.message,
          durationMs,
        });
      });
    });
  }

  /**
   * Cancel a running command.
   */
  cancel(runId: string): boolean {
    const proc = this.activeProcesses.get(runId);
    if (proc) {
      this.cancellationTokens.set(runId, true);
      proc.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.activeProcesses.has(runId)) {
          proc.kill('SIGKILL');
        }
      }, 5000);

      return true;
    }
    return false;
  }

  /**
   * Check if a command is running.
   */
  isRunning(runId: string): boolean {
    return this.activeProcesses.has(runId);
  }

  /**
   * Get active process count.
   */
  getActiveCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Cancel all running processes.
   */
  cancelAll(): void {
    for (const [runId, proc] of this.activeProcesses) {
      this.cancellationTokens.set(runId, true);
      proc.kill('SIGTERM');
    }
  }

  /**
   * Read a run log file.
   */
  getRunLog(taskId: string, runId: string): string | null {
    const logPath = this.store.getCommandRunLogPath(taskId, runId);
    if (fs.existsSync(logPath)) {
      return fs.readFileSync(logPath, 'utf-8');
    }
    return null;
  }

  /**
   * Tail a run log file (last N lines).
   */
  tailRunLog(taskId: string, runId: string, lines: number = 50): string | null {
    const logPath = this.store.getCommandRunLogPath(taskId, runId);
    if (!fs.existsSync(logPath)) {
      return null;
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const allLines = content.split('\n');
    const tailLines = allLines.slice(-lines);
    return tailLines.join('\n');
  }

  /**
   * Get run metadata.
   */
  getRunMetadata(taskId: string, runId: string): CommandRunMetadata | null {
    const metadataPath = this.store.getCommandRunMetadataPath(taskId, runId);
    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  }
}
