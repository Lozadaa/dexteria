/**
 * Plugin Manager Service
 *
 * Handles plugin discovery, loading, activation, and lifecycle management.
 * Plugins are stored globally in AppData (user's data directory), not per-project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { getStore } from '../ipc/handlers/shared';
import { getBundledPlugins } from '../plugins/bundled';
import type {
  PluginManifest,
  PluginInfo,
  PluginIndex,
  PluginState,
  ChatBeforeSendContext,
  ChatBeforeSendResult,
  ChatAfterResponseContext,
  ChatAfterResponseResult,
  TaskBeforeCreateContext,
  TaskBeforeCreateResult,
  TaskAfterCreateContext,
  TaskBeforeUpdateContext,
  TaskBeforeUpdateResult,
  TaskAfterUpdateContext,
  TaskBeforeMoveContext,
  TaskBeforeMoveResult,
  TaskAfterMoveContext,
  TaskBeforeDeleteContext,
  TaskBeforeDeleteResult,
  BoardRefreshContext,
  AgentBeforeRunContext,
  AgentBeforeRunResult,
  AgentAfterRunContext,
  AgentToolCallContext,
  AgentToolCallResult,
  AgentStepContext,
  PluginTab,
  PluginContextMenuItem,
  TaskStatus,
  UIContributions,
  PluginManifestExtended,
  ExtensionSlotId,
} from '../../shared/types';

/**
 * Hook handler function types
 */
type ChatBeforeSendHandler = (ctx: ChatBeforeSendContext) => Promise<ChatBeforeSendResult>;
type ChatAfterResponseHandler = (ctx: ChatAfterResponseContext) => Promise<ChatAfterResponseResult>;
type TaskBeforeCreateHandler = (ctx: TaskBeforeCreateContext) => Promise<TaskBeforeCreateResult>;
type TaskAfterCreateHandler = (ctx: TaskAfterCreateContext) => Promise<void>;
type TaskBeforeUpdateHandler = (ctx: TaskBeforeUpdateContext) => Promise<TaskBeforeUpdateResult>;
type TaskAfterUpdateHandler = (ctx: TaskAfterUpdateContext) => Promise<void>;
type TaskBeforeMoveHandler = (ctx: TaskBeforeMoveContext) => Promise<TaskBeforeMoveResult>;
type TaskAfterMoveHandler = (ctx: TaskAfterMoveContext) => Promise<void>;
type TaskBeforeDeleteHandler = (ctx: TaskBeforeDeleteContext) => Promise<TaskBeforeDeleteResult>;
type BoardRefreshHandler = (ctx: BoardRefreshContext) => Promise<void>;
type AgentBeforeRunHandler = (ctx: AgentBeforeRunContext) => Promise<AgentBeforeRunResult>;
type AgentAfterRunHandler = (ctx: AgentAfterRunContext) => Promise<void>;
type AgentToolCallHandler = (ctx: AgentToolCallContext) => Promise<AgentToolCallResult>;
type AgentStepHandler = (ctx: AgentStepContext) => Promise<void>;

/**
 * All supported hook types
 */
interface HookHandlers {
  'chat:beforeSend': ChatBeforeSendHandler[];
  'chat:afterResponse': ChatAfterResponseHandler[];
  'task:beforeCreate': TaskBeforeCreateHandler[];
  'task:afterCreate': TaskAfterCreateHandler[];
  'task:beforeUpdate': TaskBeforeUpdateHandler[];
  'task:afterUpdate': TaskAfterUpdateHandler[];
  'task:beforeMove': TaskBeforeMoveHandler[];
  'task:afterMove': TaskAfterMoveHandler[];
  'task:beforeDelete': TaskBeforeDeleteHandler[];
  'board:refresh': BoardRefreshHandler[];
  'agent:beforeRun': AgentBeforeRunHandler[];
  'agent:afterRun': AgentAfterRunHandler[];
  'agent:onToolCall': AgentToolCallHandler[];
  'agent:onStep': AgentStepHandler[];
}

/**
 * Tab registration options (without pluginId which is auto-filled)
 */
export interface TabRegistrationOptions {
  id: string;
  label: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  order?: number;
  component: string;
  componentType: 'html' | 'url' | 'iframe';
}

/**
 * Context menu item registration options (without pluginId)
 */
export interface ContextMenuItemOptions {
  id: string;
  label: string;
  icon?: string;
  location: 'task' | 'board' | 'column';
  order?: number;
}

/**
 * Task API interface for plugins
 */
export interface PluginTaskAPI {
  create: (title: string, status?: string) => Promise<{ id: string; title: string; status: string }>;
  update: (taskId: string, patch: Record<string, unknown>) => Promise<{ id: string }>;
  move: (taskId: string, toColumn: string) => Promise<void>;
  get: (taskId: string) => Promise<unknown>;
  getAll: () => Promise<unknown[]>;
}

/**
 * Plugin context provided to plugins during activation
 */
export interface PluginContext {
  pluginId: string;
  pluginPath: string;
  dataPath: string;

  // Logging
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };

  // Storage (scoped to plugin)
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };

  // Hook registration
  hooks: {
    on: (hook: string, handler: (...args: unknown[]) => Promise<unknown>) => void;
    off: (hook: string, handler: (...args: unknown[]) => Promise<unknown>) => void;
  };

  // UI extensions
  ui: {
    registerTab: (options: TabRegistrationOptions) => void;
    unregisterTab: (tabId: string) => void;
    registerContextMenuItem: (options: ContextMenuItemOptions, handler: (context: unknown) => Promise<void>) => void;
    unregisterContextMenuItem: (itemId: string) => void;
  };

  // API for interacting with Dexteria
  api: {
    tasks: PluginTaskAPI;
  };
}

/**
 * Plugin API interface (optional methods a plugin can expose)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginAPI = Record<string, (...args: any[]) => Promise<any>>;

/**
 * Plugin module interface (what a plugin exports)
 */
interface PluginModule {
  activate: (context: PluginContext) => Promise<void>;
  deactivate?: () => Promise<void>;
  api?: PluginAPI;
}

export class PluginManager {
  private pluginsDir: string;
  private indexPath: string;
  private index: PluginIndex | null = null;
  private plugins: Map<string, PluginInfo> = new Map();
  private loadedModules: Map<string, PluginModule> = new Map();
  private pluginDataDir: string;

  // Hook registrations
  private hooks: HookHandlers = {
    'chat:beforeSend': [],
    'chat:afterResponse': [],
    'task:beforeCreate': [],
    'task:afterCreate': [],
    'task:beforeUpdate': [],
    'task:afterUpdate': [],
    'task:beforeMove': [],
    'task:afterMove': [],
    'task:beforeDelete': [],
    'board:refresh': [],
    'agent:beforeRun': [],
    'agent:afterRun': [],
    'agent:onToolCall': [],
    'agent:onStep': [],
  };

  // UI extension registrations
  private tabs: Map<string, PluginTab> = new Map();
  private contextMenuItems: Map<string, PluginContextMenuItem> = new Map();
  private contextMenuHandlers: Map<string, (context: unknown) => Promise<void>> = new Map();

  constructor() {
    // Store plugins in user's AppData directory (global, not per-project)
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
    this.indexPath = path.join(this.pluginsDir, 'index.json');
    this.pluginDataDir = path.join(this.pluginsDir, 'data');
  }

  /**
   * Initialize the plugin manager
   */
  async init(): Promise<void> {
    // Ensure plugins directory exists
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    // Ensure plugin data directory exists
    if (!fs.existsSync(this.pluginDataDir)) {
      fs.mkdirSync(this.pluginDataDir, { recursive: true });
    }

    // Load or create index
    this.index = this.loadIndex();

    // Discover plugins
    await this.discoverPlugins();

    // Activate enabled plugins
    for (const pluginId of this.index.enabled) {
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.state === 'enabled') {
        await this.activatePlugin(pluginId);
      }
    }

    console.log(`[PluginManager] Initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Load the plugin index
   */
  private loadIndex(): PluginIndex {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(data);
      } catch (err) {
        console.error('[PluginManager] Failed to load index:', err);
      }
    }

    return {
      version: 1,
      enabled: [],
      disabled: [],
      settings: {},
    };
  }

  /**
   * Save the plugin index
   */
  private saveIndex(): void {
    if (!this.index) return;
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Discover plugins from bundled and user directories
   */
  private async discoverPlugins(): Promise<void> {
    // First, load bundled plugins (shipped with Dexteria)
    await this.discoverBundledPlugins();

    // Then load user-installed plugins from .local-kanban/plugins/
    await this.discoverUserPlugins();
  }

  /**
   * Discover bundled plugins that ship with Dexteria
   */
  private async discoverBundledPlugins(): Promise<void> {
    const bundledPlugins = getBundledPlugins();

    for (const bundledPlugin of bundledPlugins) {
      const manifestPath = path.join(bundledPlugin.path, 'manifest.json');

      try {
        const manifestData = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestData) as PluginManifest;

        // Validate manifest
        if (!manifest.id || !manifest.name || !manifest.version) {
          console.error(`[PluginManager] Invalid manifest in bundled plugin ${bundledPlugin.id}`);
          continue;
        }

        // Bundled plugins are enabled by default unless explicitly disabled
        let state: PluginState = 'enabled';
        if (this.index?.disabled.includes(manifest.id)) {
          state = 'disabled';
        }

        const pluginInfo: PluginInfo = {
          manifest,
          state,
          path: bundledPlugin.path,
          loadedAt: new Date().toISOString(),
        };

        this.plugins.set(manifest.id, pluginInfo);
        console.log(`[PluginManager] Discovered bundled plugin: ${manifest.name} (${manifest.id})`);
      } catch (err) {
        console.error(`[PluginManager] Failed to load bundled plugin ${bundledPlugin.id}:`, err);
      }
    }
  }

  /**
   * Discover user-installed plugins in the plugins directory
   */
  private async discoverUserPlugins(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) return;

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'data') continue; // Skip data directory
      if (entry.name === 'index.json') continue; // Skip index file

      const pluginPath = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginPath, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        console.warn(`[PluginManager] No manifest.json in ${entry.name}, skipping`);
        continue;
      }

      try {
        const manifestData = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestData) as PluginManifest;

        // Validate manifest
        if (!manifest.id || !manifest.name || !manifest.version) {
          console.error(`[PluginManager] Invalid manifest in ${entry.name}`);
          continue;
        }

        // Skip if already loaded (bundled plugins take precedence)
        if (this.plugins.has(manifest.id)) {
          console.log(`[PluginManager] Skipping user plugin ${manifest.id} (bundled version exists)`);
          continue;
        }

        // Determine state based on index
        let state: PluginState = 'installed';
        if (this.index?.enabled.includes(manifest.id)) {
          state = 'enabled';
        } else if (this.index?.disabled.includes(manifest.id)) {
          state = 'disabled';
        }

        const pluginInfo: PluginInfo = {
          manifest,
          state,
          path: pluginPath,
          loadedAt: new Date().toISOString(),
        };

        this.plugins.set(manifest.id, pluginInfo);
        console.log(`[PluginManager] Discovered user plugin: ${manifest.name} (${manifest.id})`);
      } catch (err) {
        console.error(`[PluginManager] Failed to load manifest for ${entry.name}:`, err);
      }
    }
  }

  /**
   * Create plugin context for a specific plugin
   */
  private createPluginContext(pluginId: string): PluginContext {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

    const pluginDataPath = path.join(this.pluginDataDir, pluginId);
    if (!fs.existsSync(pluginDataPath)) {
      fs.mkdirSync(pluginDataPath, { recursive: true });
    }

    const storagePath = path.join(pluginDataPath, 'storage.json');

    // Load existing storage
    let storage: Record<string, unknown> = {};
    if (fs.existsSync(storagePath)) {
      try {
        storage = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      } catch {
        storage = {};
      }
    }

    const saveStorage = () => {
      fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2));
    };

    return {
      pluginId,
      pluginPath: plugin.path,
      dataPath: pluginDataPath,

      log: {
        info: (msg) => console.log(`[Plugin:${pluginId}] ${msg}`),
        warn: (msg) => console.warn(`[Plugin:${pluginId}] ${msg}`),
        error: (msg) => console.error(`[Plugin:${pluginId}] ${msg}`),
        debug: (msg) => console.debug(`[Plugin:${pluginId}] ${msg}`),
      },

      storage: {
        get: async (key: string) => storage[key],
        set: async (key: string, value: unknown) => {
          storage[key] = value;
          saveStorage();
        },
        delete: async (key: string) => {
          delete storage[key];
          saveStorage();
        },
        clear: async () => {
          storage = {};
          saveStorage();
        },
      },

      hooks: {
        on: (hook: string, handler) => {
          if (hook in this.hooks) {
            // Type-safe hook registration
            const hookName = hook as keyof HookHandlers;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.hooks[hookName] as any[]).push(handler);
          }
        },
        off: (hook: string, handler) => {
          if (hook in this.hooks) {
            const hookName = hook as keyof HookHandlers;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handlers = this.hooks[hookName] as any[];
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        },
      },

      ui: {
        registerTab: (options: TabRegistrationOptions) => {
          const fullId = `${pluginId}:${options.id}`;
          const tab: PluginTab = {
            ...options,
            id: fullId,
            pluginId,
          };
          this.tabs.set(fullId, tab);
          console.log(`[PluginManager] Registered tab: ${fullId}`);
        },
        unregisterTab: (tabId: string) => {
          const fullId = `${pluginId}:${tabId}`;
          this.tabs.delete(fullId);
          console.log(`[PluginManager] Unregistered tab: ${fullId}`);
        },
        registerContextMenuItem: (options: ContextMenuItemOptions, handler: (context: unknown) => Promise<void>) => {
          const fullId = `${pluginId}:${options.id}`;
          const item: PluginContextMenuItem = {
            ...options,
            id: fullId,
            pluginId,
          };
          this.contextMenuItems.set(fullId, item);
          this.contextMenuHandlers.set(fullId, handler);
          console.log(`[PluginManager] Registered context menu item: ${fullId}`);
        },
        unregisterContextMenuItem: (itemId: string) => {
          const fullId = `${pluginId}:${itemId}`;
          this.contextMenuItems.delete(fullId);
          this.contextMenuHandlers.delete(fullId);
          console.log(`[PluginManager] Unregistered context menu item: ${fullId}`);
        },
      },

      api: {
        tasks: {
          create: async (title: string, status = 'backlog') => {
            const store = getStore();
            const task = await store.createTask(title, status as TaskStatus);
            return { id: task.id, title: task.title, status: task.status };
          },
          update: async (taskId: string, patch: Record<string, unknown>) => {
            const store = getStore();
            await store.updateTask(taskId, patch);
            return { id: taskId };
          },
          move: async (taskId: string, toColumn: string) => {
            const store = getStore();
            await store.moveTask(taskId, toColumn as TaskStatus);
          },
          get: async (taskId: string) => {
            const store = getStore();
            const tasks = await store.getTasks();
            return tasks.find(t => t.id === taskId) || null;
          },
          getAll: async () => {
            const store = getStore();
            return store.getTasks();
          },
        },
      },
    };
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<boolean> {
    console.log(`[PluginManager] Attempting to activate plugin: ${pluginId}`);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`[PluginManager] Plugin ${pluginId} not found in registry`);
      console.log(`[PluginManager] Available plugins: ${Array.from(this.plugins.keys()).join(', ')}`);
      return false;
    }

    if (plugin.state === 'active') {
      console.log(`[PluginManager] Plugin ${pluginId} is already active`);
      return true;
    }

    try {
      // Load the plugin module
      const mainPath = path.join(plugin.path, plugin.manifest.main || 'main.js');
      console.log(`[PluginManager] Looking for main entry at: ${mainPath}`);

      if (!fs.existsSync(mainPath)) {
        console.error(`[PluginManager] Main entry not found: ${mainPath}`);
        console.log(`[PluginManager] Plugin path: ${plugin.path}`);
        console.log(`[PluginManager] Files in plugin directory:`);
        try {
          const files = fs.readdirSync(plugin.path);
          files.forEach(f => console.log(`  - ${f}`));
        } catch (e) {
          console.error(`[PluginManager] Could not read plugin directory: ${e}`);
        }
        plugin.state = 'error';
        plugin.error = `Main entry file not found: ${mainPath}`;
        return false;
      }

      // Dynamic import (in Node.js context)
      console.log(`[PluginManager] Loading module from: ${mainPath}`);
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(mainPath)];
      const module = require(mainPath) as PluginModule;

      if (typeof module.activate !== 'function') {
        console.error(`[PluginManager] Plugin ${pluginId} has no activate function`);
        console.log(`[PluginManager] Module exports:`, Object.keys(module));
        plugin.state = 'error';
        plugin.error = 'No activate function exported';
        return false;
      }

      // Create context and activate
      console.log(`[PluginManager] Creating context for ${pluginId}`);
      const context = this.createPluginContext(pluginId);
      console.log(`[PluginManager] Calling activate() for ${pluginId}`);
      await module.activate(context);

      // Update state
      this.loadedModules.set(pluginId, module);
      plugin.state = 'active';
      plugin.activatedAt = new Date().toISOString();
      plugin.error = undefined; // Clear any previous error

      // Update index - ensure persistence
      if (this.index) {
        if (!this.index.enabled.includes(pluginId)) {
          this.index.enabled.push(pluginId);
        }
        this.index.disabled = this.index.disabled.filter((id) => id !== pluginId);
        this.saveIndex();
        console.log(`[PluginManager] Saved index with enabled plugins: ${this.index.enabled.join(', ')}`);
      }

      console.log(`[PluginManager] Successfully activated plugin: ${plugin.manifest.name} (${pluginId})`);
      return true;
    } catch (err) {
      console.error(`[PluginManager] Failed to activate ${pluginId}:`, err);
      console.error(`[PluginManager] Error stack:`, (err as Error).stack);
      plugin.state = 'error';
      plugin.error = err instanceof Error ? err.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (plugin.state !== 'active') {
      return true; // Not active
    }

    try {
      const module = this.loadedModules.get(pluginId);
      if (module?.deactivate) {
        await module.deactivate();
      }

      // Clear UI items registered by this plugin
      this.clearPluginUIItems(pluginId);

      // Remove from loaded modules
      this.loadedModules.delete(pluginId);

      // Update state
      plugin.state = 'disabled';
      plugin.activatedAt = undefined;

      // Update index
      if (this.index) {
        this.index.enabled = this.index.enabled.filter((id) => id !== pluginId);
        if (!this.index.disabled.includes(pluginId)) {
          this.index.disabled.push(pluginId);
        }
        this.saveIndex();
      }

      console.log(`[PluginManager] Deactivated plugin: ${plugin.manifest.name}`);
      return true;
    } catch (err) {
      console.error(`[PluginManager] Failed to deactivate ${pluginId}:`, err);
      return false;
    }
  }

  /**
   * Get all plugins
   */
  getPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): PluginInfo | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    return this.activatePlugin(pluginId);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    return this.deactivatePlugin(pluginId);
  }

  /**
   * Get plugin settings
   */
  getPluginSettings(pluginId: string): Record<string, unknown> {
    return this.index?.settings[pluginId] || {};
  }

  /**
   * Set plugin settings
   */
  setPluginSettings(pluginId: string, settings: Record<string, unknown>): void {
    if (!this.index) return;
    this.index.settings[pluginId] = settings;
    this.saveIndex();
  }

  // ============================================
  // UI Extension Methods
  // ============================================

  /**
   * Get all registered tabs
   */
  getTabs(): PluginTab[] {
    return Array.from(this.tabs.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get tabs by position
   */
  getTabsByPosition(position: 'left' | 'right' | 'bottom'): PluginTab[] {
    return this.getTabs().filter((tab) => tab.position === position);
  }

  /**
   * Get all context menu items
   */
  getContextMenuItems(): PluginContextMenuItem[] {
    return Array.from(this.contextMenuItems.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get context menu items by location
   */
  getContextMenuItemsByLocation(location: 'task' | 'board' | 'column'): PluginContextMenuItem[] {
    return this.getContextMenuItems().filter((item) => item.location === location);
  }

  /**
   * Execute a context menu item handler
   */
  async executeContextMenuItem(itemId: string, context: unknown): Promise<void> {
    const handler = this.contextMenuHandlers.get(itemId);
    if (handler) {
      try {
        await handler(context);
      } catch (err) {
        console.error(`[PluginManager] Context menu handler error for ${itemId}:`, err);
      }
    }
  }

  /**
   * Get all UI contributions from active plugins
   * This aggregates settingsTabs, dockingPanels, and slots from all active plugins
   */
  getUIContributions(): UIContributions {
    const contributions: UIContributions = {
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

    // Iterate through all active plugins
    for (const [pluginId, pluginInfo] of this.plugins.entries()) {
      // Only include contributions from active plugins
      if (pluginInfo.state !== 'active') continue;

      const manifest = pluginInfo.manifest as PluginManifestExtended;
      const contributes = manifest.contributes;

      if (!contributes) continue;

      // Note: renderer config is used when resolving plugin UI components
      // The pluginPath is used to locate the renderer entry point

      // Add settings tab contribution
      if (contributes.settingsTab) {
        contributions.settingsTabs.push({
          ...contributes.settingsTab,
          pluginId,
          pluginPath: pluginInfo.path,
        });
      }

      // Add docking panel contributions
      if (contributes.dockingPanels) {
        for (const panel of contributes.dockingPanels) {
          contributions.dockingPanels.push({
            ...panel,
            pluginId,
            pluginPath: pluginInfo.path,
          });
        }
      }

      // Add slot contributions
      if (contributes.slots) {
        for (const slot of contributes.slots) {
          const slotId = slot.slotId as ExtensionSlotId;
          if (contributions.slots[slotId]) {
            contributions.slots[slotId].push({
              ...slot,
              pluginId,
              pluginPath: pluginInfo.path,
            });
          }
        }
      }
    }

    // Sort by order
    contributions.settingsTabs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    contributions.dockingPanels.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    for (const slotId of Object.keys(contributions.slots) as ExtensionSlotId[]) {
      contributions.slots[slotId].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    }

    return contributions;
  }

  /**
   * Get a plugin's exposed API
   */
  getPluginAPI(pluginId: string): PluginAPI | null {
    const module = this.loadedModules.get(pluginId);
    if (!module?.api) {
      return null;
    }
    return module.api;
  }

  /**
   * Call a plugin API method
   * Supports dot-notation paths like "auth.isConnected"
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callPluginAPI(pluginId: string, methodPath: string, ...args: any[]): Promise<any> {
    const api = this.getPluginAPI(pluginId);
    if (!api) {
      throw new Error(`Plugin ${pluginId} does not expose an API`);
    }

    // Support dot-notation paths like "auth.isConnected"
    const parts = methodPath.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = api;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Plugin ${pluginId} does not have API path: ${methodPath}`);
      }
    }

    if (typeof current !== 'function') {
      throw new Error(`Plugin ${pluginId} API path ${methodPath} is not a function`);
    }

    return current(...args);
  }

  /**
   * Clear all UI items registered by a plugin
   */
  private clearPluginUIItems(pluginId: string): void {
    // Clear tabs
    for (const [id, tab] of this.tabs.entries()) {
      if (tab.pluginId === pluginId) {
        this.tabs.delete(id);
      }
    }

    // Clear context menu items
    for (const [id, item] of this.contextMenuItems.entries()) {
      if (item.pluginId === pluginId) {
        this.contextMenuItems.delete(id);
        this.contextMenuHandlers.delete(id);
      }
    }
  }

  // ============================================
  // Hook Execution
  // ============================================

  /**
   * Execute chat:beforeSend hooks
   */
  async executeBeforeSendHooks(context: ChatBeforeSendContext): Promise<ChatBeforeSendResult> {
    let result: ChatBeforeSendResult = { message: context.message };

    for (const handler of this.hooks['chat:beforeSend']) {
      try {
        const hookResult = await handler({
          ...context,
          message: result.message,
        });

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook chat:beforeSend error:', err);
      }
    }

    return result;
  }

  /**
   * Execute chat:afterResponse hooks
   */
  async executeAfterResponseHooks(context: ChatAfterResponseContext): Promise<ChatAfterResponseResult> {
    let result: ChatAfterResponseResult = { response: context.response };

    for (const handler of this.hooks['chat:afterResponse']) {
      try {
        const hookResult = await handler({
          ...context,
          response: result.response,
        });

        result = { ...result, ...hookResult };
      } catch (err) {
        console.error('[PluginManager] Hook chat:afterResponse error:', err);
      }
    }

    return result;
  }

  // ============================================
  // Task Hook Execution
  // ============================================

  /**
   * Execute task:beforeCreate hooks
   */
  async executeTaskBeforeCreateHooks(context: TaskBeforeCreateContext): Promise<TaskBeforeCreateResult> {
    let result: TaskBeforeCreateResult = { input: context.input };

    for (const handler of this.hooks['task:beforeCreate']) {
      try {
        const hookResult = await handler({
          input: result.input,
        });

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook task:beforeCreate error:', err);
      }
    }

    return result;
  }

  /**
   * Execute task:afterCreate hooks
   */
  async executeTaskAfterCreateHooks(context: TaskAfterCreateContext): Promise<void> {
    for (const handler of this.hooks['task:afterCreate']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook task:afterCreate error:', err);
      }
    }
  }

  /**
   * Execute task:beforeUpdate hooks
   */
  async executeTaskBeforeUpdateHooks(context: TaskBeforeUpdateContext): Promise<TaskBeforeUpdateResult> {
    let result: TaskBeforeUpdateResult = { patch: context.patch };

    for (const handler of this.hooks['task:beforeUpdate']) {
      try {
        const hookResult = await handler({
          ...context,
          patch: result.patch,
        });

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook task:beforeUpdate error:', err);
      }
    }

    return result;
  }

  /**
   * Execute task:afterUpdate hooks
   */
  async executeTaskAfterUpdateHooks(context: TaskAfterUpdateContext): Promise<void> {
    for (const handler of this.hooks['task:afterUpdate']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook task:afterUpdate error:', err);
      }
    }
  }

  /**
   * Execute task:beforeMove hooks
   */
  async executeTaskBeforeMoveHooks(context: TaskBeforeMoveContext): Promise<TaskBeforeMoveResult> {
    let result: TaskBeforeMoveResult = { toColumn: context.toColumn };

    for (const handler of this.hooks['task:beforeMove']) {
      try {
        const hookResult = await handler({
          ...context,
          toColumn: result.toColumn,
        });

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook task:beforeMove error:', err);
      }
    }

    return result;
  }

  /**
   * Execute task:afterMove hooks
   */
  async executeTaskAfterMoveHooks(context: TaskAfterMoveContext): Promise<void> {
    for (const handler of this.hooks['task:afterMove']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook task:afterMove error:', err);
      }
    }
  }

  /**
   * Execute task:beforeDelete hooks
   */
  async executeTaskBeforeDeleteHooks(context: TaskBeforeDeleteContext): Promise<TaskBeforeDeleteResult> {
    let result: TaskBeforeDeleteResult = {};

    for (const handler of this.hooks['task:beforeDelete']) {
      try {
        const hookResult = await handler(context);

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook task:beforeDelete error:', err);
      }
    }

    return result;
  }

  /**
   * Execute board:refresh hooks
   */
  async executeBoardRefreshHooks(context: BoardRefreshContext): Promise<void> {
    for (const handler of this.hooks['board:refresh']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook board:refresh error:', err);
      }
    }
  }

  // ============================================
  // Agent Hook Execution
  // ============================================

  /**
   * Execute agent:beforeRun hooks
   */
  async executeAgentBeforeRunHooks(context: AgentBeforeRunContext): Promise<AgentBeforeRunResult> {
    let result: AgentBeforeRunResult = {};

    for (const handler of this.hooks['agent:beforeRun']) {
      try {
        const hookResult = await handler(context);

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook agent:beforeRun error:', err);
      }
    }

    return result;
  }

  /**
   * Execute agent:afterRun hooks
   */
  async executeAgentAfterRunHooks(context: AgentAfterRunContext): Promise<void> {
    for (const handler of this.hooks['agent:afterRun']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook agent:afterRun error:', err);
      }
    }
  }

  /**
   * Execute agent:onToolCall hooks
   */
  async executeAgentToolCallHooks(context: AgentToolCallContext): Promise<AgentToolCallResult> {
    let result: AgentToolCallResult = {};

    for (const handler of this.hooks['agent:onToolCall']) {
      try {
        const hookResult = await handler(context);

        result = { ...result, ...hookResult };

        if (result.cancel) {
          break;
        }
      } catch (err) {
        console.error('[PluginManager] Hook agent:onToolCall error:', err);
      }
    }

    return result;
  }

  /**
   * Execute agent:onStep hooks
   */
  async executeAgentStepHooks(context: AgentStepContext): Promise<void> {
    for (const handler of this.hooks['agent:onStep']) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[PluginManager] Hook agent:onStep error:', err);
      }
    }
  }
}

// Singleton instance (initialized once at app startup)
let pluginManagerInstance: PluginManager | null = null;

export function initPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}

export function getPluginManager(): PluginManager | null {
  return pluginManagerInstance;
}
