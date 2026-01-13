/**
 * ProjectProcessManager
 *
 * Manages project run and build processes with logging.
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { getStore } from './LocalKanbanStore';
import { getEffectiveCommand } from './ProjectCommandDetector';
import type { ProjectProcessStatus, ProjectRunResult, ProjectProcessType } from '../../shared/types';

interface RunningProcess {
  type: ProjectProcessType;
  process: ChildProcess;
  runId: string;
  startedAt: string;
  command: string;
  logPath: string;
  logStream: fs.WriteStream;
}

let runningProcesses: Map<ProjectProcessType, RunningProcess> = new Map();
let mainWindow: BrowserWindow | null = null;

/**
 * Set the main window for sending updates.
 */
export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

/**
 * Generate a unique run ID.
 */
function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Send process status update to renderer.
 */
function sendStatusUpdate(status: ProjectProcessStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('project:status-update', status);
  }
}

/**
 * Send process output to renderer.
 */
function sendOutput(type: ProjectProcessType, runId: string, data: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('project:output', { type, runId, data });
  }
}

/**
 * Validate that the cwd is inside the project root.
 */
function validateCwd(projectRoot: string, cwd: string): string {
  const resolvedCwd = path.resolve(projectRoot, cwd);

  // Ensure cwd is inside project root
  if (!resolvedCwd.startsWith(projectRoot)) {
    throw new Error(`Invalid working directory: ${cwd} is outside project root`);
  }

  return resolvedCwd;
}

/**
 * Check if a command is potentially unsafe.
 */
function isUnsafeCommand(command: string): boolean {
  const unsafePatterns = [
    /rm\s+-rf\s+[\/\\]/i,
    /del\s+\/[sf]/i,
    /format\s+/i,
    /mkfs/i,
    /dd\s+if=/i,
    />\s*\/dev\//i,
    /sudo\s+rm/i,
  ];

  return unsafePatterns.some(pattern => pattern.test(command));
}

/**
 * Start a project process (run or build).
 */
export async function startProcess(
  type: ProjectProcessType,
  projectRoot: string
): Promise<ProjectRunResult> {
  const store = getStore();
  const settings = store.getSettings();

  // Check if already running
  if (runningProcesses.has(type)) {
    return {
      runId: '',
      success: false,
      logPath: '',
      error: `${type} process is already running`,
    };
  }

  // Get the command
  const cmdConfig = type === 'run' ? settings.projectCommands.run : settings.projectCommands.build;
  const command = getEffectiveCommand(
    projectRoot,
    type,
    cmdConfig.cmd,
    cmdConfig.autoDetect ?? true
  );

  if (!command) {
    return {
      runId: '',
      success: false,
      logPath: '',
      error: `No ${type} command configured. Please configure in Settings.`,
    };
  }

  // Check for unsafe commands
  if (isUnsafeCommand(command) && !settings.projectCommands.allowUnsafeCommands) {
    return {
      runId: '',
      success: false,
      logPath: '',
      error: `Command "${command}" appears unsafe. Enable "Allow Unsafe Commands" in Settings to proceed.`,
    };
  }

  // Validate and resolve cwd
  let cwd: string;
  try {
    cwd = validateCwd(projectRoot, cmdConfig.cwd || '.');
  } catch (error) {
    return {
      runId: '',
      success: false,
      logPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Generate run ID and setup logging
  const runId = generateRunId();
  const logPath = store.getProjectRunLogPath(runId);
  const metadataPath = store.getProjectRunMetadataPath(runId);

  // Create log file
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.write(`=== ${type.toUpperCase()} STARTED ===\n`);
  logStream.write(`Command: ${command}\n`);
  logStream.write(`CWD: ${cwd}\n`);
  logStream.write(`Time: ${new Date().toISOString()}\n`);
  logStream.write(`${'='.repeat(40)}\n\n`);

  console.log(`[ProcessManager] Starting ${type}: ${command} in ${cwd}`);

  return new Promise((resolve) => {
    try {
      const proc = spawn(command, [], {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      const startedAt = new Date().toISOString();

      const runningProc: RunningProcess = {
        type,
        process: proc,
        runId,
        startedAt,
        command,
        logPath,
        logStream,
      };

      runningProcesses.set(type, runningProc);

      // Send initial status
      sendStatusUpdate({
        type,
        running: true,
        pid: proc.pid,
        runId,
        startedAt,
        command,
      });

      // Handle stdout
      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        logStream.write(text);
        sendOutput(type, runId, text);
      });

      // Handle stderr
      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        logStream.write(text);
        sendOutput(type, runId, text);
      });

      // Handle process exit
      proc.on('close', (code) => {
        logStream.write(`\n${'='.repeat(40)}\n`);
        logStream.write(`=== ${type.toUpperCase()} FINISHED ===\n`);
        logStream.write(`Exit code: ${code}\n`);
        logStream.write(`Time: ${new Date().toISOString()}\n`);
        logStream.end();

        // Save metadata
        const metadata = {
          runId,
          type,
          command,
          cwd,
          startedAt,
          completedAt: new Date().toISOString(),
          exitCode: code,
          logPath,
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        runningProcesses.delete(type);

        // Send final status
        sendStatusUpdate({
          type,
          running: false,
          runId,
        });

        resolve({
          runId,
          success: code === 0,
          exitCode: code ?? undefined,
          logPath,
        });
      });

      // Handle process error
      proc.on('error', (error) => {
        logStream.write(`\n${'='.repeat(40)}\n`);
        logStream.write(`=== ${type.toUpperCase()} ERROR ===\n`);
        logStream.write(`Error: ${error.message}\n`);
        logStream.end();

        runningProcesses.delete(type);

        sendStatusUpdate({
          type,
          running: false,
          runId,
        });

        resolve({
          runId,
          success: false,
          logPath,
          error: error.message,
        });
      });

      // For run command, resolve immediately as it's a long-running process
      if (type === 'run') {
        resolve({
          runId,
          success: true,
          logPath,
        });
      }
    } catch (error) {
      logStream.end();
      resolve({
        runId,
        success: false,
        logPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Stop a running process.
 */
export function stopProcess(type: ProjectProcessType): boolean {
  const running = runningProcesses.get(type);
  if (!running) {
    return false;
  }

  console.log(`[ProcessManager] Stopping ${type} process (PID: ${running.process.pid})`);

  try {
    // On Windows, we need to kill the process tree
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(running.process.pid), '/f', '/t'], { shell: true });
    } else {
      running.process.kill('SIGTERM');
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (running.process.killed === false) {
          running.process.kill('SIGKILL');
        }
      }, 5000);
    }

    running.logStream.write('\n=== PROCESS STOPPED BY USER ===\n');
    return true;
  } catch (error) {
    console.error(`[ProcessManager] Failed to stop ${type}:`, error);
    return false;
  }
}

/**
 * Get the status of a process.
 */
export function getProcessStatus(type: ProjectProcessType): ProjectProcessStatus {
  const running = runningProcesses.get(type);

  if (!running) {
    return {
      type,
      running: false,
    };
  }

  return {
    type,
    running: true,
    pid: running.process.pid,
    runId: running.runId,
    startedAt: running.startedAt,
    command: running.command,
  };
}

/**
 * Get status of all processes.
 */
export function getAllProcessStatus(): ProjectProcessStatus[] {
  return [
    getProcessStatus('run'),
    getProcessStatus('build'),
  ];
}

/**
 * Start the run process.
 */
export function startRun(projectRoot: string): Promise<ProjectRunResult> {
  return startProcess('run', projectRoot);
}

/**
 * Stop the run process.
 */
export function stopRun(): boolean {
  return stopProcess('run');
}

/**
 * Start the build process.
 */
export function startBuild(projectRoot: string): Promise<ProjectRunResult> {
  return startProcess('build', projectRoot);
}

/**
 * Stop the build process.
 */
export function stopBuild(): boolean {
  return stopProcess('build');
}

/**
 * Check if a process is running.
 */
export function isProcessRunning(type: ProjectProcessType): boolean {
  return runningProcesses.has(type);
}
