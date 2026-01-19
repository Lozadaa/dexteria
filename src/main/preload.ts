import { contextBridge, ipcRenderer } from 'electron';

/**
 * Dexteria Preload Script
 *
 * Exposes a safe, limited API to the renderer process.
 * All communication with the main process goes through this bridge.
 */

// ============================================
// API Type Definitions
// ============================================

export interface DexteriaAPI {
  app: {
    getVersion: () => Promise<string>;
    getName: () => Promise<string>;
    getProjectRoot: () => Promise<string>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
    openDevTools: () => Promise<void>;
  };
  board: {
    get: () => Promise<unknown>;
    save: (board: unknown) => Promise<void>;
  };
  tasks: {
    getAll: () => Promise<unknown[]>;
    get: (taskId: string) => Promise<unknown>;
    create: (title: string, status?: string) => Promise<unknown>;
    update: (taskId: string, patch: unknown) => Promise<unknown>;
    delete: (taskId: string) => Promise<void>;
    move: (taskId: string, toColumnId: string, newOrder?: number) => Promise<void>;
    addComment: (taskId: string, comment: unknown) => Promise<void>;
    addTypedComment: (
      taskId: string,
      type: string,
      author: string,
      content: string,
      runId?: string
    ) => Promise<unknown>;
    getPending: (strategy?: string) => Promise<unknown[]>;
    analyzeState: (taskId: string) => Promise<{
      success: boolean;
      summary: string;
      criteria: { criterion: string; passed: boolean; evidence: string }[];
      suggestedStatus: string;
      error?: string;
    }>;
    getCommentContext: (taskId: string) => Promise<{
      formattedContext: string;
      failureCount: number;
      hasUnresolvedClarifications: boolean;
    }>;
    getPendingClarifications: (taskId: string) => Promise<{
      commentId: string;
      reason: string;
      question: string;
      timestamp: string;
      resolved: boolean;
    }[]>;
    markFailuresAddressed: (taskId: string, note?: string) => Promise<unknown>;
  };
  state: {
    get: () => Promise<unknown>;
    set: (patch: unknown) => Promise<unknown>;
  };
  policy: {
    get: () => Promise<unknown>;
  };
  agent: {
    runTask: (taskId: string, options?: unknown) => Promise<{
      success: boolean;
      run: unknown;
      error?: string;
    }>;
    cancel: () => Promise<void>;
    isRunning: () => Promise<boolean>;
    getCurrentRun: () => Promise<unknown>;
    onStreamUpdate: (callback: (data: { taskId: string; taskTitle?: string; content: string; done: boolean; cancelled?: boolean }) => void) => () => void;
  };
  ralph: {
    start: (options?: unknown) => Promise<{
      success: boolean;
      processed: number;
      completed: number;
      failed: number;
      blocked: number;
      stoppedReason?: string;
    }>;
    stop: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    getProgress: () => Promise<{
      total: number;
      completed: number;
      failed: number;
      blocked: number;
      currentTaskId: string | null;
      currentTaskTitle: string | null;
      status: string;
    }>;
    isRunning: () => Promise<boolean>;
  };
  runs: {
    getLog: (taskId: string, runId: string) => Promise<string | null>;
    tailLog: (taskId: string, runId: string, lines?: number) => Promise<string | null>;
    getMetadata: (taskId: string, runId: string) => Promise<unknown>;
  };
  context: {
    getProject: () => Promise<unknown>;
    saveProject: (context: unknown) => Promise<void>;
    getRepoIndex: () => Promise<unknown>;
    saveRepoIndex: (index: unknown) => Promise<void>;
  };
  chat: {
    getAll: () => Promise<unknown[]>;
    get: (chatId: string) => Promise<unknown>;
    create: (title: string) => Promise<unknown>;
    delete: (chatId: string) => Promise<boolean>;
    sendMessage: (chatId: string, content: string, mode?: 'planner' | 'agent') => Promise<unknown>;
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => () => void;
  };
  settings: {
    getProvider: () => Promise<{
      name: string;
      ready: boolean;
      type: 'mock' | 'anthropic' | 'claude-code' | 'opencode';
    }>;
    getAvailableProviders: () => Promise<{
      providers: Array<{ type: 'mock' | 'anthropic' | 'claude-code' | 'opencode'; name: string; description: string; available: boolean }>;
      current: 'mock' | 'anthropic' | 'claude-code' | 'opencode';
    }>;
    setProvider: (providerType: 'mock' | 'anthropic' | 'claude-code' | 'opencode', apiKey?: string) => Promise<{
      success: boolean;
      provider: string;
      error?: string;
    }>;
    setApiKey: (apiKey: string) => Promise<{
      success: boolean;
      provider: string;
      error?: string;
    }>;
    testProvider: () => Promise<{
      success: boolean;
      message: string;
    }>;
    getProject: () => Promise<unknown>;
    saveProject: (settings: unknown) => Promise<{ success: boolean; error?: string }>;
    updateProject: (patch: unknown) => Promise<{ success: boolean; settings?: unknown; error?: string }>;
    detectCommands: () => Promise<unknown>;
    getEffectiveCommand: (type: 'run' | 'build' | 'install') => Promise<string>;
    testSound: (preset: 'system' | 'chime' | 'bell' | 'success' | 'ding' | 'complete') => Promise<void>;
    getSoundPresets: () => Promise<Array<{ id: string; name: string; description: string }>>;
    getPresetThemes: () => Promise<Array<{
      id: string;
      name: string;
      description?: string;
      preview: { background: string; foreground: string; primary: string; accent: string };
    }>>;
    getPresetTheme: (themeId: string) => Promise<unknown | null>;
  };
  project: {
    open: () => Promise<{ success: boolean; path?: string; error?: string }>;
    create: () => Promise<{ success: boolean; path?: string; error?: string }>;
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    close: () => Promise<void>;
    getCurrent: () => Promise<string | null>;
    getRecent: () => Promise<Array<{ path: string; name: string; lastOpened: string }>>;
    onProjectChanged: (callback: (path: string | null) => void) => () => void;
    onProjectOpening: (callback: (path: string) => void) => () => void;
    onOpenShortcut: (callback: () => void) => () => void;
    startRun: () => Promise<{ runId: string; success: boolean; logPath: string; error?: string }>;
    stopRun: () => Promise<boolean>;
    startBuild: () => Promise<{ runId: string; success: boolean; logPath: string; error?: string }>;
    stopBuild: () => Promise<boolean>;
    getProcessStatus: (type: 'run' | 'build') => Promise<unknown>;
    getAllProcessStatus: () => Promise<unknown[]>;
    onStatusUpdate: (callback: (status: unknown) => void) => () => void;
    onOutput: (callback: (data: { type: string; runId: string; data: string }) => void) => () => void;
  };
  theme: {
    getAll: () => Promise<Array<{ id: string; name: string; isBuiltIn: boolean; path: string }>>;
    getActive: () => Promise<unknown | null>;
    load: (themeId: string) => Promise<unknown | null>;
    setActive: (themeId: string) => Promise<{ success: boolean; theme?: unknown; css?: { light: string; dark: string } }>;
    save: (theme: unknown) => Promise<{ success: boolean }>;
    create: (name: string, baseThemeId?: string) => Promise<unknown | null>;
    delete: (themeId: string) => Promise<boolean>;
    import: (jsonString: string) => Promise<unknown | null>;
    export: (themeId: string) => Promise<string | null>;
    getFilePath: (themeId: string) => Promise<string | null>;
    openInEditor: (themeId: string) => Promise<boolean>;
    getCSS: (themeId: string) => Promise<{ light: string; dark: string } | null>;
    onChanged: (callback: (data: { theme: unknown; css: { light: string; dark: string } }) => void) => () => void;
  };
  plugin: {
    getAll: () => Promise<unknown[]>;
    get: (pluginId: string) => Promise<unknown | null>;
    enable: (pluginId: string) => Promise<boolean>;
    disable: (pluginId: string) => Promise<boolean>;
    getSettings: (pluginId: string) => Promise<Record<string, unknown>>;
    setSettings: (pluginId: string, settings: Record<string, unknown>) => Promise<void>;
    // UI Extensions
    getTabs: () => Promise<Array<{
      id: string;
      pluginId: string;
      label: string;
      icon?: string;
      position: 'left' | 'right' | 'bottom';
      order?: number;
      component: string;
      componentType: 'html' | 'url' | 'iframe';
    }>>;
    getTabsByPosition: (position: 'left' | 'right' | 'bottom') => Promise<Array<{
      id: string;
      pluginId: string;
      label: string;
      icon?: string;
      position: 'left' | 'right' | 'bottom';
      order?: number;
      component: string;
      componentType: 'html' | 'url' | 'iframe';
    }>>;
    getContextMenuItems: () => Promise<Array<{
      id: string;
      pluginId: string;
      label: string;
      icon?: string;
      location: 'task' | 'board' | 'column';
      order?: number;
    }>>;
    getContextMenuItemsByLocation: (location: 'task' | 'board' | 'column') => Promise<Array<{
      id: string;
      pluginId: string;
      label: string;
      icon?: string;
      location: 'task' | 'board' | 'column';
      order?: number;
    }>>;
    executeContextMenuItem: (itemId: string, context: unknown) => Promise<void>;
    callApi: (pluginId: string, methodName: string, ...args: unknown[]) => Promise<unknown>;
    // UI Contributions
    getUIContributions: () => Promise<{
      settingsTabs: Array<{
        id: string;
        title: string;
        icon: string;
        order?: number;
        pluginId: string;
        pluginPath: string;
      }>;
      dockingPanels: Array<{
        id: string;
        title: string;
        icon: string;
        singleton?: boolean;
        defaultPosition?: 'left' | 'right' | 'bottom';
        pluginId: string;
        pluginPath: string;
      }>;
      slots: Record<string, Array<{
        slotId: string;
        order?: number;
        when?: string;
        pluginId: string;
        pluginPath: string;
      }>>;
    }>;
  };
  opencode: {
    isInstalled: () => Promise<boolean>;
    getBinaryPath: () => Promise<string>;
    getVersion: () => Promise<string | null>;
    getLatestRelease: () => Promise<{
      version: string;
      assetUrl: string;
      assetName: string;
    } | null>;
    checkUpdates: () => Promise<{
      updateAvailable: boolean;
      currentVersion: string | null;
      latestVersion: string;
      error?: string;
    }>;
    install: () => Promise<{ success: boolean; version?: string; error?: string }>;
    update: () => Promise<{ success: boolean; version?: string; error?: string }>;
    uninstall: () => Promise<{ success: boolean; error?: string }>;
    onInstallProgress: (callback: (progress: {
      phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
      percent: number;
      message: string;
    }) => void) => () => void;
    onSetupStatus: (callback: (status: {
      installed: boolean;
      version: string | null;
    }) => void) => () => void;
  };
}

// ============================================
// Expose API to Renderer
// ============================================

const api: DexteriaAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    getProjectRoot: () => ipcRenderer.invoke('app:getProjectRoot'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
      ipcRenderer.on('window:maximized-changed', handler);
      // Return cleanup function
      return () => ipcRenderer.removeListener('window:maximized-changed', handler);
    },
    openDevTools: () => ipcRenderer.invoke('window:openDevTools'),
  },
  board: {
    get: () => ipcRenderer.invoke('board:get'),
    save: (board) => ipcRenderer.invoke('board:save', board),
  },
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    get: (taskId) => ipcRenderer.invoke('tasks:get', taskId),
    create: (title, status) => ipcRenderer.invoke('tasks:create', title, status),
    update: (taskId, patch) => ipcRenderer.invoke('tasks:update', taskId, patch),
    delete: (taskId) => ipcRenderer.invoke('tasks:delete', taskId),
    move: (taskId, toColumnId, newOrder) => ipcRenderer.invoke('tasks:move', taskId, toColumnId, newOrder),
    addComment: (taskId, comment) => ipcRenderer.invoke('tasks:addComment', taskId, comment),
    addTypedComment: (taskId, type, author, content, runId) =>
      ipcRenderer.invoke('tasks:addTypedComment', taskId, type, author, content, runId),
    getPending: (strategy) => ipcRenderer.invoke('tasks:getPending', strategy),
    analyzeState: (taskId) => ipcRenderer.invoke('tasks:analyzeState', taskId),
    getCommentContext: (taskId) => ipcRenderer.invoke('tasks:getCommentContext', taskId),
    getPendingClarifications: (taskId) => ipcRenderer.invoke('tasks:getPendingClarifications', taskId),
    markFailuresAddressed: (taskId, note) => ipcRenderer.invoke('tasks:markFailuresAddressed', taskId, note),
  },
  state: {
    get: () => ipcRenderer.invoke('state:get'),
    set: (patch) => ipcRenderer.invoke('state:set', patch),
  },
  policy: {
    get: () => ipcRenderer.invoke('policy:get'),
  },
  agent: {
    runTask: (taskId, options) => ipcRenderer.invoke('agent:runTask', taskId, options),
    cancel: () => ipcRenderer.invoke('agent:cancel'),
    isRunning: () => ipcRenderer.invoke('agent:isRunning'),
    getCurrentRun: () => ipcRenderer.invoke('agent:getCurrentRun'),
    onStreamUpdate: (callback: (data: { taskId: string; taskTitle?: string; content: string; done: boolean; cancelled?: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { taskId: string; taskTitle?: string; content: string; done: boolean; cancelled?: boolean }) => callback(data);
      ipcRenderer.on('agent:stream-update', handler);
      return () => ipcRenderer.removeListener('agent:stream-update', handler);
    },
  },
  ralph: {
    start: (options) => ipcRenderer.invoke('ralph:start', options),
    stop: () => ipcRenderer.invoke('ralph:stop'),
    pause: () => ipcRenderer.invoke('ralph:pause'),
    resume: () => ipcRenderer.invoke('ralph:resume'),
    getProgress: () => ipcRenderer.invoke('ralph:getProgress'),
    isRunning: () => ipcRenderer.invoke('ralph:isRunning'),
  },
  runs: {
    getLog: (taskId, runId) => ipcRenderer.invoke('runs:getLog', taskId, runId),
    tailLog: (taskId, runId, lines) => ipcRenderer.invoke('runs:tailLog', taskId, runId, lines),
    getMetadata: (taskId, runId) => ipcRenderer.invoke('runs:getMetadata', taskId, runId),
  },
  context: {
    getProject: () => ipcRenderer.invoke('context:getProject'),
    saveProject: (context) => ipcRenderer.invoke('context:saveProject', context),
    getRepoIndex: () => ipcRenderer.invoke('context:getRepoIndex'),
    saveRepoIndex: (index) => ipcRenderer.invoke('context:saveRepoIndex', index),
  },
  chat: {
    getAll: () => ipcRenderer.invoke('chat:getAll'),
    get: (chatId) => ipcRenderer.invoke('chat:get', chatId),
    create: (title) => ipcRenderer.invoke('chat:create', title),
    delete: (chatId) => ipcRenderer.invoke('chat:delete', chatId),
    sendMessage: (chatId, content, mode) => ipcRenderer.invoke('chat:sendMessage', chatId, content, mode),
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { chatId: string; content: string; done: boolean }) => callback(data);
      ipcRenderer.on('chat:stream-update', handler);
      return () => ipcRenderer.removeListener('chat:stream-update', handler);
    },
  },
  settings: {
    getProvider: () => ipcRenderer.invoke('settings:getProvider'),
    getAvailableProviders: () => ipcRenderer.invoke('settings:getAvailableProviders'),
    setProvider: (providerType, apiKey) => ipcRenderer.invoke('settings:setProvider', providerType, apiKey),
    setApiKey: (apiKey) => ipcRenderer.invoke('settings:setApiKey', apiKey),
    testProvider: () => ipcRenderer.invoke('settings:testProvider'),
    getProject: () => ipcRenderer.invoke('settings:getProject'),
    saveProject: (settings) => ipcRenderer.invoke('settings:saveProject', settings),
    updateProject: (patch) => ipcRenderer.invoke('settings:updateProject', patch),
    detectCommands: () => ipcRenderer.invoke('settings:detectCommands'),
    getEffectiveCommand: (type) => ipcRenderer.invoke('settings:getEffectiveCommand', type),
    testSound: (preset) => ipcRenderer.invoke('settings:testSound', preset),
    getSoundPresets: () => ipcRenderer.invoke('settings:getSoundPresets'),
    getPresetThemes: () => ipcRenderer.invoke('settings:getPresetThemes'),
    getPresetTheme: (themeId) => ipcRenderer.invoke('settings:getPresetTheme', themeId),
  },
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    create: () => ipcRenderer.invoke('project:create'),
    openPath: (path) => ipcRenderer.invoke('project:openPath', path),
    close: () => ipcRenderer.invoke('project:close'),
    getCurrent: () => ipcRenderer.invoke('project:getCurrent'),
    getRecent: () => ipcRenderer.invoke('project:getRecent'),
    onProjectChanged: (callback: (path: string | null) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, path: string | null) => callback(path);
      ipcRenderer.on('project:changed', handler);
      return () => ipcRenderer.removeListener('project:changed', handler);
    },
    onProjectOpening: (callback: (path: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path);
      ipcRenderer.on('project:opening', handler);
      return () => ipcRenderer.removeListener('project:opening', handler);
    },
    onOpenShortcut: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('shortcut:open-project', handler);
      return () => ipcRenderer.removeListener('shortcut:open-project', handler);
    },
    startRun: () => ipcRenderer.invoke('project:startRun'),
    stopRun: () => ipcRenderer.invoke('project:stopRun'),
    startBuild: () => ipcRenderer.invoke('project:startBuild'),
    stopBuild: () => ipcRenderer.invoke('project:stopBuild'),
    getProcessStatus: (type) => ipcRenderer.invoke('project:getProcessStatus', type),
    getAllProcessStatus: () => ipcRenderer.invoke('project:getAllProcessStatus'),
    onStatusUpdate: (callback: (status: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
      ipcRenderer.on('project:status-update', handler);
      return () => ipcRenderer.removeListener('project:status-update', handler);
    },
    onOutput: (callback: (data: { type: string; runId: string; data: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { type: string; runId: string; data: string }) => callback(data);
      ipcRenderer.on('project:output', handler);
      return () => ipcRenderer.removeListener('project:output', handler);
    },
  },
  theme: {
    getAll: () => ipcRenderer.invoke('theme:getAll'),
    getActive: () => ipcRenderer.invoke('theme:getActive'),
    load: (themeId) => ipcRenderer.invoke('theme:load', themeId),
    setActive: (themeId) => ipcRenderer.invoke('theme:setActive', themeId),
    save: (theme) => ipcRenderer.invoke('theme:save', theme),
    create: (name, baseThemeId) => ipcRenderer.invoke('theme:create', name, baseThemeId),
    delete: (themeId) => ipcRenderer.invoke('theme:delete', themeId),
    import: (jsonString) => ipcRenderer.invoke('theme:import', jsonString),
    export: (themeId) => ipcRenderer.invoke('theme:export', themeId),
    getFilePath: (themeId) => ipcRenderer.invoke('theme:getFilePath', themeId),
    openInEditor: (themeId) => ipcRenderer.invoke('theme:openInEditor', themeId),
    getCSS: (themeId) => ipcRenderer.invoke('theme:getCSS', themeId),
    onChanged: (callback: (data: { theme: unknown; css: { light: string; dark: string } }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { theme: unknown; css: { light: string; dark: string } }) => callback(data);
      ipcRenderer.on('theme:changed', handler);
      return () => ipcRenderer.removeListener('theme:changed', handler);
    },
  },
  plugin: {
    getAll: () => ipcRenderer.invoke('plugin:getAll'),
    get: (pluginId) => ipcRenderer.invoke('plugin:get', pluginId),
    enable: (pluginId) => ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId) => ipcRenderer.invoke('plugin:disable', pluginId),
    getSettings: (pluginId) => ipcRenderer.invoke('plugin:getSettings', pluginId),
    setSettings: (pluginId, settings) => ipcRenderer.invoke('plugin:setSettings', pluginId, settings),
    // UI Extensions
    getTabs: () => ipcRenderer.invoke('plugin:getTabs'),
    getTabsByPosition: (position) => ipcRenderer.invoke('plugin:getTabsByPosition', position),
    getContextMenuItems: () => ipcRenderer.invoke('plugin:getContextMenuItems'),
    getContextMenuItemsByLocation: (location) => ipcRenderer.invoke('plugin:getContextMenuItemsByLocation', location),
    executeContextMenuItem: (itemId, context) => ipcRenderer.invoke('plugin:executeContextMenuItem', itemId, context),
    callApi: (pluginId, methodName, ...args) => ipcRenderer.invoke('plugin:callApi', pluginId, methodName, ...args),
    getUIContributions: () => ipcRenderer.invoke('plugin:getUIContributions'),
  },
  opencode: {
    isInstalled: () => ipcRenderer.invoke('opencode:isInstalled'),
    getBinaryPath: () => ipcRenderer.invoke('opencode:getBinaryPath'),
    getVersion: () => ipcRenderer.invoke('opencode:getVersion'),
    getLatestRelease: () => ipcRenderer.invoke('opencode:getLatestRelease'),
    checkUpdates: () => ipcRenderer.invoke('opencode:checkUpdates'),
    install: () => ipcRenderer.invoke('opencode:install'),
    update: () => ipcRenderer.invoke('opencode:update'),
    uninstall: () => ipcRenderer.invoke('opencode:uninstall'),
    onInstallProgress: (callback: (progress: {
      phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
      percent: number;
      message: string;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: {
        phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
        percent: number;
        message: string;
      }) => callback(progress);
      ipcRenderer.on('opencode:install-progress', handler);
      return () => ipcRenderer.removeListener('opencode:install-progress', handler);
    },
    onSetupStatus: (callback: (status: {
      installed: boolean;
      version: string | null;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: {
        installed: boolean;
        version: string | null;
      }) => callback(status);
      ipcRenderer.on('opencode:setup-status', handler);
      return () => ipcRenderer.removeListener('opencode:setup-status', handler);
    },
  },
};

contextBridge.exposeInMainWorld('dexteria', api);

// ============================================
// Global Type Declaration
// ============================================

declare global {
  interface Window {
    dexteria: DexteriaAPI;
  }
}
