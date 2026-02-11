/**
 * State Handlers
 *
 * IPC handlers for agent state and policy operations.
 */

import { ipcMain } from 'electron';
import { hasProject, getStore } from './shared';
import type { AgentState, Policy, ActivityEntry } from '../../../shared/types';

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

  ipcMain.handle('policy:update', async (_, policy: Policy): Promise<{ success: boolean; error?: string }> => {
    if (!hasProject()) return { success: false, error: 'No project open' };
    return getStore().savePolicy(policy);
  });

  ipcMain.handle('activity:getRecent', async (_, limit?: number): Promise<ActivityEntry[]> => {
    if (!hasProject()) return [];
    return getStore().getRecentActivity(limit);
  });
}
