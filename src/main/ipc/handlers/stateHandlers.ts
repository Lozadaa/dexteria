/**
 * State Handlers
 *
 * IPC handlers for agent state and policy operations.
 */

import { ipcMain } from 'electron';
import { hasProject, getStore } from './shared';
import type { AgentState, Policy } from '../../../shared/types';

/**
 * Register all state-related IPC handlers.
 */
export function registerStateHandlers(): void {
  ipcMain.handle('state:get', async (): Promise<AgentState | null> => {
    if (!hasProject()) return null;
    return getStore().getState();
  });

  ipcMain.handle('state:set', async (_, patch: Partial<AgentState>): Promise<AgentState | null> => {
    if (!hasProject()) return null;
    return getStore().setState(patch);
  });

  ipcMain.handle('policy:get', async (): Promise<Policy | null> => {
    if (!hasProject()) return null;
    return getStore().getPolicy();
  });
}
