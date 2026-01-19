/**
 * OpenCode IPC Handlers
 *
 * Handlers for OpenCode installation, updates, and status.
 */

import { ipcMain, BrowserWindow } from 'electron';
import {
  OpenCodeInstaller,
  OpenCodeInstallProgress,
} from '../../services/OpenCodeInstaller';

/**
 * Register OpenCode-related IPC handlers.
 */
export function registerOpenCodeHandlers(): void {
  // Check if OpenCode is installed
  ipcMain.handle('opencode:isInstalled', () => {
    return OpenCodeInstaller.isInstalled();
  });

  // Get OpenCode binary path
  ipcMain.handle('opencode:getBinaryPath', () => {
    return OpenCodeInstaller.getBinaryPath();
  });

  // Get installed version
  ipcMain.handle('opencode:getVersion', () => {
    return OpenCodeInstaller.getInstalledVersion();
  });

  // Get latest release info
  ipcMain.handle('opencode:getLatestRelease', async () => {
    try {
      return await OpenCodeInstaller.getLatestReleaseInfo();
    } catch (error) {
      console.error('[OpenCode] Failed to get latest release:', error);
      return null;
    }
  });

  // Check for updates
  ipcMain.handle('opencode:checkUpdates', async () => {
    try {
      return await OpenCodeInstaller.checkForUpdates();
    } catch (error) {
      console.error('[OpenCode] Failed to check updates:', error);
      return {
        updateAvailable: false,
        currentVersion: OpenCodeInstaller.getInstalledVersion(),
        latestVersion: 'unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Install OpenCode
  ipcMain.handle('opencode:install', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);

      await OpenCodeInstaller.install((progress: OpenCodeInstallProgress) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('opencode:install-progress', progress);
        }
      });

      return { success: true, version: OpenCodeInstaller.getInstalledVersion() };
    } catch (error) {
      console.error('[OpenCode] Installation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Update OpenCode
  ipcMain.handle('opencode:update', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);

      await OpenCodeInstaller.update((progress: OpenCodeInstallProgress) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('opencode:install-progress', progress);
        }
      });

      return { success: true, version: OpenCodeInstaller.getInstalledVersion() };
    } catch (error) {
      console.error('[OpenCode] Update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Uninstall OpenCode
  ipcMain.handle('opencode:uninstall', async () => {
    try {
      await OpenCodeInstaller.uninstall();
      return { success: true };
    } catch (error) {
      console.error('[OpenCode] Uninstall failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[IPC] OpenCode handlers registered');
}
