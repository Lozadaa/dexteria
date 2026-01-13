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

export interface NotificationSettings {
  soundOnTaskComplete: boolean;
  badgeOnTaskComplete: boolean;
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
