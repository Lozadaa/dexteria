/**
 * Project Schemas
 *
 * Zod schemas for validating project context, policy, and settings.
 */

import { z } from 'zod';

// ============================================
// Project Context Schemas
// ============================================

/**
 * Schema for project context.
 */
export const ProjectContextSchema = z.object({
  name: z.string(),
  description: z.string(),
  purpose: z.string(),
  architecture: z.record(z.string(), z.string()),
  devWorkflow: z.record(z.string(), z.string()),
  constraints: z.array(z.string()),
  updatedAt: z.string(),
});

/**
 * Schema for repository index.
 */
export const RepoIndexSchema = z.object({
  keyFiles: z.array(z.string()),
  importantPaths: z.array(z.string()),
  updatedAt: z.string(),
});

// ============================================
// Policy Schemas
// ============================================

/**
 * Schema for policy limits.
 */
export const PolicyLimitsSchema = z.object({
  maxStepsPerRun: z.number().int().positive(),
  maxFilesPerRun: z.number().int().positive(),
  maxDiffLinesPerRun: z.number().int().positive(),
  maxRuntimeMinutes: z.number().positive(),
  allowedGlobs: z.array(z.string()),
  blockedGlobs: z.array(z.string()),
});

/**
 * Schema for shell command policy.
 */
export const ShellCommandPolicySchema = z.object({
  allowed: z.array(z.string()),
  blocked: z.array(z.string()),
  requireConfirmation: z.array(z.string()),
});

/**
 * Complete schema for security policy.
 */
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
// Settings Schemas
// ============================================

/**
 * Schema for project command.
 */
export const ProjectCommandSchema = z.object({
  cmd: z.string(),
  cwd: z.string(),
  autoDetect: z.boolean().optional(),
  includesInstall: z.boolean().optional(),
});

/**
 * Notification sound presets.
 */
export const NotificationSoundSchema = z.enum(['system', 'chime', 'bell', 'success', 'ding', 'complete']);

/**
 * Schema for notification settings.
 */
export const NotificationSettingsSchema = z.object({
  soundOnTaskComplete: z.boolean(),
  badgeOnTaskComplete: z.boolean(),
  sound: NotificationSoundSchema.default('system'),
});

/**
 * Schema for project commands settings.
 */
export const ProjectCommandsSettingsSchema = z.object({
  run: ProjectCommandSchema,
  build: ProjectCommandSchema,
  install: ProjectCommandSchema,
  allowUnsafeCommands: z.boolean(),
});

/**
 * Schema for runner settings.
 */
export const RunnerSettingsSchema = z.object({
  defaultTimeoutSec: z.number().positive(),
});

/**
 * Complete schema for project settings.
 */
export const ProjectSettingsSchema = z.object({
  version: z.number().int().positive(),
  notifications: NotificationSettingsSchema,
  projectCommands: ProjectCommandsSettingsSchema,
  runner: RunnerSettingsSchema,
});

// ============================================
// Type exports
// ============================================

export type ProjectContextSchemaType = z.infer<typeof ProjectContextSchema>;
export type PolicySchemaType = z.infer<typeof PolicySchema>;
export type ProjectSettingsSchemaType = z.infer<typeof ProjectSettingsSchema>;
