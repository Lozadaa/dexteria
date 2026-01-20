/**
 * Factory Functions
 *
 * Functions for creating entities with proper defaults.
 */

import type {
  Task,
  Board,
  Chat,
  AgentState,
  ProjectContext,
  RepoIndex,
  Policy,
  ChatIndex,
  TaskComment,
  TaskRuntimeState,
  AgentRun,
  ActivityEntry,
  ProjectSettings,
  TaskStatus,
} from '../types';
import { DEFAULT_COLUMNS } from './common';

// ============================================
// ID Generators
// ============================================

/**
 * Create a sequential task ID.
 *
 * @param number - Task number (e.g., 1 → TSK-001, 42 → TSK-042)
 * @returns Sequential task ID (TSK-XXX)
 */
export function createTaskId(number: number): string {
  return `TSK-${number.toString().padStart(3, '0')}`;
}

/**
 * Create a unique chat ID.
 *
 * @returns Unique chat ID
 */
export function createChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a unique comment ID.
 *
 * @returns Unique comment ID
 */
export function createCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a unique run ID.
 *
 * @returns Unique run ID
 */
export function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Task Factories
// ============================================

/**
 * Create default task runtime state.
 *
 * @returns Default runtime state
 */
export function createDefaultRuntime(): TaskRuntimeState {
  return {
    status: 'idle',
    runCount: 0,
    totalDurationMs: 0,
  };
}

/**
 * Create a new task with defaults.
 *
 * @param partial - Partial task data (id is required)
 * @returns Complete task with defaults applied
 */
export function createTask(partial: Partial<Task> & { id: string }): Task {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    title: partial.title || 'Untitled Task',
    description: partial.description || '',
    status: partial.status || 'backlog',
    priority: partial.priority || 'medium',
    order: partial.order ?? 0,
    acceptanceCriteria: partial.acceptanceCriteria || [],
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

/**
 * Create a new task comment.
 *
 * @param type - Comment type
 * @param author - Comment author
 * @param content - Comment content
 * @param runId - Optional associated run ID
 * @param taskId - Task ID the comment belongs to
 * @returns Complete task comment
 */
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

// ============================================
// Board Factories
// ============================================

/**
 * Create a new Kanban board with default columns.
 *
 * @param name - Board name
 * @returns Complete board with default columns
 */
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

// ============================================
// Chat Factories
// ============================================

/**
 * Create a new chat session.
 *
 * @param title - Chat title
 * @param taskId - Optional associated task ID
 * @returns Complete chat session
 */
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

/**
 * Create an empty chat index.
 *
 * @returns Empty chat index
 */
export function createChatIndex(): ChatIndex {
  return {
    chats: [],
  };
}

// ============================================
// Agent Factories
// ============================================

/**
 * Create default agent state.
 *
 * @returns Default agent state
 */
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

/**
 * Create a new agent run record.
 *
 * @param taskId - Task being executed
 * @param mode - Execution mode
 * @returns New agent run record
 */
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

// ============================================
// Project Factories
// ============================================

/**
 * Create default security policy.
 *
 * @returns Default policy configuration
 */
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

/**
 * Create default project settings.
 *
 * @returns Default settings configuration
 */
export function createDefaultSettings(): ProjectSettings {
  return {
    version: 1,
    notifications: {
      soundOnTaskComplete: true,
      badgeOnTaskComplete: true,
      sound: 'system',
    },
    projectCommands: {
      run: { cmd: '', cwd: '.', autoDetect: true },
      build: { cmd: '', cwd: '.', autoDetect: true, includesInstall: true },
      install: { cmd: '', cwd: '.' },
      allowUnsafeCommands: false,
    },
    runner: {
      defaultTimeoutSec: 1800,
    },
  };
}

/**
 * Create project context with defaults.
 *
 * @param partial - Partial project context
 * @returns Complete project context
 */
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

/**
 * Create empty repository index.
 *
 * @returns Empty repo index
 */
export function createRepoIndex(): RepoIndex {
  return {
    keyFiles: [],
    importantPaths: [],
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// Activity Factories
// ============================================

/**
 * Create a new activity entry.
 *
 * @param type - Activity type
 * @param data - Activity data
 * @param ids - Optional related IDs
 * @returns Complete activity entry
 */
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
// Migration Helpers
// ============================================

/**
 * Migrate an old task format to the current version.
 *
 * @param oldTask - Old task data
 * @returns Migrated task
 */
export function migrateTaskToV3(oldTask: Record<string, unknown>): Task {
  const id = oldTask.id
    ? String(oldTask.id)
    : `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const isValidStatus = (s: string): s is TaskStatus =>
    ['backlog', 'todo', 'doing', 'review', 'done'].includes(s);

  return {
    id,
    title: String(oldTask.title || 'Untitled'),
    description: String(oldTask.description || ''),
    status: isValidStatus(String(oldTask.status)) ? (oldTask.status as TaskStatus) : 'backlog',
    priority: ['low', 'medium', 'high', 'critical'].includes(String(oldTask.priority))
      ? (oldTask.priority as Task['priority'])
      : 'medium',
    order: typeof oldTask.order === 'number' ? oldTask.order : 0,
    acceptanceCriteria: Array.isArray(oldTask.acceptanceCriteria)
      ? oldTask.acceptanceCriteria.map(String)
      : [],
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
      ? (oldTask.comments as TaskComment[]).map((c) => ({
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
