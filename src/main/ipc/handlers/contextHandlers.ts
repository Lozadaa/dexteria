/**
 * Context Handlers
 *
 * IPC handlers for project context and repository index operations.
 */

import { ipcMain } from 'electron';
import { hasProject, getStore } from './shared';
import type { ProjectContext, RepoIndex } from '../../../shared/types';

/**
 * Register all context-related IPC handlers.
 */
export function registerContextHandlers(): void {
  ipcMain.handle('context:getProject', async (): Promise<ProjectContext | null> => {
    if (!hasProject()) return null;
    return getStore().getProjectContext();
  });

  ipcMain.handle('context:saveProject', async (_, context: ProjectContext): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveProjectContext(context);
  });

  ipcMain.handle('context:getRepoIndex', async (): Promise<RepoIndex | null> => {
    if (!hasProject()) return null;
    return getStore().getRepoIndex();
  });

  ipcMain.handle('context:saveRepoIndex', async (_, index: RepoIndex): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveRepoIndex(index);
  });
}
