/**
 * Git Domain Types
 *
 * Types related to Git orchestration, task-branch mapping, and conflict resolution.
 */

// ============================================
// Git Mode Types
// ============================================

/**
 * Git operation mode.
 * - 'none': Git features disabled
 * - 'basic': Manual branch creation, basic operations
 * - 'advanced': Full task-branch lifecycle with auto-merge
 */
export type GitMode = 'none' | 'basic' | 'advanced';

/**
 * Code visibility mode for AI conflict resolution.
 * - 'enabled': User can see code changes (manual/assisted resolution)
 * - 'disabled': AI resolves autonomously (for non-technical users)
 */
export type CodeVisibilityMode = 'enabled' | 'disabled';

/**
 * Conflict resolution strategy.
 * - 'manual': User resolves all conflicts
 * - 'assisted': AI suggests, user approves
 * - 'autonomous': AI resolves automatically (requires codeVisibility: 'disabled')
 */
export type ConflictResolutionMode = 'manual' | 'assisted' | 'autonomous';

// ============================================
// Git Configuration
// ============================================

/**
 * Git configuration stored in project settings.
 */
export interface GitConfig {
  /** Whether Git features are enabled */
  gitEnabled: boolean;
  /** Git operation mode */
  gitMode: GitMode;
  /** Main/default branch name (e.g., 'main', 'master') */
  mainBranch: string;
  /** Optional review branch for staging (e.g., 'develop', 'review') */
  reviewBranch?: string;
  /** Branch naming convention with placeholders: {taskId}, {slug} */
  branchConvention: string;
  /** Code visibility mode for conflict resolution */
  codeVisibilityMode: CodeVisibilityMode;
  /** Conflict resolution strategy */
  conflictResolutionMode: ConflictResolutionMode;
  /** Branches that cannot be deleted or force-pushed */
  protectedBranches: string[];
  /** Maximum file size (KB) for AI conflict resolution */
  maxConflictFileSize: number;
  /** Patterns for lockfiles to handle specially in merges */
  lockfilePatterns: string[];
  /** Auto-commit message template */
  commitMessageTemplate?: string;
  /** Whether to auto-push after commits */
  autoPush?: boolean;
}

/**
 * Default Git configuration.
 */
export const DEFAULT_GIT_CONFIG: GitConfig = {
  gitEnabled: false,
  gitMode: 'none',
  mainBranch: 'main',
  branchConvention: 'task/{taskId}-{slug}',
  codeVisibilityMode: 'enabled',
  conflictResolutionMode: 'manual',
  protectedBranches: ['main', 'master'],
  maxConflictFileSize: 500,
  lockfilePatterns: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'poetry.lock'],
};

// ============================================
// Git Status Types
// ============================================

/**
 * Current Git repository status.
 */
export interface GitStatus {
  /** Whether the directory is a Git repository */
  isRepo: boolean;
  /** Current checked-out branch */
  currentBranch: string | null;
  /** Whether there are uncommitted changes */
  isDirty: boolean;
  /** Number of staged files */
  stagedCount: number;
  /** Number of modified (unstaged) files */
  modifiedCount: number;
  /** Number of untracked files */
  untrackedCount: number;
  /** Commits ahead of upstream */
  ahead: number;
  /** Commits behind upstream */
  behind: number;
  /** Whether currently in a merge state */
  isMerging: boolean;
  /** Whether currently in a rebase state */
  isRebasing: boolean;
}

/**
 * Information about a Git branch.
 */
export interface BranchInfo {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  isCurrent: boolean;
  /** Whether this is a remote tracking branch */
  isRemote: boolean;
  /** Associated task ID (if task branch) */
  taskId: string | null;
  /** Last commit hash */
  lastCommitHash: string;
  /** Last commit date (ISO) */
  lastCommitDate: string;
  /** Last commit message */
  lastCommitMessage?: string;
}

/**
 * Commit information.
 */
export interface CommitInfo {
  /** Commit hash */
  hash: string;
  /** Short hash */
  shortHash: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail: string;
  /** Commit date (ISO) */
  date: string;
}

// ============================================
// Task-Branch Mapping
// ============================================

/**
 * Mapping between a task and its associated Git branch.
 */
export interface TaskBranchMapping {
  /** Task ID */
  taskId: string;
  /** Associated branch name */
  branchName: string;
  /** ISO timestamp when mapping was created */
  createdAt: string;
  /** Commit hash that the branch was created from */
  baseCommitHash: string;
  /** Current HEAD commit hash of the branch */
  headCommitHash: string;
  /** Whether this branch is currently checked out */
  isCheckedOut: boolean;
  /** Whether this branch has been merged to review/main */
  isMerged: boolean;
  /** Merge commit hash if merged */
  mergeCommitHash: string | null;
  /** Target branch for merge (review or main) */
  mergedTo?: string;
}

/**
 * Information about the review branch state.
 */
export interface ReviewBranchInfo {
  /** Review branch name */
  name: string;
  /** Task IDs currently merged into review */
  mergedTaskIds: string[];
  /** Current HEAD commit hash */
  headCommitHash: string;
  /** Last merge timestamp (ISO) */
  lastMergeAt: string;
}

// ============================================
// Conflict Resolution Types
// ============================================

/**
 * Type of merge conflict.
 */
export type ConflictType = 'content' | 'binary' | 'delete-modify' | 'rename' | 'mode';

/**
 * Status of conflict resolution.
 */
export type ConflictStatus = 'unresolved' | 'resolved' | 'skipped';

/**
 * Information about a merge conflict.
 */
export interface ConflictInfo {
  /** Path to the conflicted file */
  filePath: string;
  /** Type of conflict */
  conflictType: ConflictType;
  /** Whether file is binary */
  isBinary: boolean;
  /** Our (current branch) content */
  oursContent: string | null;
  /** Their (incoming branch) content */
  theirsContent: string | null;
  /** Base (common ancestor) content */
  baseContent: string | null;
  /** AI-suggested resolution (if available) */
  suggestedResolution: string | null;
  /** Current resolution status */
  status: ConflictStatus;
  /** Resolved content (if resolved) */
  resolvedContent?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Whether file matches lockfile patterns */
  isLockfile?: boolean;
}

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  /** Whether merge completed successfully */
  success: boolean;
  /** Whether there were conflicts */
  hadConflicts: boolean;
  /** List of conflicts (if any) */
  conflicts: ConflictInfo[];
  /** Merge commit hash (if successful) */
  mergeCommitHash: string | null;
  /** Error message (if failed) */
  error: string | null;
  /** Files that were merged successfully */
  mergedFiles?: string[];
}

// ============================================
// Git Command Result Types
// ============================================

/**
 * Result of a Git command execution.
 */
export interface GitCommandResult {
  /** Whether command succeeded */
  success: boolean;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Safety check result before dangerous operations.
 */
export interface GitSafetyCheck {
  /** Whether operation is safe to proceed */
  safe: boolean;
  /** Warnings about the operation */
  warnings: string[];
  /** Blocking issues that prevent operation */
  blockers: string[];
  /** Suggestions for safe alternatives */
  suggestions: string[];
}

// ============================================
// Git State File
// ============================================

/**
 * Initiator of a Git operation.
 */
export type GitOperationInitiator = 'system' | 'user' | 'agent';

/**
 * Log entry for a Git operation.
 */
export interface GitOperationLog {
  /** Unique operation ID */
  id: string;
  /** Git command that was executed */
  command: string;
  /** ISO timestamp */
  timestamp: string;
  /** Associated task ID (if applicable) */
  taskId: string | null;
  /** Whether operation succeeded */
  success: boolean;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Who initiated the operation */
  initiatedBy: GitOperationInitiator;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Git state file stored at .local-kanban/git-state.json
 */
export interface GitStateFile {
  /** File format version */
  version: number;
  /** Task-branch mappings */
  mappings: TaskBranchMapping[];
  /** Review branch information */
  reviewBranch: ReviewBranchInfo | null;
  /** Recent operation logs */
  operationLog: GitOperationLog[];
  /** Last known repository state */
  lastKnownStatus?: {
    branch: string;
    commitHash: string;
    timestamp: string;
  };
}

/**
 * Default Git state file.
 */
export const DEFAULT_GIT_STATE: GitStateFile = {
  version: 1,
  mappings: [],
  reviewBranch: null,
  operationLog: [],
};

// ============================================
// Git IPC Types
// ============================================

/**
 * Options for creating a task branch.
 */
export interface CreateTaskBranchOptions {
  /** Task ID */
  taskId: string;
  /** Task title (for slug generation) */
  taskTitle: string;
  /** Base branch to create from (defaults to mainBranch) */
  baseBranch?: string;
  /** Custom branch name (overrides convention) */
  customBranchName?: string;
  /** Whether to checkout the new branch */
  checkout?: boolean;
}

/**
 * Options for committing changes.
 */
export interface CommitOptions {
  /** Commit message */
  message: string;
  /** Files to stage (defaults to all) */
  files?: string[] | 'all';
  /** Whether to amend the previous commit */
  amend?: boolean;
  /** Associated task ID for tracking */
  taskId?: string;
}

/**
 * Options for merging.
 */
export interface MergeOptions {
  /** Source branch to merge from */
  sourceBranch: string;
  /** Target branch to merge into */
  targetBranch: string;
  /** Whether to create a merge commit (vs fast-forward) */
  noFastForward?: boolean;
  /** Commit message for merge */
  message?: string;
  /** Associated task ID for tracking */
  taskId?: string;
}

/**
 * Resolution choice for a conflict.
 */
export type ConflictResolutionChoice = 'ours' | 'theirs' | 'manual' | 'ai';

/**
 * Options for resolving a conflict.
 */
export interface ResolveConflictOptions {
  /** Path to the conflicted file */
  filePath: string;
  /** Resolution choice */
  resolution: ConflictResolutionChoice;
  /** Manual content (if resolution is 'manual') */
  manualContent?: string;
  /** Associated task ID for tracking */
  taskId?: string;
}

// ============================================
// Task Git Fields Extension
// ============================================

/**
 * Git-related fields added to Task type.
 */
export interface TaskGitFields {
  /** Associated Git branch name */
  gitBranch?: string;
  /** Whether the branch is currently checked out */
  gitBranchCheckedOut?: boolean;
  /** Last Git commit hash for this task */
  gitLastCommit?: string;
}
