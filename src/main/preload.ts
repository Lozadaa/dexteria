import { contextBridge, ipcRenderer } from 'electron';
import type {
  Board,
  Task,
  TaskComment,
  TaskPatch,
  TaskStatus,
  AgentState,
  Policy,
  ProjectContext,
  RepoIndex,
  ChatIndex,
  Chat,
  AgentRun,
  CustomTheme,
  PluginInfo,
  UIContributions,
  ProjectSettings,
  ProjectProcessStatus,
  GitStatus,
  BranchInfo,
  CommitInfo,
  GitCommandResult,
  GitSafetyCheck,
  MergeResult,
  ConflictInfo,
  TaskBranchMapping,
  GitOperationLog,
  GitConfig,
  CreateTaskBranchOptions,
  CommitOptions,
  MergeOptions,
  ResolveConflictOptions,
  AppUpdateInfo,
  AppUpdateProgress,
  UpdatePreferences,
  Skill,
  TaskTemplate,
  ActivityEntry,
} from '../shared/types';

/** Clarification request from a task */
export interface ClarificationRequest {
  commentId: string;
  runId?: string;
  reason: string;
  question: string;
  timestamp: string;
  resolved: boolean;
}

/**
 * Dexteria Preload Script
 *
 * Exposes a safe, limited API to the renderer process.
 * All communication with the main process goes through this bridge.
 */

// ============================================
// Response Types
// ============================================

/** Result of task state analysis */
export interface TaskAnalysisResult {
  success: boolean;
  summary: string;
  criteria: { criterion: string; passed: boolean; evidence: string }[];
  suggestedStatus: TaskStatus;
  error?: string;
}

/** Comment context for a task */
export interface TaskCommentContext {
  formattedContext: string;
  failureCount: number;
  hasUnresolvedClarifications: boolean;
}

/** Agent run result */
export interface AgentRunResult {
  success: boolean;
  run: AgentRun;
  error?: string;
}

/** Ralph mode progress */
export interface RalphProgress {
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  status: 'idle' | 'running' | 'paused' | 'stopped';
}

/** Ralph mode result */
export interface RalphResult {
  success: boolean;
  processed: number;
  completed: number;
  failed: number;
  blocked: number;
  stoppedReason?: string;
}

/** Provider info */
export interface ProviderInfo {
  name: string;
  ready: boolean;
  providerReady: boolean;
  type: 'mock' | 'anthropic' | 'claude-code' | 'opencode' | 'codex';
}

/** Provider type */
export type ProviderType = 'mock' | 'anthropic' | 'claude-code' | 'opencode' | 'codex';

/** Available providers response */
export interface AvailableProvidersResponse {
  providers: Array<{ type: ProviderType; name: string; description: string; available: boolean }>;
  current: ProviderType;
}

/** Project action result */
export interface ProjectActionResult {
  success: boolean;
  path?: string;
  error?: string;
}

/** Recent project entry */
export interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

/** Process run result */
export interface ProcessRunResult {
  runId: string;
  success: boolean;
  logPath: string;
  error?: string;
}

/** Theme index entry */
export interface ThemeIndexEntry {
  id: string;
  name: string;
  isBuiltIn: boolean;
  path: string;
}

/** Theme set result */
export interface ThemeSetResult {
  success: boolean;
  theme?: CustomTheme;
  css?: { light: string; dark: string };
}

/** Plugin enable/disable result */
export interface PluginActionResult {
  success: boolean;
  error?: string;
}

/** OpenCode release info */
export interface OpenCodeRelease {
  version: string;
  assetUrl: string;
  assetName: string;
}

/** OpenCode update check result */
export interface OpenCodeUpdateCheck {
  updateAvailable: boolean;
  currentVersion: string | null;
  latestVersion: string;
  error?: string;
}

/** OpenCode install progress */
export interface OpenCodeInstallProgress {
  phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
  percent: number;
  message: string;
}

/** Codex CLI install progress */
export interface CodexInstallProgress {
  phase: 'checking' | 'installing' | 'verifying' | 'complete' | 'error';
  percent: number;
  message: string;
}

/** VSCode status */
export interface VSCodeStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
}

/** VSCode preference */
export interface VSCodePreference {
  wantsCodeViewing: boolean;
  setAt?: string;
}

// ============================================
// API Type Definitions
// ============================================

export interface DexteriaAPI {
  app: {
    getVersion: () => Promise<string>;
    getName: () => Promise<string>;
    getProjectRoot: () => Promise<string>;
    restart: () => Promise<void>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
  board: {
    get: () => Promise<Board>;
    save: (board: Board) => Promise<void>;
  };
  tasks: {
    getAll: () => Promise<Task[]>;
    get: (taskId: string) => Promise<Task | null>;
    create: (title: string, status?: TaskStatus) => Promise<Task>;
    update: (taskId: string, patch: TaskPatch) => Promise<Task>;
    delete: (taskId: string) => Promise<void>;
    move: (taskId: string, toColumnId: TaskStatus, newOrder?: number) => Promise<void>;
    addComment: (taskId: string, comment: TaskComment) => Promise<void>;
    addTypedComment: (
      taskId: string,
      type: TaskComment['type'],
      author: string,
      content: string,
      runId?: string
    ) => Promise<TaskComment>;
    getPending: (strategy?: 'fifo' | 'priority' | 'dependency') => Promise<Task[]>;
    analyzeState: (taskId: string) => Promise<TaskAnalysisResult>;
    getCommentContext: (taskId: string) => Promise<TaskCommentContext>;
    getPendingClarifications: (taskId: string) => Promise<ClarificationRequest[]>;
    markFailuresAddressed: (taskId: string, note?: string) => Promise<TaskComment>;
  };
  state: {
    get: () => Promise<AgentState>;
    set: (patch: Partial<AgentState>) => Promise<AgentState>;
  };
  policy: {
    get: () => Promise<Policy>;
    update: (policy: Policy) => Promise<{ success: boolean; error?: string }>;
  };
  activity: {
    getRecent: (limit?: number) => Promise<ActivityEntry[]>;
  };
  agent: {
    runTask: (taskId: string, options?: { mode?: 'manual' | 'dexter'; maxSteps?: number }) => Promise<AgentRunResult>;
    cancel: () => Promise<void>;
    isRunning: () => Promise<boolean>;
    getCurrentRun: () => Promise<AgentRun | null>;
    onStreamUpdate: (callback: (data: { taskId: string; taskTitle?: string; content: string; done: boolean; cancelled?: boolean }) => void) => () => void;
  };
  ralph: {
    start: (options?: { strategy?: 'fifo' | 'priority' | 'dependency'; maxTasks?: number; maxAttempts?: number }) => Promise<RalphResult>;
    stop: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    getProgress: () => Promise<RalphProgress>;
    isRunning: () => Promise<boolean>;
  };
  runs: {
    getLog: (taskId: string, runId: string) => Promise<string | null>;
    tailLog: (taskId: string, runId: string, lines?: number) => Promise<string | null>;
    getMetadata: (taskId: string, runId: string) => Promise<AgentRun | null>;
    list: (taskId: string) => Promise<AgentRun[]>;
    listAll: () => Promise<{ taskId: string; runs: AgentRun[] }[]>;
  };
  context: {
    getProject: () => Promise<ProjectContext>;
    saveProject: (context: ProjectContext) => Promise<void>;
    getRepoIndex: () => Promise<RepoIndex>;
    saveRepoIndex: (index: RepoIndex) => Promise<void>;
  };
  chat: {
    getAll: () => Promise<ChatIndex['chats']>;
    get: (chatId: string) => Promise<Chat | null>;
    create: (title: string) => Promise<Chat>;
    delete: (chatId: string) => Promise<boolean>;
    sendMessage: (chatId: string, content: string, mode?: 'planner' | 'agent', attachedFiles?: string[]) => Promise<Chat>;
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => () => void;
    onTaskRunRequested: (callback: (data: { taskId: string; taskTitle: string; reason: string }) => void) => () => void;
  };
  settings: {
    getProvider: () => Promise<ProviderInfo & { hasCompletedSetup: boolean }>;
    getAvailableProviders: () => Promise<AvailableProvidersResponse>;
    setProvider: (providerType: ProviderType, apiKey?: string) => Promise<{ success: boolean; provider: string; error?: string }>;
    setApiKey: (apiKey: string) => Promise<{ success: boolean; provider: string; error?: string }>;
    testProvider: () => Promise<{ success: boolean; message: string }>;
    // Setup wizard completion tracking
    completeSetup: () => Promise<{ success: boolean }>;
    resetSetup: () => Promise<{ success: boolean }>;
    clearAllData: () => Promise<{ success: boolean }>;
    // Project settings
    getProject: () => Promise<ProjectSettings>;
    saveProject: (settings: ProjectSettings) => Promise<{ success: boolean; error?: string }>;
    updateProject: (patch: Partial<ProjectSettings>) => Promise<{ success: boolean; settings?: ProjectSettings; error?: string }>;
    detectCommands: () => Promise<{ run?: string; build?: string; install?: string; packageManager?: string }>;
    getEffectiveCommand: (type: 'run' | 'build' | 'install') => Promise<string>;
    testSound: (preset: 'system' | 'chime' | 'bell' | 'success' | 'ding' | 'complete') => Promise<void>;
    getSoundPresets: () => Promise<Array<{ id: string; name: string; description: string }>>;
    getPresetThemes: () => Promise<Array<{
      id: string;
      name: string;
      description?: string;
      preview: { background: string; foreground: string; primary: string; accent: string };
    }>>;
    getPresetTheme: (themeId: string) => Promise<CustomTheme | null>;
    // VSCode preferences
    getVSCodePreference: () => Promise<VSCodePreference>;
    setVSCodePreference: (wantsCodeViewing: boolean) => Promise<{ success: boolean }>;
  };
  project: {
    open: () => Promise<ProjectActionResult>;
    create: () => Promise<ProjectActionResult>;
    createWithName: (name: string) => Promise<ProjectActionResult>;
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    close: () => Promise<void>;
    getCurrent: () => Promise<string | null>;
    getRecent: () => Promise<RecentProject[]>;
    onProjectChanged: (callback: (path: string | null) => void) => () => void;
    onProjectOpening: (callback: (path: string) => void) => () => void;
    onOpenShortcut: (callback: () => void) => () => void;
    startRun: () => Promise<ProcessRunResult>;
    stopRun: () => Promise<boolean>;
    startBuild: () => Promise<ProcessRunResult>;
    stopBuild: () => Promise<boolean>;
    getProcessStatus: (type: 'run' | 'build') => Promise<ProjectProcessStatus>;
    getAllProcessStatus: () => Promise<ProjectProcessStatus[]>;
    onStatusUpdate: (callback: (status: ProjectProcessStatus) => void) => () => void;
    onOutput: (callback: (data: { type: string; runId: string; data: string }) => void) => () => void;
  };
  theme: {
    getAll: () => Promise<ThemeIndexEntry[]>;
    getActive: () => Promise<CustomTheme | null>;
    load: (themeId: string) => Promise<CustomTheme | null>;
    setActive: (themeId: string) => Promise<ThemeSetResult>;
    save: (theme: CustomTheme) => Promise<{ success: boolean }>;
    create: (name: string, baseThemeId?: string) => Promise<CustomTheme | null>;
    delete: (themeId: string) => Promise<boolean>;
    import: (jsonString: string) => Promise<CustomTheme | null>;
    export: (themeId: string) => Promise<string | null>;
    getFilePath: (themeId: string) => Promise<string | null>;
    openInEditor: (themeId: string) => Promise<boolean>;
    getCSS: (themeId: string) => Promise<{ light: string; dark: string } | null>;
    onChanged: (callback: (data: { theme: CustomTheme; css: { light: string; dark: string } }) => void) => () => void;
  };
  plugin: {
    getAll: () => Promise<PluginInfo[]>;
    get: (pluginId: string) => Promise<PluginInfo | null>;
    enable: (pluginId: string) => Promise<PluginActionResult>;
    disable: (pluginId: string) => Promise<PluginActionResult>;
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
    executeContextMenuItem: (itemId: string, context: Record<string, unknown>) => Promise<void>;
    callApi: (pluginId: string, methodName: string, ...args: unknown[]) => Promise<unknown>;
    // UI Contributions
    getUIContributions: () => Promise<UIContributions>;
    // Import/Delete
    import: () => Promise<{ success: boolean; pluginId?: string; pluginName?: string; error?: string }>;
    importFromPath: (zipPath: string) => Promise<{ success: boolean; pluginId?: string; pluginName?: string; error?: string }>;
    delete: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
    getPluginsDirectory: () => Promise<string | null>;
  };
  opencode: {
    isInstalled: () => Promise<boolean>;
    getBinaryPath: () => Promise<string>;
    getVersion: () => Promise<string | null>;
    getLatestRelease: () => Promise<OpenCodeRelease | null>;
    checkUpdates: () => Promise<OpenCodeUpdateCheck>;
    install: () => Promise<{ success: boolean; version?: string; error?: string }>;
    update: () => Promise<{ success: boolean; version?: string; error?: string }>;
    uninstall: () => Promise<{ success: boolean; error?: string }>;
    onInstallProgress: (callback: (progress: OpenCodeInstallProgress) => void) => () => void;
    onSetupStatus: (callback: (status: { installed: boolean; version: string | null }) => void) => () => void;
  };
  codex: {
    isInstalled: () => Promise<boolean>;
    getVersion: () => Promise<string | null>;
    isNpmAvailable: () => Promise<boolean>;
    install: () => Promise<{ success: boolean; version?: string; error?: string }>;
    update: () => Promise<{ success: boolean; version?: string; error?: string }>;
    uninstall: () => Promise<{ success: boolean; error?: string }>;
    onInstallProgress: (callback: (progress: CodexInstallProgress) => void) => () => void;
  };
  vscode: {
    isInstalled: () => Promise<boolean>;
    getStatus: () => Promise<VSCodeStatus>;
    refresh: () => Promise<VSCodeStatus>;
    openProject: () => Promise<{ success: boolean; error?: string }>;
    openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
    openFile: (filePath: string, line?: number) => Promise<{ success: boolean; error?: string }>;
    getDownloadUrl: () => Promise<string>;
    openDownloadPage: () => Promise<void>;
  };
  git: {
    // Environment
    isInstalled: () => Promise<boolean>;
    getVersion: () => Promise<string | null>;
    getInstallInstructions: () => Promise<string>;
    // Repository
    isRepository: () => Promise<boolean>;
    initRepository: (defaultBranch?: string) => Promise<GitCommandResult>;
    getStatus: () => Promise<GitStatus>;
    getDefaultBranch: () => Promise<string>;
    // Branches
    listBranches: (includeRemote?: boolean) => Promise<BranchInfo[]>;
    createBranch: (name: string, base?: string) => Promise<GitCommandResult>;
    checkoutBranch: (name: string, create?: boolean) => Promise<GitCommandResult>;
    deleteBranch: (name: string, force?: boolean) => Promise<GitCommandResult>;
    branchExists: (name: string) => Promise<boolean>;
    // Task-Branch Mapping
    getTaskBranch: (taskId: string) => Promise<TaskBranchMapping | null>;
    getAllTaskBranches: () => Promise<TaskBranchMapping[]>;
    createTaskBranch: (options: CreateTaskBranchOptions) => Promise<{ success: boolean; branchName?: string; error?: string }>;
    checkoutTaskBranch: (taskId: string) => Promise<{ success: boolean; branchName?: string; error?: string }>;
    detachTaskBranch: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    deleteTaskBranch: (taskId: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
    // Commits
    stageFiles: (files: string[] | 'all') => Promise<GitCommandResult>;
    commit: (options: CommitOptions) => Promise<GitCommandResult>;
    getCommitHistory: (count?: number, branch?: string) => Promise<CommitInfo[]>;
    getHeadCommit: () => Promise<string | null>;
    // Merge
    mergeBranch: (options: MergeOptions) => Promise<MergeResult>;
    mergeTaskToReview: (taskId: string) => Promise<{ success: boolean; mergeResult?: MergeResult; error?: string }>;
    mergeTaskToMain: (taskId: string) => Promise<{ success: boolean; mergeResult?: MergeResult; error?: string }>;
    mergeReviewToMain: () => Promise<{ success: boolean; mergeResult?: MergeResult; error?: string }>;
    abortMerge: () => Promise<GitCommandResult>;
    // Conflicts
    getConflicts: () => Promise<ConflictInfo[]>;
    resolveConflict: (options: ResolveConflictOptions) => Promise<GitCommandResult>;
    // Remote
    push: (branch?: string, setUpstream?: boolean) => Promise<GitCommandResult>;
    pull: (branch?: string) => Promise<GitCommandResult>;
    fetch: (prune?: boolean) => Promise<GitCommandResult>;
    // Stash
    stash: (message?: string) => Promise<GitCommandResult>;
    stashPop: () => Promise<GitCommandResult>;
    stashList: () => Promise<string[]>;
    // Diff
    getStagedDiff: () => Promise<string>;
    getUnstagedDiff: () => Promise<string>;
    getDiff: (from: string, to: string) => Promise<string>;
    // Safety
    runSafetyCheck: (operation: string) => Promise<GitSafetyCheck>;
    // Logs
    getOperationLogs: (limit?: number, taskId?: string) => Promise<GitOperationLog[]>;
    // Sync & Utility
    syncWithBranches: () => Promise<void>;
    generateBranchName: (taskId: string, taskTitle: string) => Promise<string>;
    // Config
    getConfig: () => Promise<GitConfig>;
  };
  update: {
    check: () => Promise<AppUpdateInfo>;
    download: () => Promise<{ success: boolean; installerPath?: string; error?: string }>;
    installAndRestart: (installerPath: string) => Promise<{ success: boolean; error?: string }>;
    skipVersion: (version: string) => Promise<{ success: boolean; error?: string }>;
    getPreferences: () => Promise<UpdatePreferences | null>;
    setPreferences: (prefs: Partial<UpdatePreferences>) => Promise<{ success: boolean; error?: string }>;
    onDownloadProgress: (callback: (progress: AppUpdateProgress) => void) => () => void;
    onUpdateAvailable: (callback: (info: AppUpdateInfo) => void) => () => void;
  };
  skill: {
    getAll: () => Promise<Skill[]>;
    get: (skillId: string) => Promise<Skill | null>;
    enable: (skillId: string) => Promise<{ success: boolean }>;
    disable: (skillId: string) => Promise<{ success: boolean }>;
    install: (skill: Skill) => Promise<{ success: boolean }>;
    remove: (skillId: string) => Promise<{ success: boolean }>;
    import: (json: string) => Promise<{ success: boolean; skill?: Skill; error?: string }>;
    export: (skillId: string) => Promise<string | null>;
  };
  interview: {
    init: (config: unknown) => Promise<unknown>;
    resume: (projectPath: string) => Promise<unknown>;
    nextQuestion: () => Promise<unknown>;
    submitAnswer: (answer: unknown) => Promise<unknown>;
    getOptions: () => Promise<string[]>;
    skip: () => Promise<unknown>;
    getExample: () => Promise<string>;
    generateBrief: () => Promise<unknown>;
    generateBacklog: () => Promise<unknown>;
    createTasks: (projectPath: string) => Promise<unknown>;
    skipBacklog: () => Promise<unknown>;
    saveAndExit: () => Promise<unknown>;
    cancel: () => Promise<unknown>;
    getLocale: () => Promise<string>;
    isActive: () => Promise<boolean>;
    onStreamUpdate: (callback: (data: { type: string; content: string; done: boolean }) => void) => () => void;
  };
  template: {
    init: (projectRoot: string) => Promise<boolean>;
    getAll: () => Promise<TaskTemplate[]>;
    getById: (id: string) => Promise<TaskTemplate | null>;
    getByCategory: (category: string) => Promise<TaskTemplate[]>;
    getCategories: () => Promise<string[]>;
    create: (input: unknown) => Promise<TaskTemplate | null>;
    update: (id: string, input: unknown) => Promise<TaskTemplate | null>;
    delete: (id: string) => Promise<boolean>;
    apply: (templateId: string, variables: Record<string, string>) => Promise<Partial<TaskTemplate> | null>;
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
    restart: () => ipcRenderer.invoke('app:restart'),
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
    update: (policy) => ipcRenderer.invoke('policy:update', policy),
  },
  activity: {
    getRecent: (limit) => ipcRenderer.invoke('activity:getRecent', limit),
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
    list: (taskId) => ipcRenderer.invoke('runs:list', taskId),
    listAll: () => ipcRenderer.invoke('runs:listAll'),
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
    sendMessage: (chatId, content, mode, attachedFiles) => ipcRenderer.invoke('chat:sendMessage', chatId, content, mode, attachedFiles),
    onStreamUpdate: (callback: (data: { chatId: string; content: string; done: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { chatId: string; content: string; done: boolean }) => callback(data);
      ipcRenderer.on('chat:stream-update', handler);
      return () => ipcRenderer.removeListener('chat:stream-update', handler);
    },
    onTaskRunRequested: (callback: (data: { taskId: string; taskTitle: string; reason: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { taskId: string; taskTitle: string; reason: string }) => callback(data);
      ipcRenderer.on('chat:task-run-requested', handler);
      return () => ipcRenderer.removeListener('chat:task-run-requested', handler);
    },
  },
  settings: {
    getProvider: () => ipcRenderer.invoke('settings:getProvider'),
    getAvailableProviders: () => ipcRenderer.invoke('settings:getAvailableProviders'),
    setProvider: (providerType, apiKey) => ipcRenderer.invoke('settings:setProvider', providerType, apiKey),
    setApiKey: (apiKey) => ipcRenderer.invoke('settings:setApiKey', apiKey),
    testProvider: () => ipcRenderer.invoke('settings:testProvider'),
    // Setup wizard completion tracking
    completeSetup: () => ipcRenderer.invoke('settings:completeSetup'),
    resetSetup: () => ipcRenderer.invoke('settings:resetSetup'),
    clearAllData: () => ipcRenderer.invoke('settings:clearAllData'),
    // Project settings
    getProject: () => ipcRenderer.invoke('settings:getProject'),
    saveProject: (settings) => ipcRenderer.invoke('settings:saveProject', settings),
    updateProject: (patch) => ipcRenderer.invoke('settings:updateProject', patch),
    detectCommands: () => ipcRenderer.invoke('settings:detectCommands'),
    getEffectiveCommand: (type) => ipcRenderer.invoke('settings:getEffectiveCommand', type),
    testSound: (preset) => ipcRenderer.invoke('settings:testSound', preset),
    getSoundPresets: () => ipcRenderer.invoke('settings:getSoundPresets'),
    getPresetThemes: () => ipcRenderer.invoke('settings:getPresetThemes'),
    getPresetTheme: (themeId) => ipcRenderer.invoke('settings:getPresetTheme', themeId),
    // VSCode preferences
    getVSCodePreference: () => ipcRenderer.invoke('settings:getVSCodePreference'),
    setVSCodePreference: (wantsCodeViewing) => ipcRenderer.invoke('settings:setVSCodePreference', wantsCodeViewing),
  },
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    create: () => ipcRenderer.invoke('project:create'),
    createWithName: (name: string) => ipcRenderer.invoke('project:createWithName', name),
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
    onStatusUpdate: (callback: (status: ProjectProcessStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: ProjectProcessStatus) => callback(status);
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
    onChanged: (callback: (data: { theme: CustomTheme; css: { light: string; dark: string } }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { theme: CustomTheme; css: { light: string; dark: string } }) => callback(data);
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
    // Import/Delete
    import: () => ipcRenderer.invoke('plugin:import'),
    importFromPath: (zipPath) => ipcRenderer.invoke('plugin:importFromPath', zipPath),
    delete: (pluginId) => ipcRenderer.invoke('plugin:delete', pluginId),
    getPluginsDirectory: () => ipcRenderer.invoke('plugin:getPluginsDirectory'),
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
  codex: {
    isInstalled: () => ipcRenderer.invoke('codex:isInstalled'),
    getVersion: () => ipcRenderer.invoke('codex:getVersion'),
    isNpmAvailable: () => ipcRenderer.invoke('codex:isNpmAvailable'),
    install: () => ipcRenderer.invoke('codex:install'),
    update: () => ipcRenderer.invoke('codex:update'),
    uninstall: () => ipcRenderer.invoke('codex:uninstall'),
    onInstallProgress: (callback: (progress: {
      phase: 'checking' | 'installing' | 'verifying' | 'complete' | 'error';
      percent: number;
      message: string;
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: {
        phase: 'checking' | 'installing' | 'verifying' | 'complete' | 'error';
        percent: number;
        message: string;
      }) => callback(progress);
      ipcRenderer.on('codex:install-progress', handler);
      return () => ipcRenderer.removeListener('codex:install-progress', handler);
    },
  },
  vscode: {
    isInstalled: () => ipcRenderer.invoke('vscode:isInstalled'),
    getStatus: () => ipcRenderer.invoke('vscode:getStatus'),
    refresh: () => ipcRenderer.invoke('vscode:refresh'),
    openProject: () => ipcRenderer.invoke('vscode:openProject'),
    openFolder: (folderPath) => ipcRenderer.invoke('vscode:openFolder', folderPath),
    openFile: (filePath, line) => ipcRenderer.invoke('vscode:openFile', filePath, line),
    getDownloadUrl: () => ipcRenderer.invoke('vscode:getDownloadUrl'),
    openDownloadPage: () => ipcRenderer.invoke('vscode:openDownloadPage'),
  },
  git: {
    // Environment
    isInstalled: () => ipcRenderer.invoke('git:isInstalled'),
    getVersion: () => ipcRenderer.invoke('git:getVersion'),
    getInstallInstructions: () => ipcRenderer.invoke('git:getInstallInstructions'),
    // Repository
    isRepository: () => ipcRenderer.invoke('git:isRepository'),
    initRepository: (defaultBranch) => ipcRenderer.invoke('git:initRepository', defaultBranch),
    getStatus: () => ipcRenderer.invoke('git:getStatus'),
    getDefaultBranch: () => ipcRenderer.invoke('git:getDefaultBranch'),
    // Branches
    listBranches: (includeRemote) => ipcRenderer.invoke('git:listBranches', includeRemote),
    createBranch: (name, base) => ipcRenderer.invoke('git:createBranch', name, base),
    checkoutBranch: (name, create) => ipcRenderer.invoke('git:checkoutBranch', name, create),
    deleteBranch: (name, force) => ipcRenderer.invoke('git:deleteBranch', name, force),
    branchExists: (name) => ipcRenderer.invoke('git:branchExists', name),
    // Task-Branch Mapping
    getTaskBranch: (taskId) => ipcRenderer.invoke('git:getTaskBranch', taskId),
    getAllTaskBranches: () => ipcRenderer.invoke('git:getAllTaskBranches'),
    createTaskBranch: (options) => ipcRenderer.invoke('git:createTaskBranch', options),
    checkoutTaskBranch: (taskId) => ipcRenderer.invoke('git:checkoutTaskBranch', taskId),
    detachTaskBranch: (taskId) => ipcRenderer.invoke('git:detachTaskBranch', taskId),
    deleteTaskBranch: (taskId, force) => ipcRenderer.invoke('git:deleteTaskBranch', taskId, force),
    // Commits
    stageFiles: (files) => ipcRenderer.invoke('git:stageFiles', files),
    commit: (options) => ipcRenderer.invoke('git:commit', options),
    getCommitHistory: (count, branch) => ipcRenderer.invoke('git:getCommitHistory', count, branch),
    getHeadCommit: () => ipcRenderer.invoke('git:getHeadCommit'),
    // Merge
    mergeBranch: (options) => ipcRenderer.invoke('git:mergeBranch', options),
    mergeTaskToReview: (taskId) => ipcRenderer.invoke('git:mergeTaskToReview', taskId),
    mergeTaskToMain: (taskId) => ipcRenderer.invoke('git:mergeTaskToMain', taskId),
    mergeReviewToMain: () => ipcRenderer.invoke('git:mergeReviewToMain'),
    abortMerge: () => ipcRenderer.invoke('git:abortMerge'),
    // Conflicts
    getConflicts: () => ipcRenderer.invoke('git:getConflicts'),
    resolveConflict: (options) => ipcRenderer.invoke('git:resolveConflict', options),
    // Remote
    push: (branch, setUpstream) => ipcRenderer.invoke('git:push', branch, setUpstream),
    pull: (branch) => ipcRenderer.invoke('git:pull', branch),
    fetch: (prune) => ipcRenderer.invoke('git:fetch', prune),
    // Stash
    stash: (message) => ipcRenderer.invoke('git:stash', message),
    stashPop: () => ipcRenderer.invoke('git:stashPop'),
    stashList: () => ipcRenderer.invoke('git:stashList'),
    // Diff
    getStagedDiff: () => ipcRenderer.invoke('git:getStagedDiff'),
    getUnstagedDiff: () => ipcRenderer.invoke('git:getUnstagedDiff'),
    getDiff: (from, to) => ipcRenderer.invoke('git:getDiff', from, to),
    // Safety
    runSafetyCheck: (operation) => ipcRenderer.invoke('git:runSafetyCheck', operation),
    // Logs
    getOperationLogs: (limit, taskId) => ipcRenderer.invoke('git:getOperationLogs', limit, taskId),
    // Sync & Utility
    syncWithBranches: () => ipcRenderer.invoke('git:syncWithBranches'),
    generateBranchName: (taskId, taskTitle) => ipcRenderer.invoke('git:generateBranchName', taskId, taskTitle),
    // Config
    getConfig: () => ipcRenderer.invoke('git:getConfig'),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    installAndRestart: (installerPath) => ipcRenderer.invoke('update:installAndRestart', installerPath),
    skipVersion: (version) => ipcRenderer.invoke('update:skipVersion', version),
    getPreferences: () => ipcRenderer.invoke('update:getPreferences'),
    setPreferences: (prefs) => ipcRenderer.invoke('update:setPreferences', prefs),
    onDownloadProgress: (callback: (progress: AppUpdateProgress) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: AppUpdateProgress) => callback(progress);
      ipcRenderer.on('update:download-progress', handler);
      return () => ipcRenderer.removeListener('update:download-progress', handler);
    },
    onUpdateAvailable: (callback: (info: AppUpdateInfo) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, info: AppUpdateInfo) => callback(info);
      ipcRenderer.on('update:available', handler);
      return () => ipcRenderer.removeListener('update:available', handler);
    },
  },
  skill: {
    getAll: () => ipcRenderer.invoke('skill:getAll'),
    get: (skillId: string) => ipcRenderer.invoke('skill:get', skillId),
    enable: (skillId: string) => ipcRenderer.invoke('skill:enable', skillId),
    disable: (skillId: string) => ipcRenderer.invoke('skill:disable', skillId),
    install: (skill: Skill) => ipcRenderer.invoke('skill:install', skill),
    remove: (skillId: string) => ipcRenderer.invoke('skill:remove', skillId),
    import: (json: string) => ipcRenderer.invoke('skill:import', json),
    export: (skillId: string) => ipcRenderer.invoke('skill:export', skillId),
  },
  interview: {
    init: (config: unknown) => ipcRenderer.invoke('interview:init', config),
    resume: (projectPath: string) => ipcRenderer.invoke('interview:resume', projectPath),
    nextQuestion: () => ipcRenderer.invoke('interview:nextQuestion'),
    submitAnswer: (answer: unknown) => ipcRenderer.invoke('interview:submitAnswer', answer),
    getOptions: () => ipcRenderer.invoke('interview:getOptions'),
    skip: () => ipcRenderer.invoke('interview:skip'),
    getExample: () => ipcRenderer.invoke('interview:getExample'),
    generateBrief: () => ipcRenderer.invoke('interview:generateBrief'),
    generateBacklog: () => ipcRenderer.invoke('interview:generateBacklog'),
    createTasks: (projectPath: string) => ipcRenderer.invoke('interview:createTasks', projectPath),
    skipBacklog: () => ipcRenderer.invoke('interview:skipBacklog'),
    saveAndExit: () => ipcRenderer.invoke('interview:saveAndExit'),
    cancel: () => ipcRenderer.invoke('interview:cancel'),
    getLocale: () => ipcRenderer.invoke('interview:getLocale'),
    isActive: () => ipcRenderer.invoke('interview:isActive'),
    onStreamUpdate: (callback: (data: { type: string; content: string; done: boolean }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { type: string; content: string; done: boolean }) => callback(data);
      ipcRenderer.on('interview:stream-update', handler);
      return () => ipcRenderer.removeListener('interview:stream-update', handler);
    },
  },
  template: {
    init: (projectRoot: string) => ipcRenderer.invoke('template:init', projectRoot),
    getAll: () => ipcRenderer.invoke('template:getAll'),
    getById: (id: string) => ipcRenderer.invoke('template:getById', id),
    getByCategory: (category: string) => ipcRenderer.invoke('template:getByCategory', category),
    getCategories: () => ipcRenderer.invoke('template:getCategories'),
    create: (input: unknown) => ipcRenderer.invoke('template:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('template:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('template:delete', id),
    apply: (templateId: string, variables: Record<string, string>) => ipcRenderer.invoke('template:apply', templateId, variables),
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
