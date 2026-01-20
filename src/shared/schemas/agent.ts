/**
 * Agent Schemas
 *
 * Zod schemas for validating agent state and run data.
 */

import { z } from 'zod';

// ============================================
// Primitive Schemas
// ============================================

/**
 * Agent operational mode.
 */
export const AgentModeSchema = z.enum(['manual', 'ralph']);

/**
 * Agent capability mode.
 */
export const AgentModeTypeSchema = z.enum(['agent', 'planner']);

/**
 * Agent run status.
 */
export const AgentRunStatusSchema = z.enum(['running', 'completed', 'blocked', 'failed', 'cancelled']);

// ============================================
// Agent State Schemas
// ============================================

/**
 * Schema for Ralph autonomous mode state.
 */
export const RalphModeStateSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(['fifo', 'priority', 'dependency']),
  startedAt: z.string().optional(),
  processedCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  currentTaskId: z.string().optional(),
});

/**
 * Schema for agent state.
 */
export const AgentStateSchema = z.object({
  mode: AgentModeSchema,
  agentMode: AgentModeTypeSchema,
  isRunning: z.boolean(),
  activeTaskId: z.string().nullable(),
  activeChatId: z.union([z.string(), z.null()]).optional(),
  lastUpdated: z.string(),
  ralphMode: RalphModeStateSchema,
  lastTaskNumber: z.number().int().min(0).default(0),
});

// ============================================
// Agent Run Schemas
// ============================================

/**
 * Schema for agent run tool call.
 */
export const AgentRunToolCallSchema = z.object({
  timestamp: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
  outputSummary: z.string(),
  durationMs: z.number().min(0),
});

/**
 * Schema for agent run file patch.
 */
export const AgentRunPatchSchema = z.object({
  timestamp: z.string(),
  path: z.string(),
  diffSummary: z.string().optional(),
  linesAdded: z.number().int().min(0),
  linesRemoved: z.number().int().min(0),
});

/**
 * Schema for agent run command.
 */
export const AgentRunCommandSchema = z.object({
  timestamp: z.string(),
  command: z.string(),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().min(0),
  outputPath: z.string().optional(),
});

/**
 * Schema for acceptance criterion result.
 */
export const AcceptanceCriterionResultSchema = z.object({
  criterion: z.string(),
  passed: z.boolean(),
  evidence: z.string(),
});

/**
 * Complete schema for agent run.
 */
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
// Type exports
// ============================================

export type AgentModeSchemaType = z.infer<typeof AgentModeSchema>;
export type AgentStateSchemaType = z.infer<typeof AgentStateSchema>;
export type AgentRunSchemaType = z.infer<typeof AgentRunSchema>;
