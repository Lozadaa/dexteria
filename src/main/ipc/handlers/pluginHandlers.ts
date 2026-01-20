/**
 * Plugin Handlers
 *
 * IPC handlers for plugin management operations.
 */

import { ipcMain } from 'electron';
import { getPluginManager } from '../../services/PluginManager';
import type { PluginInfo, PluginTab, PluginContextMenuItem, UIContributions } from '../../../shared/types';

/**
 * Register all plugin-related IPC handlers.
 */
export function registerPluginHandlers(): void {
  // Get all plugins
  ipcMain.handle('plugin:getAll', async (): Promise<PluginInfo[]> => {
    const manager = getPluginManager();
    if (!manager) {
      return [];
    }
    return manager.getPlugins();
  });

  // Get a specific plugin
  ipcMain.handle('plugin:get', async (_, pluginId: string): Promise<PluginInfo | null> => {
    const manager = getPluginManager();
    if (!manager) {
      return null;
    }
    return manager.getPlugin(pluginId);
  });

  // Enable a plugin
  ipcMain.handle('plugin:enable', async (_, pluginId: string): Promise<{ success: boolean; error?: string }> => {
    const manager = getPluginManager();
    if (!manager) {
      return { success: false, error: 'Plugin manager not initialized' };
    }

    const success = await manager.enablePlugin(pluginId);

    if (!success) {
      // Get the plugin to retrieve the error
      const plugin = manager.getPlugin(pluginId);
      return {
        success: false,
        error: plugin?.error || 'Unknown error activating plugin',
      };
    }

    return { success: true };
  });

  // Disable a plugin
  ipcMain.handle('plugin:disable', async (_, pluginId: string): Promise<{ success: boolean; error?: string }> => {
    const manager = getPluginManager();
    if (!manager) {
      return { success: false, error: 'Plugin manager not initialized' };
    }

    const success = await manager.disablePlugin(pluginId);

    if (!success) {
      return { success: false, error: 'Failed to disable plugin' };
    }

    return { success: true };
  });

  // Get plugin settings
  ipcMain.handle('plugin:getSettings', async (_, pluginId: string): Promise<Record<string, unknown>> => {
    const manager = getPluginManager();
    if (!manager) {
      return {};
    }
    return manager.getPluginSettings(pluginId);
  });

  // Set plugin settings
  ipcMain.handle('plugin:setSettings', async (_, pluginId: string, settings: Record<string, unknown>): Promise<void> => {
    const manager = getPluginManager();
    if (!manager) {
      return;
    }
    manager.setPluginSettings(pluginId, settings);
  });

  // ============================================
  // UI Extension Handlers
  // ============================================

  // Get all plugin tabs
  ipcMain.handle('plugin:getTabs', async (): Promise<PluginTab[]> => {
    const manager = getPluginManager();
    if (!manager) {
      return [];
    }
    return manager.getTabs();
  });

  // Get tabs by position
  ipcMain.handle('plugin:getTabsByPosition', async (_, position: 'left' | 'right' | 'bottom'): Promise<PluginTab[]> => {
    const manager = getPluginManager();
    if (!manager) {
      return [];
    }
    return manager.getTabsByPosition(position);
  });

  // Get all context menu items
  ipcMain.handle('plugin:getContextMenuItems', async (): Promise<PluginContextMenuItem[]> => {
    const manager = getPluginManager();
    if (!manager) {
      return [];
    }
    return manager.getContextMenuItems();
  });

  // Get context menu items by location
  ipcMain.handle('plugin:getContextMenuItemsByLocation', async (_, location: 'task' | 'board' | 'column'): Promise<PluginContextMenuItem[]> => {
    const manager = getPluginManager();
    if (!manager) {
      return [];
    }
    return manager.getContextMenuItemsByLocation(location);
  });

  // Execute a context menu item
  ipcMain.handle('plugin:executeContextMenuItem', async (_, itemId: string, context: unknown): Promise<void> => {
    const manager = getPluginManager();
    if (!manager) {
      return;
    }
    await manager.executeContextMenuItem(itemId, context);
  });

  // Get all UI contributions from active plugins
  ipcMain.handle('plugin:getUIContributions', async (): Promise<UIContributions> => {
    const manager = getPluginManager();
    if (!manager) {
      return {
        settingsTabs: [],
        dockingPanels: [],
        slots: {
          'settings:tab': [],
          'docking:panel': [],
          'topbar:left': [],
          'topbar:right': [],
          'task-detail:sidebar': [],
          'task-detail:footer': [],
          'task-card:badge': [],
          'bottom-panel:tab': [],
        },
      };
    }
    return manager.getUIContributions();
  });

  // Call a plugin's API method
  ipcMain.handle('plugin:callApi', async (_, pluginId: string, methodName: string, ...args: unknown[]): Promise<unknown> => {
    const manager = getPluginManager();
    if (!manager) {
      throw new Error('Plugin manager not initialized');
    }

    const plugin = manager.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state !== 'active') {
      throw new Error(`Plugin ${pluginId} is not active`);
    }

    return manager.callPluginAPI(pluginId, methodName, ...args);
  });
}
