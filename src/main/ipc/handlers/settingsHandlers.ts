/**
 * Settings Handlers
 *
 * IPC handlers for application settings and provider configuration.
 */

import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  getOrCreateProvider,
  getAgentProvider,
  setAgentProvider,
  getStore,
  getProjectRoot,
  hasProject,
  OpenCodeProvider,
  ClaudeCodeProvider,
  CodexProvider,
  AnthropicProvider,
  MockAgentProvider,
} from './shared';
import { OpenCodeInstaller } from '../../services/OpenCodeInstaller';
import { playPresetSoundTest } from '../../services/NotificationService';
import type { NotificationSound, CustomTheme } from '../../../shared/types';
import { detectProjectCommands, getEffectiveCommand } from '../../services/ProjectCommandDetector';
import type { ProviderType } from './types';
import type { ProjectSettings, DetectedCommands } from '../../../shared/types';

/**
 * Get the path to the assets/themes folder
 */
function getPresetsThemesDir(): string {
  const isDev = !app.isPackaged;
  return isDev
    ? path.join(process.cwd(), 'assets', 'themes')
    : path.join(process.resourcesPath, 'assets', 'themes');
}

// ============================================
// Global App Config (AppData)
// ============================================

interface GlobalAppConfig {
  hasCompletedSetup: boolean;
  setupCompletedAt?: string;
  wantsCodeViewing?: boolean;
  vscodePreferenceSetAt?: string;
  selectedProvider?: ProviderType;
}

/**
 * Get path to global app config file in AppData
 */
function getGlobalConfigPath(): string {
  return path.join(app.getPath('userData'), 'dexteria-config.json');
}

/**
 * Read global app config
 */
function readGlobalConfig(): GlobalAppConfig {
  const configPath = getGlobalConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data) as GlobalAppConfig;
    }
  } catch (err) {
    console.error('Failed to read global config:', err);
  }
  return { hasCompletedSetup: false };
}

/**
 * Write global app config
 */
function writeGlobalConfig(config: GlobalAppConfig): void {
  const configPath = getGlobalConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write global config:', err);
  }
}

/**
 * Preset theme info for the wizard
 */
export interface PresetThemeInfo {
  id: string;
  name: string;
  description?: string;
  preview: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
}

/**
 * Register all settings-related IPC handlers.
 */
export function registerSettingsHandlers(): void {
  // Get current provider info
  // Returns ready: false if setup hasn't been completed, even if a provider is available
  ipcMain.handle('settings:getProvider', async (): Promise<{
    name: string;
    ready: boolean;
    providerReady: boolean;
    type: ProviderType;
    hasCompletedSetup: boolean;
  }> => {
    const globalConfig = readGlobalConfig();
    const provider = getOrCreateProvider();
    let type: ProviderType = 'mock';
    if (provider instanceof OpenCodeProvider) {
      type = 'opencode';
    } else if (provider instanceof CodexProvider) {
      type = 'codex';
    } else if (provider instanceof ClaudeCodeProvider) {
      type = 'claude-code';
    } else if (provider instanceof AnthropicProvider) {
      type = 'anthropic';
    }

    // providerReady: just the provider itself (for setup wizard)
    const providerReady = provider.isReady();
    // ready: provider is ready AND setup has been completed (for normal app usage)
    const isReady = providerReady && globalConfig.hasCompletedSetup;

    return {
      name: provider.getName(),
      ready: isReady,
      providerReady,
      type,
      hasCompletedSetup: globalConfig.hasCompletedSetup,
    };
  });

  // Mark setup as completed (called when user finishes the setup wizard)
  ipcMain.handle('settings:completeSetup', async (): Promise<{ success: boolean }> => {
    const config = readGlobalConfig();
    config.hasCompletedSetup = true;
    config.setupCompletedAt = new Date().toISOString();
    writeGlobalConfig(config);
    return { success: true };
  });

  // Reset setup flag (for testing purposes - allows re-showing the wizard)
  ipcMain.handle('settings:resetSetup', async (): Promise<{ success: boolean }> => {
    const config = readGlobalConfig();
    config.hasCompletedSetup = false;
    config.setupCompletedAt = undefined;
    writeGlobalConfig(config);
    return { success: true };
  });

  // Clear all settings and data - shows setup wizard on next launch
  ipcMain.handle('settings:clearAllData', async (): Promise<{ success: boolean }> => {
    try {
      // Reset global config
      writeGlobalConfig({ hasCompletedSetup: false });

      // Clear localStorage will be done by renderer before reload
      return { success: true };
    } catch (err) {
      console.error('Failed to clear settings:', err);
      return { success: false };
    }
  });

  // Get VSCode preference (for code viewing integration)
  ipcMain.handle('settings:getVSCodePreference', async (): Promise<{
    wantsCodeViewing: boolean;
    setAt?: string;
  }> => {
    const config = readGlobalConfig();
    return {
      wantsCodeViewing: config.wantsCodeViewing ?? false,
      setAt: config.vscodePreferenceSetAt,
    };
  });

  // Set VSCode preference
  ipcMain.handle('settings:setVSCodePreference', async (_, wantsCodeViewing: boolean): Promise<{
    success: boolean;
  }> => {
    const config = readGlobalConfig();
    config.wantsCodeViewing = wantsCodeViewing;
    config.vscodePreferenceSetAt = new Date().toISOString();
    writeGlobalConfig(config);
    return { success: true };
  });

  // Get available providers
  ipcMain.handle('settings:getAvailableProviders', async (): Promise<{
    providers: Array<{ type: ProviderType; name: string; description: string; available: boolean }>;
    current: ProviderType;
  }> => {
    const provider = getOrCreateProvider();
    let currentType: ProviderType = 'mock';
    if (provider instanceof OpenCodeProvider) {
      currentType = 'opencode';
    } else if (provider instanceof CodexProvider) {
      currentType = 'codex';
    } else if (provider instanceof ClaudeCodeProvider) {
      currentType = 'claude-code';
    } else if (provider instanceof AnthropicProvider) {
      currentType = 'anthropic';
    }

    // Check if OpenCode is installed
    const openCodeAvailable = OpenCodeInstaller.isInstalled();
    // Check if Codex CLI is available
    const codexAvailable = new CodexProvider().isReady();
    // Check if Claude Code CLI is available
    const claudeCodeAvailable = new ClaudeCodeProvider().isReady();

    return {
      providers: [
        {
          type: 'opencode',
          name: 'OpenCode',
          description: 'Open-source AI assistant (recommended)',
          available: openCodeAvailable,
        },
        {
          type: 'codex',
          name: 'Codex CLI',
          description: 'OpenAI coding agent (requires CLI)',
          available: codexAvailable,
        },
        {
          type: 'claude-code',
          name: 'Claude Code',
          description: 'Uses Claude Code CLI',
          available: claudeCodeAvailable,
        },
        {
          type: 'anthropic',
          name: 'Anthropic API',
          description: 'Direct API calls (requires API key)',
          available: true, // Always available, just needs API key
        },
        {
          type: 'mock',
          name: 'Mock',
          description: 'For testing (no real AI)',
          available: true,
        },
      ],
      current: currentType,
    };
  });

  // Switch provider
  ipcMain.handle('settings:setProvider', async (_, providerType: ProviderType, apiKey?: string): Promise<{
    success: boolean;
    provider: string;
    error?: string;
  }> => {
    try {
      let newProvider;
      switch (providerType) {
        case 'opencode':
          if (!OpenCodeInstaller.isInstalled()) {
            return {
              success: false,
              provider: getAgentProvider()?.getName() || 'Unknown',
              error: 'OpenCode is not installed. Please install it first.',
            };
          }
          newProvider = new OpenCodeProvider({
            binaryPath: OpenCodeInstaller.getBinaryPath(),
          });
          break;
        case 'codex':
          newProvider = new CodexProvider({
            workingDirectory: getProjectRoot() || process.cwd(),
          });
          break;
        case 'claude-code':
          newProvider = new ClaudeCodeProvider();
          break;
        case 'anthropic':
          if (!apiKey || apiKey.trim().length === 0) {
            return {
              success: false,
              provider: getAgentProvider()?.getName() || 'Unknown',
              error: 'API key required for Anthropic provider',
            };
          }
          newProvider = new AnthropicProvider({ apiKey: apiKey.trim() });
          break;
        case 'mock':
          newProvider = new MockAgentProvider();
          break;
        default:
          return {
            success: false,
            provider: getAgentProvider()?.getName() || 'Unknown',
            error: 'Unknown provider type',
          };
      }

      if (!newProvider.isReady()) {
        return {
          success: false,
          provider: getAgentProvider()?.getName() || 'Unknown',
          error: `Failed to initialize ${providerType} provider`,
        };
      }

      setAgentProvider(newProvider);

      // Persist the provider selection to global config
      const config = readGlobalConfig();
      config.selectedProvider = providerType;
      writeGlobalConfig(config);

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

  // Test a specific preset sound
  ipcMain.handle('settings:testSound', async (_, preset: NotificationSound): Promise<void> => {
    await playPresetSoundTest(preset);
  });

  // Get available sound presets
  ipcMain.handle('settings:getSoundPresets', async (): Promise<Array<{ id: NotificationSound; name: string; description: string }>> => {
    return [
      { id: 'system', name: 'System Beep', description: 'Default system notification' },
      { id: 'chime', name: 'Chime', description: 'Three-tone ascending chime' },
      { id: 'bell', name: 'Bell', description: 'Simple bell tone' },
      { id: 'success', name: 'Success', description: 'Two-tone success sound' },
      { id: 'ding', name: 'Ding', description: 'Quick high-pitched ding' },
      { id: 'complete', name: 'Complete', description: 'Three-tone completion melody' },
    ];
  });

  // ============================================
  // Preset Themes (for Setup Wizard)
  // ============================================

  // Get all preset themes from assets/themes folder
  ipcMain.handle('settings:getPresetThemes', async (): Promise<PresetThemeInfo[]> => {
    const themesDir = getPresetsThemesDir();
    const presets: PresetThemeInfo[] = [];

    if (!fs.existsSync(themesDir)) {
      console.warn('Preset themes directory not found:', themesDir);
      return presets;
    }

    try {
      const files = fs.readdirSync(themesDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(themesDir, file);
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const theme = JSON.parse(data) as CustomTheme;

          // Extract preview colors (themes have a single color set now)
          const coreColors = theme.colors?.core;
          if (coreColors) {
            presets.push({
              id: theme.id || file.replace('.json', ''),
              name: theme.name || file.replace('.json', ''),
              description: theme.description,
              preview: {
                background: coreColors.background || '224 71% 4%',
                foreground: coreColors.foreground || '213 31% 91%',
                primary: coreColors.primary || '210 40% 98%',
                accent: coreColors.accent || '216 34% 17%',
              },
            });
          }
        } catch (err) {
          console.error(`Failed to load preset theme ${file}:`, err);
        }
      }
    } catch (err) {
      console.error('Failed to read preset themes directory:', err);
    }

    return presets;
  });

  // Get a specific preset theme content
  ipcMain.handle('settings:getPresetTheme', async (_, themeId: string): Promise<CustomTheme | null> => {
    const themesDir = getPresetsThemesDir();
    const filePath = path.join(themesDir, `${themeId}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn('Preset theme not found:', filePath);
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as CustomTheme;
    } catch (err) {
      console.error('Failed to load preset theme:', err);
      return null;
    }
  });
}
