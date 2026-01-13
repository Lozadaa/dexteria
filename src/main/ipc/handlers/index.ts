/**
 * IPC Handlers Index
 *
 * Aggregates and initializes all IPC handlers from domain-specific modules.
 */

import { initializeProjectState, getOrCreateProvider } from './shared';

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

// Re-export shared utilities for external use
export { getProjectRoot } from './shared';

// Re-export types
export type { ProviderType, RecentProject, ToolResult, HandlerState } from './types';

/**
 * Initialize all IPC handlers.
 * @param root - Optional project root path. If provided, initializes project-specific state.
 */
export function initializeIpcHandlers(root?: string): void {
  // Only initialize project if root is provided
  if (root) {
    initializeProjectState(root);
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
}
