/**
 * Theme Handlers
 *
 * IPC handlers for theme management operations.
 */

import { ipcMain, BrowserWindow, shell } from 'electron';
import { getThemeService } from '../../services/ThemeService';
import type { CustomTheme, ThemeIndex } from '../../../shared/types';

/**
 * Register all theme-related IPC handlers
 */
export function registerThemeHandlers(): void {
  // Get all available themes
  ipcMain.handle('theme:getAll', async (): Promise<ThemeIndex['themes']> => {
    const service = getThemeService();
    if (!service) return [];
    return service.getThemes();
  });

  // Get the currently active theme
  ipcMain.handle('theme:getActive', async (): Promise<CustomTheme | null> => {
    const service = getThemeService();
    if (!service) return null;
    return service.getActiveTheme();
  });

  // Load a specific theme by ID
  ipcMain.handle('theme:load', async (_, themeId: string): Promise<CustomTheme | null> => {
    const service = getThemeService();
    if (!service) return null;
    return service.loadTheme(themeId);
  });

  // Set the active theme
  ipcMain.handle('theme:setActive', async (_event, themeId: string): Promise<{ success: boolean; theme?: CustomTheme; css?: string }> => {
    const service = getThemeService();
    if (!service) return { success: false };

    const theme = await service.setActiveTheme(themeId);
    if (!theme) return { success: false };

    // Generate CSS (single set of variables - no more light/dark modes)
    const css = service.generateCSSVariables(theme);

    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme:changed', { theme, css });
    });

    return { success: true, theme, css };
  });

  // Save a theme
  ipcMain.handle('theme:save', async (_event, theme: CustomTheme): Promise<{ success: boolean }> => {
    const service = getThemeService();
    if (!service) return { success: false };

    try {
      await service.saveTheme(theme);

      // If this is the active theme, broadcast the change
      const activeTheme = service.getActiveTheme();
      if (activeTheme && activeTheme.id === theme.id) {
        const css = service.generateCSSVariables(theme);
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('theme:changed', { theme, css });
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to save theme:', err);
      return { success: false };
    }
  });

  // Create a new theme
  ipcMain.handle('theme:create', async (_, name: string, baseThemeId?: string): Promise<CustomTheme | null> => {
    const service = getThemeService();
    if (!service) return null;

    try {
      return await service.createTheme(name, baseThemeId);
    } catch (err) {
      console.error('Failed to create theme:', err);
      return null;
    }
  });

  // Delete a theme
  ipcMain.handle('theme:delete', async (_, themeId: string): Promise<boolean> => {
    const service = getThemeService();
    if (!service) return false;
    return service.deleteTheme(themeId);
  });

  // Import a theme from JSON
  ipcMain.handle('theme:import', async (_, jsonString: string): Promise<CustomTheme | null> => {
    const service = getThemeService();
    if (!service) return null;

    try {
      return await service.importTheme(jsonString);
    } catch (err) {
      console.error('Failed to import theme:', err);
      return null;
    }
  });

  // Export a theme as JSON
  ipcMain.handle('theme:export', async (_, themeId: string): Promise<string | null> => {
    const service = getThemeService();
    if (!service) return null;
    return service.exportTheme(themeId);
  });

  // Get the file path for a theme (for external editor)
  ipcMain.handle('theme:getFilePath', async (_, themeId: string): Promise<string | null> => {
    const service = getThemeService();
    if (!service) return null;
    return service.getThemeFilePath(themeId);
  });

  // Open theme file in external editor
  ipcMain.handle('theme:openInEditor', async (_, themeId: string): Promise<boolean> => {
    const service = getThemeService();
    if (!service) return false;

    const filePath = service.getThemeFilePath(themeId);
    if (!filePath) return false;

    try {
      await shell.openPath(filePath);
      return true;
    } catch (err) {
      console.error('Failed to open theme in editor:', err);
      return false;
    }
  });

  // Get CSS variables for a theme (returns single CSS string)
  ipcMain.handle('theme:getCSS', async (_, themeId: string): Promise<string | null> => {
    const service = getThemeService();
    if (!service) return null;

    const theme = await service.loadTheme(themeId);
    if (!theme) return null;

    return service.generateCSSVariables(theme);
  });
}
