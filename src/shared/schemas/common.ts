/**
 * Common Schemas
 *
 * Zod schemas for shared data types and utilities.
 */

import { z } from 'zod';
import type { Task, TaskStatus } from '../types';
import { TaskSchema } from './task';

// ============================================
// Activity Schemas
// ============================================

/**
 * Activity type enumeration.
 */
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

/**
 * Schema for activity entry.
 */
export const ActivityEntrySchema = z.object({
  timestamp: z.string(),
  type: ActivityTypeSchema,
  taskId: z.string().optional(),
  chatId: z.string().optional(),
  runId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ============================================
// Default Values
// ============================================

/**
 * Default Kanban columns configuration.
 */
export const DEFAULT_COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

// ============================================
// File Paths
// ============================================

/**
 * Paths to local kanban files.
 */
export const LOCAL_KANBAN_PATHS = {
  root: '.local-kanban',
  board: '.local-kanban/board.json',
  tasks: '.local-kanban/tasks.json',
  state: '.local-kanban/state.json',
  policy: '.local-kanban/policy.json',
  settings: '.local-kanban/settings.json',
  activity: '.local-kanban/activity.jsonl',
  context: '.local-kanban/context',
  projectContext: '.local-kanban/context/project_context.json',
  repoIndex: '.local-kanban/context/repo_index.json',
  chats: '.local-kanban/chats',
  chatsIndex: '.local-kanban/chats/index.json',
  runs: '.local-kanban/runs',
  projectRuns: '.local-kanban/runs/project',
  agentRuns: '.local-kanban/agent-runs',
  backups: '.local-kanban/backups',
} as const;

// ============================================
// Validators
// ============================================

/**
 * Check if a string is a valid task status.
 *
 * @param status - The status string to validate
 * @returns True if the status is valid
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return ['backlog', 'todo', 'doing', 'review', 'done'].includes(status);
}

/**
 * Validate if an object is a valid Task.
 *
 * @param task - The object to validate
 * @returns True if the object matches the Task schema
 */
export function isValidTask(task: unknown): task is Task {
  return TaskSchema.safeParse(task).success;
}

/**
 * Check if a status represents a terminal/completed state.
 *
 * @param status - The task status to check
 * @returns True if the status is terminal (done)
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return status === 'done';
}

/**
 * Check if a task has unmet dependencies.
 *
 * @param task - The task to check
 * @param allTasks - All tasks in the system
 * @returns True if the task has dependencies that are not done
 */
export function hasUnmetDependencies(task: Task, allTasks: Task[]): boolean {
  const deps = task.dependsOn || task.agent.dependencies || [];
  if (deps.length === 0) return false;

  return deps.some((depId) => {
    const depTask = allTasks.find((t) => t.id === depId);
    return !depTask || depTask.status !== 'done';
  });
}

// ============================================
// Type exports
// ============================================

export type ActivityTypeSchemaType = z.infer<typeof ActivityTypeSchema>;
export type ActivityEntrySchemaType = z.infer<typeof ActivityEntrySchema>;
