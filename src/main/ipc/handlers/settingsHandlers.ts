/**
 * Settings Handlers
 *
 * IPC handlers for application settings and provider configuration.
 */

import { ipcMain } from 'electron';
import {
  getOrCreateProvider,
  getAgentProvider,
  setAgentProvider,
  getStore,
  getProjectRoot,
  hasProject,
  ClaudeCodeProvider,
  AnthropicProvider,
  MockAgentProvider,
} from './shared';
import { detectProjectCommands, getEffectiveCommand } from '../../services/ProjectCommandDetector';
import type { ProviderType } from './types';
import type { ProjectSettings, DetectedCommands } from '../../../shared/types';

/**
 * Register all settings-related IPC handlers.
 */
export function registerSettingsHandlers(): void {
  // Get current provider info
  ipcMain.handle('settings:getProvider', async (): Promise<{
    name: string;
    ready: boolean;
    type: ProviderType;
  }> => {
    const provider = getOrCreateProvider();
    let type: ProviderType = 'mock';
    if (provider instanceof ClaudeCodeProvider) {
      type = 'claude-code';
    } else if (provider instanceof AnthropicProvider) {
      type = 'anthropic';
    }
    return {
      name: provider.getName(),
      ready: provider.isReady(),
      type,
    };
  });

  // Set API key and switch to Anthropic provider
  ipcMain.handle('settings:setApiKey', async (_, apiKey: string): Promise<{
    success: boolean;
    provider: string;
    error?: string;
  }> => {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        // Clear API key and switch to mock
        setAgentProvider(new MockAgentProvider());
        return {
          success: true,
          provider: 'MockProvider',
        };
      }

      // Create new Anthropic provider with the key
      const newProvider = new AnthropicProvider({ apiKey: apiKey.trim() });

      if (!newProvider.isReady()) {
        return {
          success: false,
          provider: getAgentProvider()?.getName() || 'Unknown',
          error: 'Failed to initialize Anthropic provider',
        };
      }

      setAgentProvider(newProvider);

      // Note: Ralph engine only works with ClaudeCodeProvider,
      // so it won't be updated when switching to Anthropic provider

      return {
        success: true,
        provider: newProvider.getName(),
      };
    } catch (error) {
      return {
        success: false,
        provider: getAgentProvider()?.getName() || 'Unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Test current provider connection
  ipcMain.handle('settings:testProvider', async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const provider = getOrCreateProvider();

      if (!provider.isReady()) {
        return {
          success: false,
          message: 'Provider not ready. Please configure an API key.',
        };
      }

      // Simple test call
      const response = await provider.complete([
        { role: 'user', content: 'Say "OK" if you can hear me.' }
      ]);

      if (response.finishReason === 'error') {
        return {
          success: false,
          message: response.content,
        };
      }

      return {
        success: true,
        message: `Provider working: ${response.content.substring(0, 100)}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // ============================================
  // Project Settings
  // ============================================

  // Get project settings
  ipcMain.handle('settings:getProject', async (): Promise<ProjectSettings | null> => {
    if (!hasProject()) return null;
    return getStore().getSettings();
  });

  // Save project settings
  ipcMain.handle('settings:saveProject', async (_, settings: ProjectSettings): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!hasProject()) {
      return { success: false, error: 'No project open' };
    }

    try {
      getStore().saveSettings(settings);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Update project settings (partial)
  ipcMain.handle('settings:updateProject', async (_, patch: Partial<ProjectSettings>): Promise<{
    success: boolean;
    settings?: ProjectSettings;
    error?: string;
  }> => {
    if (!hasProject()) {
      return { success: false, error: 'No project open' };
    }

    try {
      const updated = getStore().updateSettings(patch);
      return { success: true, settings: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Detect project commands
  ipcMain.handle('settings:detectCommands', async (): Promise<DetectedCommands> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) return {};
    return detectProjectCommands(projectRoot);
  });

  // Get effective command (combines settings + auto-detect)
  ipcMain.handle('settings:getEffectiveCommand', async (_, type: 'run' | 'build' | 'install'): Promise<string> => {
    const projectRoot = getProjectRoot();
    if (!projectRoot || !hasProject()) return '';

    const settings = getStore().getSettings();
    const cmdConfig = settings.projectCommands[type];

    return getEffectiveCommand(
      projectRoot,
      type,
      cmdConfig.cmd,
      cmdConfig.autoDetect ?? true
    );
  });
}
