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
    sendMessage: (chatId: string, content: string, mode?: 'planner' | 'agent') => Promise<unknown>;
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => () => void;
  };
  settings: {
    getProvider: () => Promise<{
      name: string;
      ready: boolean;
      type: 'mock' | 'anthropic' | 'claude-code';
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
    sendMessage: (chatId, content, mode) => ipcRenderer.invoke('chat:sendMessage', chatId, content, mode),
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { chatId: string; content: string; done: boolean }) => callback(data);
      ipcRenderer.on('chat:stream-update', handler);
      return () => ipcRenderer.removeListener('chat:stream-update', handler);
    },
  },
  settings: {
    getProvider: () => ipcRenderer.invoke('settings:getProvider'),
    setApiKey: (apiKey) => ipcRenderer.invoke('settings:setApiKey', apiKey),
    testProvider: () => ipcRenderer.invoke('settings:testProvider'),
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
