/**
 * Task Schemas
 *
 * Zod schemas for validating task-related data.
 */

import { z } from 'zod';

// ============================================
// Primitive Schemas
// ============================================

/**
 * Valid task status values.
 */
export const TaskStatusSchema = z.enum(['backlog', 'todo', 'doing', 'review', 'done']);

/**
 * Task priority levels.
 */
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Task runtime execution status.
 */
export const TaskRuntimeStatusSchema = z.enum(['idle', 'running', 'blocked', 'done', 'failed']);

/**
 * Comment type categorization.
 */
export const CommentTypeSchema = z.enum(['note', 'instruction', 'failure', 'agent', 'system']);

// ============================================
// Task Component Schemas
// ============================================

/**
 * Schema for task agent configuration.
 */
export const TaskAgentSchema = z.object({
  goal: z.string(),
  scope: z.array(z.string()),
  definitionOfDone: z.array(z.string()),
  dependencies: z.array(z.string()).optional(),
});

/**
 * Schema for task comments.
 */
export const TaskCommentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  type: CommentTypeSchema,
  author: z.string(),
  content: z.string(),
  createdAt: z.string(),
  runId: z.string().optional(),
});

/**
 * Schema for task runtime state.
 */
export const TaskRuntimeSchema = z.object({
  status: TaskRuntimeStatusSchema,
  currentRunId: z.string().optional(),
  lastRunId: z.string().optional(),
  lastRunAt: z.string().optional(),
  runCount: z.number().int().min(0),
  failureCount: z.number().int().min(0).optional(),
  totalDurationMs: z.number().min(0),
});

// ============================================
// Main Task Schema
// ============================================

/**
 * Complete task schema.
 */
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  order: z.number().int().min(0),
  acceptanceCriteria: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  comments: z.array(TaskCommentSchema),
  agent: TaskAgentSchema,
  runtime: TaskRuntimeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

/**
 * Schema for tasks file.
 */
export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema),
});

// ============================================
// Type exports
// ============================================

export type TaskStatusSchemaType = z.infer<typeof TaskStatusSchema>;
export type TaskPrioritySchemaType = z.infer<typeof TaskPrioritySchema>;
export type TaskSchemaType = z.infer<typeof TaskSchema>;
