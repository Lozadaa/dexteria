/**
 * Project Domain Types
 *
 * Types related to project configuration, policies, and context.
 */

// ============================================
// Policy Types
// ============================================

/**
 * Execution limits for the agent.
 */
export interface PolicyLimits {
  /** Maximum steps per agent run */
  maxStepsPerRun: number;
  /** Maximum files that can be modified per run */
  maxFilesPerRun: number;
  /** Maximum total diff lines per run */
  maxDiffLinesPerRun: number;
  /** Maximum runtime in minutes */
  maxRuntimeMinutes: number;
  /** Glob patterns for allowed paths */
  allowedGlobs: string[];
  /** Glob patterns for blocked paths */
  blockedGlobs: string[];
}

/**
 * Shell command execution policy.
 */
export interface ShellCommandPolicy {
  /** Allowed command prefixes */
  allowed: string[];
  /** Blocked command prefixes */
  blocked: string[];
  /** Commands requiring user confirmation */
  requireConfirmation: string[];
}

/**
 * Complete security policy definition.
 */
export interface Policy {
  /** Allowed file paths */
  allowedPaths: string[];
  /** Allowed operations */
  allowedOperations: string[];
  /** Blocked file paths */
  blockedPaths: string[];
  /** Blocked content patterns */
  blockedPatterns: string[];
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Shell command policy */
  shellCommands: ShellCommandPolicy;
  /** Operations requiring confirmation */
  requireConfirmation: string[];
  /** Execution limits */
  limits: PolicyLimits;
}

// ============================================
// Context Types
// ============================================

/**
 * Project context for AI understanding.
 */
export interface ProjectContext {
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Project purpose */
  purpose: string;
  /** Architecture documentation */
  architecture: Record<string, string>;
  /** Development workflow documentation */
  devWorkflow: Record<string, string>;
  /** Project constraints and rules */
  constraints: string[];
  /** ISO timestamp when last updated */
  updatedAt: string;
}

/**
 * Repository file index for quick navigation.
 */
export interface RepoIndex {
  /** Key files in the repository */
  keyFiles: string[];
  /** Important directories */
  importantPaths: string[];
  /** ISO timestamp when last updated */
  updatedAt: string;
}

// ============================================
// Settings Types
// ============================================

/**
 * Single project command configuration.
 */
export interface ProjectCommand {
  /** Command to execute */
  cmd: string;
  /** Working directory */
  cwd: string;
  /** Whether this was auto-detected */
  autoDetect?: boolean;
  /** Whether this command includes dependency installation */
  includesInstall?: boolean;
}

/**
 * Available notification sound presets.
 */
export type NotificationSound = 'system' | 'chime' | 'bell' | 'success' | 'ding' | 'complete';

/**
 * Notification settings configuration.
 */
export interface NotificationSettings {
  /** Play sound on task completion */
  soundOnTaskComplete: boolean;
  /** Show badge on task completion */
  badgeOnTaskComplete: boolean;
  /** Selected notification sound preset */
  sound: NotificationSound;
}

/**
 * Project commands configuration.
 */
export interface ProjectCommandsSettings {
  /** Run/dev server command */
  run: ProjectCommand;
  /** Build command */
  build: ProjectCommand;
  /** Install dependencies command */
  install: ProjectCommand;
  /** Allow potentially unsafe commands */
  allowUnsafeCommands: boolean;
}

/**
 * Task runner settings.
 */
export interface RunnerSettings {
  /** Default timeout in seconds */
  defaultTimeoutSec: number;
}

/**
 * Complete project settings.
 */
export interface ProjectSettings {
  /** Settings format version */
  version: number;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Project command settings */
  projectCommands: ProjectCommandsSettings;
  /** Runner settings */
  runner: RunnerSettings;
}

/**
 * Auto-detected project commands.
 */
export interface DetectedCommands {
  /** Detected run command */
  run?: string;
  /** Detected build command */
  build?: string;
  /** Detected install command */
  install?: string;
  /** Detected package manager */
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

// ============================================
// Project Process Types
// ============================================

/**
 * Type of project process.
 */
export type ProjectProcessType = 'run' | 'build';

/**
 * Status of a project process.
 */
export interface ProjectProcessStatus {
  type: ProjectProcessType;
  running: boolean;
  pid?: number;
  runId?: string;
  startedAt?: string;
  command?: string;
}

/**
 * Result of running a project command.
 */
export interface ProjectRunResult {
  runId: string;
  success: boolean;
  exitCode?: number;
  logPath: string;
  error?: string;
}
