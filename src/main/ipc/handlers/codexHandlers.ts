/**
 * Codex CLI IPC Handlers
 *
 * Handlers for Codex CLI installation, updates, and status.
 */

import { ipcMain, BrowserWindow } from 'electron';
import {
  CodexInstaller,
  CodexInstallProgress,
} from '../../services/CodexInstaller';

/**
 * Register Codex-related IPC handlers.
 */
export function registerCodexHandlers(): void {
  // Check if Codex CLI is installed
  ipcMain.handle('codex:isInstalled', () => {
    return CodexInstaller.isInstalled();
  });

  // Get installed version
  ipcMain.handle('codex:getVersion', () => {
    return CodexInstaller.getInstalledVersion();
  });

  // Check if npm is available
  ipcMain.handle('codex:isNpmAvailable', () => {
    return CodexInstaller.isNpmAvailable();
  });

  // Install Codex CLI
  ipcMain.handle('codex:install', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);

      await CodexInstaller.install((progress: CodexInstallProgress) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('codex:install-progress', progress);
        }
      });

      return { success: true, version: CodexInstaller.getInstalledVersion() };
    } catch (error) {
      console.error('[Codex] Installation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Update Codex CLI
  ipcMain.handle('codex:update', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);

      await CodexInstaller.update((progress: CodexInstallProgress) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('codex:install-progress', progress);
        }
      });

      return { success: true, version: CodexInstaller.getInstalledVersion() };
    } catch (error) {
      console.error('[Codex] Update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Uninstall Codex CLI
  ipcMain.handle('codex:uninstall', async () => {
    try {
      await CodexInstaller.uninstall();
      return { success: true };
    } catch (error) {
      console.error('[Codex] Uninstall failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[IPC] Codex handlers registered');
}
