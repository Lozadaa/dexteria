/**
 * Update IPC Handlers
 *
 * Handlers for app update checking, downloading, and installation.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { AppUpdaterService } from '../../services/AppUpdaterService';
import type { AppUpdateProgress } from '../../../shared/types/update';

/**
 * Register update-related IPC handlers
 */
export function registerUpdateHandlers(): void {
  // Check for updates
  ipcMain.handle('update:check', async () => {
    try {
      return await AppUpdaterService.checkForUpdates();
    } catch (error) {
      console.error('[Update] Failed to check for updates:', error);
      return {
        updateAvailable: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Download update
  ipcMain.handle('update:download', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);

      const installerPath = await AppUpdaterService.downloadUpdate((progress: AppUpdateProgress) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('update:download-progress', progress);
        }
      });

      return { success: true, installerPath };
    } catch (error) {
      console.error('[Update] Download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Install update and restart
  ipcMain.handle('update:installAndRestart', async (_, installerPath: string) => {
    try {
      await AppUpdaterService.installUpdate(installerPath);
      return { success: true };
    } catch (error) {
      console.error('[Update] Installation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Skip version
  ipcMain.handle('update:skipVersion', async (_, version: string) => {
    try {
      AppUpdaterService.setUpdatePreferences({
        skipVersion: version,
      });
      return { success: true };
    } catch (error) {
      console.error('[Update] Failed to skip version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Get preferences
  ipcMain.handle('update:getPreferences', () => {
    try {
      return AppUpdaterService.getUpdatePreferences();
    } catch (error) {
      console.error('[Update] Failed to get preferences:', error);
      return null;
    }
  });

  // Set preferences
  ipcMain.handle('update:setPreferences', (_, prefs) => {
    try {
      AppUpdaterService.setUpdatePreferences(prefs);
      return { success: true };
    } catch (error) {
      console.error('[Update] Failed to set preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[IPC] Update handlers registered');
}
