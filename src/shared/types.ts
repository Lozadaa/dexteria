/**
 * Core Type Definitions
 *
 * All shared types between main and renderer processes.
 */

// ============================================
// Task Types
// ============================================

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';

export type TaskRuntimeStatus = 'idle' | 'running' | 'blocked' | 'done' | 'failed';

export interface TaskComment {
  id: string;
  taskId: string;
  type: 'note' | 'instruction' | 'failure' | 'agent' | 'system';
  author: string;
  content: string;
  createdAt: string;
  runId?: string;
}

export interface TaskRuntimeState {
  status: TaskRuntimeStatus;
  currentRunId?: string;
  lastRunId?: string;
  lastRunAt?: string;
  runCount: number;
  failureCount?: number;
  totalDurationMs: number;
}

export interface TaskAgentConfig {
  goal: string;
  scope: string[];
  definitionOfDone: string[];
  dependencies?: string[];
}

export interface TaskEpic {
  name: string;
  color: string; // Hex color like "#3b82f6"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  order: number;
  acceptanceCriteria: string[];
  tags?: string[];
  dependsOn?: string[];
  epic?: TaskEpic;
  sprint?: string;
  comments: TaskComment[];
  agent: TaskAgentConfig;
  runtime: TaskRuntimeState;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TasksFile {
  tasks: Task[];
}

export interface TaskPatch {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  order?: number;
  acceptanceCriteria?: string[];
  tags?: string[];
  dependsOn?: string[];
  epic?: TaskEpic | null;
  sprint?: string | null;
  agent?: Partial<TaskAgentConfig>;
}

// ============================================
// Board Types
// ============================================

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
  wipLimit?: number;
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  taskId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatIndex {
  chats: {
    id: string;
    title: string;
    taskId?: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }[];
}

// ============================================
// Agent State Types
// ============================================

export interface RalphModeState {
  enabled: boolean;
  strategy: 'fifo' | 'priority' | 'dependency';
  startedAt?: string;
  processedCount: number;
  failedCount: number;
  currentTaskId?: string;
}

export type AgentMode = 'agent' | 'planner';

export interface AgentState {
  mode: 'manual' | 'ralph';
  agentMode: AgentMode; // 'agent' = can write code, 'planner' = read-only, task management only
  isRunning: boolean;
  activeTaskId: string | null;
  activeChatId?: string | null;
  lastUpdated: string;
  ralphMode: RalphModeState;
  lastTaskNumber: number; // Counter for sequential task IDs (TSK-001, TSK-002, etc.)
}

// ============================================
// Run Options Types
// ============================================

export interface RunTaskOptions {
  mode: 'manual' | 'dexter';
  maxSteps?: number;
}

export interface RalphModeOptions {
  strategy?: 'fifo' | 'priority' | 'dependency';
  stopOnBlocking?: boolean;
  maxTasks?: number;
  maxAttempts?: number; // Max retry attempts per task (default: 2)
}

// ============================================
// Agent Run Types
// ============================================

export interface AgentRunToolCall {
  timestamp: string;
  name: string;
  input: Record<string, unknown>;
  outputSummary: string;
  durationMs: number;
}

export interface AgentRunPatch {
  timestamp: string;
  path: string;
  diffSummary?: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface AgentRunCommand {
  timestamp: string;
  command: string;
  exitCode: number | null;
  durationMs: number;
  outputPath?: string;
}

export interface AcceptanceCriterionResult {
  criterion: string;
  passed: boolean;
  evidence: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  mode: 'manual' | 'dexter';
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled';
  steps: number;
  toolCalls: AgentRunToolCall[];
  patches: AgentRunPatch[];
  commands: AgentRunCommand[];
  filesModified: string[];
  acceptanceResults?: AcceptanceCriterionResult[];
  summary?: string;
  error?: string;
}

export interface CommandRunMetadata {
  runId: string;
  taskId: string;
  command: string;
  cwd: string;
  startedAt: string;
  completedAt: string;
  exitCode?: number;
  timedOut: boolean;
  logPath: string;
}

// ============================================
// Policy Types
// ============================================

export interface PolicyLimits {
  maxStepsPerRun: number;
  maxFilesPerRun: number;
  maxDiffLinesPerRun: number;
  maxRuntimeMinutes: number;
  allowedGlobs: string[];
  blockedGlobs: string[];
}

export interface ShellCommandPolicy {
  allowed: string[];
  blocked: string[];
  requireConfirmation: string[];
}

export interface Policy {
  allowedPaths: string[];
  allowedOperations: string[];
  blockedPaths: string[];
  blockedPatterns: string[];
  maxFileSize: number;
  shellCommands: ShellCommandPolicy;
  requireConfirmation: string[];
  limits: PolicyLimits;
}

// ============================================
// Context Types
// ============================================

export interface ProjectContext {
  name: string;
  description: string;
  purpose: string;
  architecture: Record<string, string>;
  devWorkflow: Record<string, string>;
  constraints: string[];
  updatedAt: string;
}

export interface RepoIndex {
  keyFiles: string[];
  importantPaths: string[];
  updatedAt: string;
}

// ============================================
// Activity Log Types
// ============================================

export type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'comment_added'
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'ralph_started'
  | 'ralph_stopped'
  | 'command_executed'
  | 'file_modified';

export interface ActivityEntry {
  timestamp: string;
  type: ActivityType;
  taskId?: string;
  chatId?: string;
  runId?: string;
  data: Record<string, unknown>;
}

// ============================================
// Agent Provider Types
// ============================================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: unknown;
}

export interface AgentToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  toolCalls?: AgentToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

// ============================================
// Settings Types
// ============================================

export interface ProjectCommand {
  cmd: string;
  cwd: string;
  autoDetect?: boolean;
  includesInstall?: boolean;
}

export type NotificationSound = 'system' | 'chime' | 'bell' | 'success' | 'ding' | 'complete';

export interface NotificationSettings {
  soundOnTaskComplete: boolean;
  badgeOnTaskComplete: boolean;
  sound: NotificationSound; // Selected notification sound preset
}

export interface ProjectCommandsSettings {
  run: ProjectCommand;
  build: ProjectCommand;
  install: ProjectCommand;
  allowUnsafeCommands: boolean;
}

export interface RunnerSettings {
  defaultTimeoutSec: number;
}

export interface ProjectSettings {
  version: number;
  notifications: NotificationSettings;
  projectCommands: ProjectCommandsSettings;
  runner: RunnerSettings;
}

export interface DetectedCommands {
  run?: string;
  build?: string;
  install?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

// ============================================
// Project Process Types
// ============================================

export type ProjectProcessType = 'run' | 'build';

export interface ProjectProcessStatus {
  type: ProjectProcessType;
  running: boolean;
  pid?: number;
  runId?: string;
  startedAt?: string;
  command?: string;
}

export interface ProjectRunResult {
  runId: string;
  success: boolean;
  exitCode?: number;
  logPath: string;
  error?: string;
}

// ============================================
// IPC Channels
// ============================================

export const IPC_CHANNELS = {
  GET_BOARD: 'kanban:getBoard',
  GET_TASKS: 'kanban:getTasks',
  MOVE_TASK: 'kanban:moveTask',
  GET_CHATS: 'chat:getChats',
  SEND_MESSAGE: 'chat:sendMessage',
  GET_STATE: 'agent:getState',
} as const;

// ============================================
// Theme Types
// ============================================

/**
 * HSL color value without the hsl() wrapper
 * Format: "hue saturation% lightness%"
 * Example: "221.2 83.2% 53.3%"
 */
export type HSLValue = string;

/**
 * Core color tokens for the UI
 */
export interface ThemeColorTokens {
  background: HSLValue;
  foreground: HSLValue;
  card: HSLValue;
  cardForeground: HSLValue;
  popover: HSLValue;
  popoverForeground: HSLValue;
  primary: HSLValue;
  primaryForeground: HSLValue;
  secondary: HSLValue;
  secondaryForeground: HSLValue;
  muted: HSLValue;
  mutedForeground: HSLValue;
  accent: HSLValue;
  accentForeground: HSLValue;
  destructive: HSLValue;
  destructiveForeground: HSLValue;
  border: HSLValue;
  input: HSLValue;
  ring: HSLValue;
}

/**
 * Code editor color tokens
 */
export interface ThemeCodeTokens {
  background: HSLValue;
  foreground: HSLValue;
  comment: HSLValue;
  keyword: HSLValue;
  string: HSLValue;
  number: HSLValue;
  function: HSLValue;
  operator: HSLValue;
  variable: HSLValue;
  class: HSLValue;
}

/**
 * Diff viewer color tokens
 */
export interface ThemeDiffTokens {
  addBackground: HSLValue;
  addForeground: HSLValue;
  removeBackground: HSLValue;
  removeForeground: HSLValue;
  changeBackground: HSLValue;
  changeForeground: HSLValue;
}

/**
 * Terminal color tokens
 */
export interface ThemeTerminalTokens {
  background: HSLValue;
  foreground: HSLValue;
  cursor: HSLValue;
  selection: HSLValue;
}

/**
 * Complete color palette for a theme mode (light/dark)
 */
export interface ThemeColors {
  core: ThemeColorTokens;
  code: ThemeCodeTokens;
  diff: ThemeDiffTokens;
  terminal: ThemeTerminalTokens;
  lineNumber: HSLValue;
  lineHighlight: HSLValue;
}

/**
 * Font configuration
 */
export interface ThemeFonts {
  sans: string;
  mono: string;
  display: string;
  baseFontSize: string;
  codeFontSize: string;
}

/**
 * Complete theme definition
 * Note: Themes no longer have separate light/dark modes.
 * Each theme defines its own colors directly.
 */
export interface CustomTheme {
  id: string;
  name: string;
  version: number;
  author?: string;
  description?: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Theme index stored in .local-kanban/themes/index.json
 */
export interface ThemeIndex {
  version: number;
  activeThemeId: string | null;
  themes: Array<{
    id: string;
    name: string;
    isBuiltIn: boolean;
    path: string;
  }>;
}

/**
 * Simplified theme preset for quick selection
 */
export interface ThemePreset {
  id: string;
  name: string;
  preview: {
    primary: HSLValue;
    background: HSLValue;
    foreground: HSLValue;
  };
}

// ============================================
// Plugin System Types
// ============================================

/**
 * Plugin permission levels for different resources
 */
export type PluginPermissionLevel = 'none' | 'read' | 'write' | 'full';
export type PluginAgentPermission = 'none' | 'read' | 'execute';
export type PluginTerminalPermission = 'none' | 'read' | 'execute';
export type PluginNetworkPermission = 'none' | 'local' | 'restricted' | 'full';

/**
 * UI permissions for plugins
 */
export interface PluginUIPermissions {
  tabs?: boolean;
  sidebars?: boolean;
  modals?: boolean;
  contextMenus?: boolean;
  notifications?: boolean;
}

/**
 * Complete plugin permissions definition
 */
export interface PluginPermissions {
  tasks?: PluginPermissionLevel;
  chat?: PluginPermissionLevel;
  agent?: PluginAgentPermission;
  files?: PluginPermissionLevel;
  terminal?: PluginTerminalPermission;
  settings?: PluginPermissionLevel;
  ui?: PluginUIPermissions;
  network?: PluginNetworkPermission;
}

/**
 * Command contribution from a plugin
 */
export interface PluginCommandContribution {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
}

/**
 * Tab contribution from a plugin
 */
export interface PluginTabContribution {
  id: string;
  title: string;
  icon: string;
  component: string;
  position?: 'before' | 'after';
}

/**
 * Context menu contribution from a plugin
 */
export interface PluginContextMenuContribution {
  location: 'task-card' | 'chat-message' | 'board-column' | 'file';
  items: {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    action: string;
    when?: string;
  }[];
}

/**
 * Hook contribution from a plugin
 */
export interface PluginHookContribution {
  hook: string;
  handler: string;
  priority?: number;
}

/**
 * Setting contribution from a plugin
 */
export interface PluginSettingContribution {
  id: string;
  title: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default: unknown;
  description?: string;
  options?: { label: string; value: unknown }[];
}

/**
 * Plugin contributions (extensions to the app)
 */
export interface PluginContributions {
  commands?: PluginCommandContribution[];
  tabs?: PluginTabContribution[];
  contextMenus?: PluginContextMenuContribution[];
  hooks?: PluginHookContribution[];
  settings?: PluginSettingContribution[];
}

/**
 * Plugin manifest - describes a plugin's capabilities
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  main?: string;
  renderer?: string;
  permissions: PluginPermissions;
  contributes?: PluginContributions;
}

/**
 * Plugin state during runtime
 */
export type PluginState = 'installed' | 'disabled' | 'enabled' | 'active' | 'error';

/**
 * Runtime information about a loaded plugin
 */
export interface PluginInfo {
  manifest: PluginManifest;
  state: PluginState;
  path: string;
  error?: string;
  loadedAt?: string;
  activatedAt?: string;
}

/**
 * Plugin index stored in .local-kanban/plugins/index.json
 */
export interface PluginIndex {
  version: number;
  enabled: string[];
  disabled: string[];
  settings: Record<string, Record<string, unknown>>;
}

/**
 * Hook context for chat:beforeSend
 */
export interface ChatBeforeSendContext {
  message: string;
  chatId: string;
  mode: 'agent' | 'planner';
}

/**
 * Hook result for chat:beforeSend
 */
export interface ChatBeforeSendResult {
  message: string;
  cancel?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Hook context for chat:afterResponse
 */
export interface ChatAfterResponseContext {
  response: string;
  chatId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook result for chat:afterResponse
 */
export interface ChatAfterResponseResult {
  response: string;
}

// ============================================
// Task/Kanban Hook Types
// ============================================

/**
 * Task priority type
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Task creation input for beforeCreate hook
 */
export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: string;
  priority?: TaskPriority;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  tags?: string[];
}

// Note: TaskPatch is already defined above in the Task-related types section

/**
 * Hook context for task:beforeCreate
 */
export interface TaskBeforeCreateContext {
  input: TaskCreateInput;
}

/**
 * Hook result for task:beforeCreate
 */
export interface TaskBeforeCreateResult {
  input: TaskCreateInput;
  cancel?: boolean;
}

/**
 * Hook context for task:afterCreate
 */
export interface TaskAfterCreateContext {
  task: Task;
}

/**
 * Hook context for task:beforeUpdate
 */
export interface TaskBeforeUpdateContext {
  taskId: string;
  patch: TaskPatch;
  task: Task;
}

/**
 * Hook result for task:beforeUpdate
 */
export interface TaskBeforeUpdateResult {
  patch: TaskPatch;
  cancel?: boolean;
}

/**
 * Hook context for task:afterUpdate
 */
export interface TaskAfterUpdateContext {
  task: Task;
  previousTask: Task;
}

/**
 * Hook context for task:beforeMove
 */
export interface TaskBeforeMoveContext {
  taskId: string;
  task: Task;
  fromColumn: string;
  toColumn: string;
}

/**
 * Hook result for task:beforeMove
 */
export interface TaskBeforeMoveResult {
  toColumn: string;
  cancel?: boolean;
}

/**
 * Hook context for task:afterMove
 */
export interface TaskAfterMoveContext {
  task: Task;
  fromColumn: string;
}

/**
 * Hook context for task:beforeDelete
 */
export interface TaskBeforeDeleteContext {
  taskId: string;
  task: Task;
}

/**
 * Hook result for task:beforeDelete
 */
export interface TaskBeforeDeleteResult {
  cancel?: boolean;
}

/**
 * Hook context for board:refresh
 */
export interface BoardRefreshContext {
  board: Board;
  tasks: Task[];
}

// ============================================
// Agent Execution Hook Types
// ============================================

/**
 * Hook context for agent:beforeRun
 */
export interface AgentBeforeRunContext {
  taskId: string;
  task: Task;
  runId: string;
  mode: 'agent' | 'planner';
}

/**
 * Hook result for agent:beforeRun
 */
export interface AgentBeforeRunResult {
  cancel?: boolean;
  modifiedTask?: Partial<Task>;
}

/**
 * Hook context for agent:afterRun
 */
export interface AgentAfterRunContext {
  taskId: string;
  task: Task;
  runId: string;
  success: boolean;
  error?: string;
  filesModified?: string[];
  summary?: string;
}

/**
 * Hook context for agent:onToolCall
 */
export interface AgentToolCallContext {
  taskId: string;
  runId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  stepNumber: number;
}

/**
 * Hook result for agent:onToolCall
 */
export interface AgentToolCallResult {
  cancel?: boolean;
  modifiedInput?: Record<string, unknown>;
}

/**
 * Hook context for agent:onStep
 */
export interface AgentStepContext {
  taskId: string;
  runId: string;
  stepNumber: number;
  content: string;
  isComplete: boolean;
}

// ============================================
// Plugin UI Extension Types
// ============================================

/**
 * Plugin-registered custom tab
 */
export interface PluginTab {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  order?: number;
  component: string; // Path to the component file or inline HTML
  componentType: 'html' | 'url' | 'iframe';
}

/**
 * Plugin-registered context menu item
 */
export interface PluginContextMenuItem {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  location: 'task' | 'board' | 'column';
  order?: number;
}

// ============================================
// UI Extension Points (Slots) System
// ============================================

/**
 * Available extension slot IDs in the application
 */
export type ExtensionSlotId =
  | 'settings:tab'
  | 'docking:panel'
  | 'topbar:left'
  | 'topbar:right'
  | 'task-detail:sidebar'
  | 'task-detail:footer'
  | 'task-card:badge'
  | 'bottom-panel:tab';

/**
 * Settings tab contribution from a plugin
 */
export interface PluginSettingsTabContribution {
  id: string;
  title: string;
  icon: string;
  order?: number;
}

/**
 * Docking panel contribution from a plugin
 */
export interface PluginDockingPanelContribution {
  id: string;
  title: string;
  icon: string;
  singleton?: boolean;
  defaultPosition?: 'left' | 'right' | 'bottom';
}

/**
 * Slot contribution from a plugin
 */
export interface PluginSlotContribution {
  slotId: ExtensionSlotId;
  order?: number;
  when?: string;
}

/**
 * Renderer entry configuration for plugins
 */
export interface PluginRendererConfig {
  entry: string;
  styles?: string;
}

/**
 * Extended plugin contributions including UI extensions
 */
export interface PluginContributionsExtended extends PluginContributions {
  settingsTab?: PluginSettingsTabContribution;
  dockingPanels?: PluginDockingPanelContribution[];
  slots?: PluginSlotContribution[];
}

/**
 * Extended plugin manifest with full UI contribution support
 */
export interface PluginManifestExtended extends Omit<PluginManifest, 'contributes' | 'renderer'> {
  contributes?: PluginContributionsExtended;
  renderer?: PluginRendererConfig | string;
}

/**
 * UI contribution from a plugin (returned to renderer)
 */
export interface PluginUIContribution {
  pluginId: string;
  pluginPath: string;
  settingsTab?: PluginSettingsTabContribution;
  dockingPanels?: PluginDockingPanelContribution[];
  slots?: PluginSlotContribution[];
  renderer?: PluginRendererConfig;
}

/**
 * All UI contributions from all active plugins
 */
export interface UIContributions {
  settingsTabs: Array<PluginSettingsTabContribution & { pluginId: string; pluginPath: string }>;
  dockingPanels: Array<PluginDockingPanelContribution & { pluginId: string; pluginPath: string }>;
  slots: Record<ExtensionSlotId, Array<PluginSlotContribution & { pluginId: string; pluginPath: string }>>;
}
