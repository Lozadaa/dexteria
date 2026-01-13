/**
 * Dexteria Shared Schemas
 *
 * Zod schemas for validating all JSON files in .local-kanban/
 * Factory functions for creating entities with proper defaults.
 */

import { z } from 'zod';
import type {
  Task,
  Board,
  Chat,
  AgentState,
  ProjectContext,
  RepoIndex,
  Policy,
  ChatIndex,
  TaskStatus,
  TaskComment,
  TaskRuntimeState,
  AgentRun,
  ActivityEntry,
} from './types';

// ============================================
// Primitive Schemas
// ============================================

export const TaskStatusSchema = z.enum(['backlog', 'todo', 'doing', 'review', 'done']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const TaskRuntimeStatusSchema = z.enum(['idle', 'running', 'blocked', 'done', 'failed']);
export const CommentTypeSchema = z.enum(['note', 'instruction', 'failure', 'agent', 'system']);
export const AgentModeSchema = z.enum(['manual', 'ralph']);
export const AgentModeTypeSchema = z.enum(['agent', 'planner']); // agent = can write code, planner = read-only
export const AgentRunStatusSchema = z.enum(['running', 'completed', 'blocked', 'failed', 'cancelled']);
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

export const ActivityTypeSchema = z.enum([
  'task_updated',
  'task_moved',
  'comment_added',
  'agent_started',
  'agent_completed',
  'agent_failed',
  'ralph_started',
  'ralph_stopped',
  'command_executed',
  'file_modified',
]);

// ============================================
// Task Schemas
// ============================================

export const TaskAgentSchema = z.object({
  goal: z.string(),
  scope: z.array(z.string()),
  definitionOfDone: z.array(z.string()),
  dependencies: z.array(z.string()).optional(),
});

export const TaskCommentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  type: CommentTypeSchema,
  author: z.string(),
  content: z.string(),
  createdAt: z.string(),
  runId: z.string().optional(),
});

export const TaskRuntimeSchema = z.object({
  status: TaskRuntimeStatusSchema,
  currentRunId: z.string().optional(),
  lastRunId: z.string().optional(),
  lastRunAt: z.string().optional(),
  runCount: z.number().int().min(0),
  failureCount: z.number().int().min(0).optional(),
  totalDurationMs: z.number().min(0),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  order: z.number().int().min(0),
  acceptanceCriteria: z.array(z.string()), // Allow empty array
  tags: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  comments: z.array(TaskCommentSchema),
  agent: TaskAgentSchema,
  runtime: TaskRuntimeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema),
});

// ============================================
// Board Schemas
// ============================================

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  taskIds: z.array(z.string()),
  wipLimit: z.number().optional(),
});

export const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(ColumnSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// Chat Schemas
// ============================================

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
});

export const ChatSchema = z.object({
  id: z.string(),
  title: z.string(),
  taskId: z.string().optional(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ChatIndexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int().min(0),
});

export const ChatIndexSchema = z.object({
  chats: z.array(ChatIndexEntrySchema),
});

// ============================================
// Agent State Schemas
// ============================================

export const RalphModeStateSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(['fifo', 'priority', 'dependency']),
  startedAt: z.string().optional(),
  processedCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  currentTaskId: z.string().optional(),
});

export const AgentStateSchema = z.object({
  mode: AgentModeSchema,
  agentMode: AgentModeTypeSchema,
  isRunning: z.boolean(),
  activeTaskId: z.string().nullable(),
  activeChatId: z.union([z.string(), z.null()]).optional(), // Allow string, null, or undefined
  lastUpdated: z.string(),
  ralphMode: RalphModeStateSchema,
  lastTaskNumber: z.number().int().min(0).default(0), // Counter for sequential task IDs
});

// ============================================
// Agent Run Schemas
// ============================================

export const AgentRunToolCallSchema = z.object({
  timestamp: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
  outputSummary: z.string(),
  durationMs: z.number().min(0),
});

export const AgentRunPatchSchema = z.object({
  timestamp: z.string(),
  path: z.string(),
  diffSummary: z.string().optional(),
  linesAdded: z.number().int().min(0),
  linesRemoved: z.number().int().min(0),
});

export const AgentRunCommandSchema = z.object({
  timestamp: z.string(),
  command: z.string(),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().min(0),
  outputPath: z.string().optional(),
});

export const AcceptanceCriterionResultSchema = z.object({
  criterion: z.string(),
  passed: z.boolean(),
  evidence: z.string(),
});

export const AgentRunSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  mode: z.enum(['manual', 'dexter']),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  status: AgentRunStatusSchema,
  steps: z.number().int().min(0),
  toolCalls: z.array(AgentRunToolCallSchema),
  patches: z.array(AgentRunPatchSchema),
  commands: z.array(AgentRunCommandSchema),
  filesModified: z.array(z.string()),
  acceptanceResults: z.array(AcceptanceCriterionResultSchema).optional(),
  summary: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// Project Context Schemas
// ============================================

export const ProjectContextSchema = z.object({
  name: z.string(),
  description: z.string(),
  purpose: z.string(),
  architecture: z.record(z.string(), z.string()),
  devWorkflow: z.record(z.string(), z.string()),
  constraints: z.array(z.string()),
  updatedAt: z.string(),
});

export const RepoIndexSchema = z.object({
  keyFiles: z.array(z.string()),
  importantPaths: z.array(z.string()),
  updatedAt: z.string(),
});

// ============================================
// Activity Schemas
// ============================================

export const ActivityEntrySchema = z.object({
  timestamp: z.string(),
  type: ActivityTypeSchema,
  taskId: z.string().optional(),
  chatId: z.string().optional(),
  runId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ============================================
// Policy Schemas
// ============================================

export const PolicyLimitsSchema = z.object({
  maxStepsPerRun: z.number().int().positive(),
  maxFilesPerRun: z.number().int().positive(),
  maxDiffLinesPerRun: z.number().int().positive(),
  maxRuntimeMinutes: z.number().positive(),
  allowedGlobs: z.array(z.string()),
  blockedGlobs: z.array(z.string()),
});

export const ShellCommandPolicySchema = z.object({
  allowed: z.array(z.string()),
  blocked: z.array(z.string()),
  requireConfirmation: z.array(z.string()),
});

export const PolicySchema = z.object({
  allowedPaths: z.array(z.string()),
  allowedOperations: z.array(z.string()),
  blockedPaths: z.array(z.string()),
  blockedPatterns: z.array(z.string()),
  maxFileSize: z.number().int().positive(),
  shellCommands: ShellCommandPolicySchema,
  requireConfirmation: z.array(z.string()),
  limits: PolicyLimitsSchema,
});

// ============================================
// Default Values & Factories
// ============================================

export const DEFAULT_COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

/**
 * Create a sequential task ID.
 * @param number - Task number (e.g., 1 → TSK-001, 42 → TSK-042)
 * @returns Sequential task ID (TSK-XXX)
 */
export function createTaskId(number: number): string {
  return `TSK-${number.toString().padStart(3, '0')}`;
}

export function createChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createDefaultRuntime(): TaskRuntimeState {
  return {
    status: 'idle',
    runCount: 0,
    totalDurationMs: 0,
  };
}

export function createTask(partial: Partial<Task> & { id: string }): Task {
  const now = new Date().toISOString();
  return {
    id: partial.id, // ID is now required - must be provided by caller
    title: partial.title || 'Untitled Task',
    description: partial.description || '',
    status: partial.status || 'backlog',
    priority: partial.priority || 'medium',
    order: partial.order ?? 0,
    acceptanceCriteria: partial.acceptanceCriteria || [], // Allow empty array by default
    tags: partial.tags,
    dependsOn: partial.dependsOn,
    agent: partial.agent || {
      goal: '',
      scope: [],
      definitionOfDone: [],
    },
    comments: partial.comments || [],
    runtime: partial.runtime || createDefaultRuntime(),
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    completedAt: partial.completedAt,
  };
}

export function createComment(
  type: TaskComment['type'],
  author: string,
  content: string,
  runId?: string,
  taskId: string = ''
): TaskComment {
  return {
    id: createCommentId(),
    taskId,
    type,
    author,
    content,
    createdAt: new Date().toISOString(),
    runId,
  };
}

export function createBoard(name: string): Board {
  const now = new Date().toISOString();
  return {
    id: `board-${Date.now()}`,
    name,
    columns: DEFAULT_COLUMNS.map((col) => ({
      ...col,
      taskIds: [],
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function createChat(title: string, taskId?: string): Chat {
  const now = new Date().toISOString();
  return {
    id: createChatId(),
    title,
    taskId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultState(): AgentState {
  return {
    mode: 'manual',
    agentMode: 'agent',
    isRunning: false,
    activeTaskId: null,
    lastUpdated: new Date().toISOString(),
    ralphMode: {
      enabled: false,
      strategy: 'dependency',
      processedCount: 0,
      failedCount: 0,
    },
    lastTaskNumber: 0,
  };
}

export function createDefaultPolicy(): Policy {
  return {
    allowedPaths: ['src/**', 'package.json', 'README.md', 'tsconfig*.json', 'vite.config.ts', '.local-kanban/**'],
    blockedPaths: ['.env', '.env.*', 'node_modules/**', '.git/**', 'release/**', 'dist/**'],
    blockedPatterns: ['*.pem', '*.key', '*.cert', '*secret*', '*password*', '*credential*', '*token*', 'id_rsa*'],
    allowedOperations: ['read', 'write', 'create', 'delete'],
    maxFileSize: 10 * 1024 * 1024,
    requireConfirmation: ['delete', 'overwrite_large_file'],
    shellCommands: {
      allowed: ['npm', 'npx', 'node', 'git', 'tsc', 'vite', 'echo', 'cat', 'ls', 'dir'],
      blocked: ['rm -rf /', 'format', 'sudo', 'curl | bash', 'wget | bash', 'del /f /s /q'],
      requireConfirmation: [],
    },
    limits: {
      maxStepsPerRun: 100,
      maxFilesPerRun: 50,
      maxDiffLinesPerRun: 5000,
      maxRuntimeMinutes: 30,
      allowedGlobs: ['**/*'],
      blockedGlobs: ['**/node_modules/**', '**/.git/**'],
    },
  };
}

export function createProjectContext(partial: Partial<ProjectContext>): ProjectContext {
  return {
    name: partial.name || 'Unknown Project',
    description: partial.description || '',
    purpose: partial.purpose || '',
    architecture: partial.architecture || {},
    devWorkflow: partial.devWorkflow || {},
    constraints: partial.constraints || [],
    updatedAt: new Date().toISOString(),
  };
}

export function createRepoIndex(): RepoIndex {
  return {
    keyFiles: [],
    importantPaths: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createChatIndex(): ChatIndex {
  return {
    chats: [],
  };
}

export function createAgentRun(taskId: string, mode: 'manual' | 'dexter'): AgentRun {
  return {
    id: createRunId(),
    taskId,
    mode,
    startedAt: new Date().toISOString(),
    status: 'running',
    steps: 0,
    toolCalls: [],
    patches: [],
    commands: [],
    filesModified: [],
  };
}

export function createActivityEntry(
  type: ActivityEntry['type'],
  data: Record<string, unknown>,
  ids?: { taskId?: string; chatId?: string; runId?: string }
): ActivityEntry {
  return {
    timestamp: new Date().toISOString(),
    type,
    ...ids,
    data,
  };
}

// ============================================
// Validators
// ============================================

export function isValidTaskStatus(status: string): status is TaskStatus {
  return ['backlog', 'todo', 'doing', 'review', 'done'].includes(status);
}

export function isValidTask(task: unknown): task is Task {
  return TaskSchema.safeParse(task).success;
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return status === 'done';
}

export function hasUnmetDependencies(task: Task, allTasks: Task[]): boolean {
  const deps = task.dependsOn || task.agent.dependencies || [];
  if (deps.length === 0) return false;

  return deps.some((depId) => {
    const depTask = allTasks.find((t) => t.id === depId);
    return !depTask || depTask.status !== 'done';
  });
}

// ============================================
// File Paths
// ============================================

export const LOCAL_KANBAN_PATHS = {
  root: '.local-kanban',
  board: '.local-kanban/board.json',
  tasks: '.local-kanban/tasks.json',
  state: '.local-kanban/state.json',
  policy: '.local-kanban/policy.json',
  activity: '.local-kanban/activity.jsonl',
  context: '.local-kanban/context',
  projectContext: '.local-kanban/context/project_context.json',
  repoIndex: '.local-kanban/context/repo_index.json',
  chats: '.local-kanban/chats',
  chatsIndex: '.local-kanban/chats/index.json',
  runs: '.local-kanban/runs',
  agentRuns: '.local-kanban/agent-runs',
  backups: '.local-kanban/backups',
} as const;

// ============================================
// Migration Helpers
// ============================================

export function migrateTaskToV3(oldTask: Record<string, unknown>): Task {
  // Keep existing ID or generate a temporary one (will be replaced on next create)
  const id = oldTask.id
    ? String(oldTask.id)
    : `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    title: String(oldTask.title || 'Untitled'),
    description: String(oldTask.description || ''),
    status: isValidTaskStatus(String(oldTask.status)) ? (oldTask.status as TaskStatus) : 'backlog',
    priority: ['low', 'medium', 'high', 'critical'].includes(String(oldTask.priority))
      ? (oldTask.priority as Task['priority'])
      : 'medium',
    order: typeof oldTask.order === 'number' ? oldTask.order : 0,
    acceptanceCriteria: Array.isArray(oldTask.acceptanceCriteria)
      ? oldTask.acceptanceCriteria.map(String)
      : [], // Allow empty array on migration
    tags: Array.isArray(oldTask.tags) ? oldTask.tags.map(String) : undefined,
    dependsOn: Array.isArray(oldTask.dependsOn) ? oldTask.dependsOn.map(String) : undefined,
    agent: {
      goal: String((oldTask.agent as Record<string, unknown>)?.goal || ''),
      scope: Array.isArray((oldTask.agent as Record<string, unknown>)?.scope)
        ? ((oldTask.agent as Record<string, unknown>).scope as string[])
        : [],
      definitionOfDone: Array.isArray((oldTask.agent as Record<string, unknown>)?.definitionOfDone)
        ? ((oldTask.agent as Record<string, unknown>).definitionOfDone as string[])
        : [],
      dependencies: Array.isArray((oldTask.agent as Record<string, unknown>)?.dependencies)
        ? ((oldTask.agent as Record<string, unknown>).dependencies as string[])
        : undefined,
    },
    comments: Array.isArray(oldTask.comments)
      ? (oldTask.comments as TaskComment[]).map(c => ({
          ...c,
          taskId: c.taskId || id,
          createdAt: (c as unknown as { timestamp?: string }).timestamp || c.createdAt || new Date().toISOString(),
        }))
      : [],
    runtime: (oldTask.runtime as TaskRuntimeState) || createDefaultRuntime(),
    createdAt: String(oldTask.createdAt || new Date().toISOString()),
    updatedAt: String(oldTask.updatedAt || new Date().toISOString()),
    completedAt: oldTask.completedAt ? String(oldTask.completedAt) : undefined,
  };
}
