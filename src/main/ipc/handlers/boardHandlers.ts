/**
 * Board Handlers
 *
 * IPC handlers for Kanban board operations.
 */

import { ipcMain } from 'electron';
import { hasProject, getStore } from './shared';
import type { Board } from '../../../shared/types';

/**
 * Register all board-related IPC handlers.
 */
export function registerBoardHandlers(): void {
  ipcMain.handle('board:get', async (): Promise<Board | null> => {
    if (!hasProject()) return null;
    return getStore().getBoard();
  });

  ipcMain.handle('board:save', async (_, board: Board): Promise<void> => {
    if (!hasProject()) return;
    getStore().saveBoard(board);
  });
}
