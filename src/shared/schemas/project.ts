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

// ============================================
// Git Configuration Schemas
// ============================================

/**
 * Git operation modes.
 */
export const GitModeSchema = z.enum(['none', 'basic', 'advanced']);

/**
 * Code visibility modes for AI conflict resolution.
 */
export const CodeVisibilityModeSchema = z.enum(['enabled', 'disabled']);

/**
 * Conflict resolution strategies.
 */
export const ConflictResolutionModeSchema = z.enum(['manual', 'assisted', 'autonomous']);

/**
 * Schema for Git configuration.
 */
export const GitConfigSchema = z.object({
  /** Whether Git features are enabled */
  gitEnabled: z.boolean().default(false),
  /** Git operation mode */
  gitMode: GitModeSchema.default('none'),
  /** Main/default branch name (e.g., 'main', 'master') */
  mainBranch: z.string().default('main'),
  /** Optional review branch for staging (e.g., 'develop', 'review') */
  reviewBranch: z.string().optional(),
  /** Branch naming convention with placeholders: {taskId}, {slug} */
  branchConvention: z.string().default('task/{taskId}-{slug}'),
  /** Code visibility mode for conflict resolution */
  codeVisibilityMode: CodeVisibilityModeSchema.default('enabled'),
  /** Conflict resolution strategy */
  conflictResolutionMode: ConflictResolutionModeSchema.default('manual'),
  /** Branches that cannot be deleted or force-pushed */
  protectedBranches: z.array(z.string()).default(['main', 'master']),
  /** Maximum file size (KB) for AI conflict resolution */
  maxConflictFileSize: z.number().positive().default(500),
  /** Patterns for lockfiles to handle specially in merges */
  lockfilePatterns: z.array(z.string()).default([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'poetry.lock'
  ]),
  /** Auto-commit message template */
  commitMessageTemplate: z.string().optional(),
  /** Whether to auto-push after commits */
  autoPush: z.boolean().optional(),
}).refine(
  // Validation: autonomous conflict resolution requires code visibility disabled
  (data) => {
    if (data.conflictResolutionMode === 'autonomous' && data.codeVisibilityMode === 'enabled') {
      return false;
    }
    return true;
  },
  {
    message: 'Autonomous conflict resolution requires code visibility to be disabled',
    path: ['conflictResolutionMode'],
  }
);

/**
 * Complete schema for project settings.
 */
export const ProjectSettingsSchema = z.object({
  version: z.number().int().positive(),
  notifications: NotificationSettingsSchema,
  projectCommands: ProjectCommandsSettingsSchema,
  runner: RunnerSettingsSchema,
  /** Git configuration (optional, defaults if not provided) */
  git: GitConfigSchema.optional(),
});

// ============================================
// Type exports
// ============================================

export type ProjectContextSchemaType = z.infer<typeof ProjectContextSchema>;
export type PolicySchemaType = z.infer<typeof PolicySchema>;
export type ProjectSettingsSchemaType = z.infer<typeof ProjectSettingsSchema>;
export type GitConfigSchemaType = z.infer<typeof GitConfigSchema>;
