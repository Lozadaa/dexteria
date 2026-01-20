/**
 * IPC Handlers Index
 *
 * Aggregates and initializes all IPC handlers from domain-specific modules.
 */

import { initializeProjectState, getOrCreateProvider } from './shared';
import { initThemeService } from '../../services/ThemeService';
import { initPluginManager } from '../../services/PluginManager';

// Import all domain handlers
import { registerBoardHandlers } from './boardHandlers';
import { registerTaskHandlers } from './taskHandlers';
import { registerStateHandlers } from './stateHandlers';
import { registerAgentHandlers } from './agentHandlers';
import { registerRunLogHandlers } from './runLogHandlers';
import { registerContextHandlers } from './contextHandlers';
import { registerChatHandlers } from './chatHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerProjectHandlers } from './projectHandlers';
import { registerThemeHandlers } from './themeHandlers';
import { registerPluginHandlers } from './pluginHandlers';
import { registerOpenCodeHandlers } from './opencodeHandlers';
import { registerVSCodeHandlers } from './vscodeHandlers';

// Re-export shared utilities for external use
export { getProjectRoot } from './shared';

// Re-export types
export type { ProviderType, RecentProject, ToolResult, HandlerState } from './types';

/**
 * Initialize all IPC handlers.
 * @param root - Optional project root path. If provided, initializes project-specific state.
 */
export async function initializeIpcHandlers(root?: string): Promise<void> {
  // Initialize global services (Theme and Plugins are stored in AppData, not per-project)
  try {
    const themeService = initThemeService();
    await themeService.init();
    console.log('[IPC] Theme service initialized (global)');
  } catch (err) {
    console.error('[IPC] Failed to init theme service:', err);
  }

  try {
    const pluginManager = initPluginManager();
    await pluginManager.init();
    console.log('[IPC] Plugin manager initialized (global)');
  } catch (err) {
    console.error('[IPC] Failed to init plugin manager:', err);
  }

  // Only initialize project if root is provided
  if (root) {
    await initializeProjectState(root);
  } else {
    // No project - just initialize provider
    getOrCreateProvider();
  }

  // Register all domain handlers (always register, even without project)
  registerBoardHandlers();
  registerTaskHandlers();
  registerStateHandlers();
  registerAgentHandlers();
  registerRunLogHandlers();
  registerContextHandlers();
  registerChatHandlers();
  registerSettingsHandlers();
  registerProjectHandlers();
  registerThemeHandlers();
  registerPluginHandlers();
  registerOpenCodeHandlers();
  registerVSCodeHandlers();
}
