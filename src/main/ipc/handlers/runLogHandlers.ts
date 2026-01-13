/**
 * Run Log Handlers
 *
 * IPC handlers for agent run log operations.
 */

import { ipcMain } from 'electron';
import { getRunner } from './shared';

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
}
