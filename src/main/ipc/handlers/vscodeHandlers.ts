/**
 * VSCode Handlers
 *
 * IPC handlers for VSCode integration.
 */

import { ipcMain } from 'electron';
import { getProjectRoot } from './shared';
import { initVSCodeService, getVSCodeService } from '../../services/VSCodeService';

/**
 * Register all VSCode-related IPC handlers.
 */
export function registerVSCodeHandlers(): void {
  // Initialize the VSCode service
  initVSCodeService();

  // Check if VSCode is installed
  ipcMain.handle('vscode:isInstalled', async (): Promise<boolean> => {
    const service = getVSCodeService();
    if (!service) return false;
    return service.isInstalled();
  });

  // Get VSCode status (installed, path, version)
  ipcMain.handle('vscode:getStatus', async (): Promise<{
    installed: boolean;
    path: string | null;
    version: string | null;
  }> => {
    const service = getVSCodeService();
    if (!service) {
      return { installed: false, path: null, version: null };
    }
    return service.getStatus();
  });

  // Clear cache and re-check VSCode status
  ipcMain.handle('vscode:refresh', async (): Promise<{
    installed: boolean;
    path: string | null;
    version: string | null;
  }> => {
    const service = getVSCodeService();
    if (!service) {
      return { installed: false, path: null, version: null };
    }
    return service.refresh();
  });

  // Open current project in VSCode
  ipcMain.handle('vscode:openProject', async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const service = getVSCodeService();
    if (!service) {
      return { success: false, error: 'VSCode service not initialized' };
    }

    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      return { success: false, error: 'No project open' };
    }

    return service.openFolder(projectRoot);
  });

  // Open a specific folder in VSCode
  ipcMain.handle('vscode:openFolder', async (_, folderPath: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const service = getVSCodeService();
    if (!service) {
      return { success: false, error: 'VSCode service not initialized' };
    }
    return service.openFolder(folderPath);
  });

  // Open a specific file in VSCode
  ipcMain.handle('vscode:openFile', async (_, filePath: string, line?: number): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const service = getVSCodeService();
    if (!service) {
      return { success: false, error: 'VSCode service not initialized' };
    }
    return service.openFile(filePath, line);
  });

  // Get download URL for VSCode
  ipcMain.handle('vscode:getDownloadUrl', async (): Promise<string> => {
    const service = getVSCodeService();
    if (!service) {
      return 'https://code.visualstudio.com/download';
    }
    return service.getDownloadUrl();
  });

  // Open VSCode download page in browser
  ipcMain.handle('vscode:openDownloadPage', async (): Promise<void> => {
    const service = getVSCodeService();
    if (service) {
      await service.openDownloadPage();
    }
  });
}
