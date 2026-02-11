/**
 * Run Log Handlers
 *
 * IPC handlers for agent run log operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ipcMain } from 'electron';
import { getRunner, getProjectRoot } from './shared';
import type { AgentRun } from '../../../shared/types';

/**
 * List all runs for a specific task.
 * Reads directly from .local-kanban/agent-runs/<taskId>/
 */
function listRunsForTask(projectRoot: string, taskId: string): AgentRun[] {
  const runDir = path.join(projectRoot, '.local-kanban', 'agent-runs', taskId);

  if (!fs.existsSync(runDir)) {
    return [];
  }

  const files = fs.readdirSync(runDir).filter(f => f.endsWith('.json'));
  const runs: AgentRun[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(runDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const run = JSON.parse(content) as AgentRun;
      runs.push(run);
    } catch (err) {
      console.error(`Failed to parse run file ${file}:`, err);
    }
  }

  // Sort by start time descending (most recent first)
  runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return runs;
}

/**
 * List all runs across all tasks.
 * Returns runs grouped by taskId.
 */
function listAllRuns(projectRoot: string): { taskId: string; runs: AgentRun[] }[] {
  const agentRunsDir = path.join(projectRoot, '.local-kanban', 'agent-runs');

  if (!fs.existsSync(agentRunsDir)) {
    return [];
  }

  const taskDirs = fs.readdirSync(agentRunsDir).filter(d => {
    const stat = fs.statSync(path.join(agentRunsDir, d));
    return stat.isDirectory();
  });

  const result: { taskId: string; runs: AgentRun[] }[] = [];

  for (const taskId of taskDirs) {
    const runs = listRunsForTask(projectRoot, taskId);
    if (runs.length > 0) {
      result.push({ taskId, runs });
    }
  }

  // Sort by most recent run across all tasks
  result.sort((a, b) => {
    const aLatest = a.runs[0]?.startedAt || '';
    const bLatest = b.runs[0]?.startedAt || '';
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });

  return result;
}

/**
 * Register all run log-related IPC handlers.
 */
export function registerRunLogHandlers(): void {
  ipcMain.handle('runs:getLog', async (_, taskId: string, runId: string): Promise<string | null> => {
    return getRunner()?.getRunLog(taskId, runId) || null;
  });

  ipcMain.handle('runs:tailLog', async (_, taskId: string, runId: string, lines?: number): Promise<string | null> => {
    return getRunner()?.tailRunLog(taskId, runId, lines) || null;
  });

  ipcMain.handle('runs:getMetadata', async (_, taskId: string, runId: string): Promise<unknown> => {
    return getRunner()?.getRunMetadata(taskId, runId) || null;
  });

  // List all runs for a specific task
  ipcMain.handle('runs:list', async (_, taskId: string): Promise<AgentRun[]> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) return [];
    return listRunsForTask(projectRoot, taskId);
  });

  // List all runs across all tasks
  ipcMain.handle('runs:listAll', async (): Promise<{ taskId: string; runs: AgentRun[] }[]> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) return [];
    return listAllRuns(projectRoot);
  });
}
