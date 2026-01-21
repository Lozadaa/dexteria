/**
 * GitStateManager - Task-Branch State Machine
 *
 * Manages the relationship between tasks and Git branches.
 * Handles state transitions, persists mappings, and orchestrates Git operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GitService } from './GitService';
import type { LocalKanbanStore } from './LocalKanbanStore';
import type {
  GitConfig,
  GitStateFile,
  TaskBranchMapping,
  GitOperationLog,
  GitOperationInitiator,
  MergeResult,
  Task,
  TaskStatus,
} from '../../shared/types';
import { DEFAULT_GIT_STATE } from '../../shared/types';

/**
 * Result of a task status change operation.
 */
export interface TaskStatusChangeResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Associated branch name */
  branchName?: string;
  /** Error message if failed */
  error?: string;
  /** Warning messages */
  warnings?: string[];
  /** Merge result if a merge was performed */
  mergeResult?: MergeResult;
}

/**
 * GitStateManager handles task-branch lifecycle.
 */
export class GitStateManager {
  private gitService: GitService;
  private stateFilePath: string;
  private state: GitStateFile;

  constructor(projectRoot: string, _store: LocalKanbanStore) {
    this.gitService = new GitService(projectRoot);
    this.stateFilePath = path.join(projectRoot, '.local-kanban', 'git-state.json');
    this.state = this.loadState();
  }

  // ============================================
  // State Persistence
  // ============================================

  /**
   * Load state from disk.
   */
  private loadState(): GitStateFile {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const content = fs.readFileSync(this.stateFilePath, 'utf-8');
        return JSON.parse(content) as GitStateFile;
      }
    } catch (err) {
      console.error('Failed to load git state:', err);
    }
    return { ...DEFAULT_GIT_STATE };
  }

  /**
   * Save state to disk.
   */
  private saveState(): void {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('Failed to save git state:', err);
    }
  }

  /**
   * Get the current state.
   */
  getState(): GitStateFile {
    return { ...this.state };
  }

  // ============================================
  // Operation Logging
  // ============================================

  /**
   * Log a Git operation.
   */
  private logOperation(
    command: string,
    success: boolean,
    stdout: string,
    stderr: string,
    taskId: string | null,
    initiatedBy: GitOperationInitiator,
    durationMs?: number
  ): void {
    const log: GitOperationLog = {
      id: uuidv4(),
      command,
      timestamp: new Date().toISOString(),
      taskId,
      success,
      stdout: stdout.substring(0, 5000), // Limit log size
      stderr: stderr.substring(0, 5000),
      initiatedBy,
      durationMs,
    };

    // Keep last 100 operations
    this.state.operationLog = [log, ...this.state.operationLog].slice(0, 100);
    this.saveState();
  }

  /**
   * Get operation logs.
   */
  getOperationLogs(limit = 50, taskId?: string): GitOperationLog[] {
    let logs = this.state.operationLog;
    if (taskId) {
      logs = logs.filter((l) => l.taskId === taskId);
    }
    return logs.slice(0, limit);
  }

  // ============================================
  // Task-Branch Mapping
  // ============================================

  /**
   * Get mapping for a task.
   */
  getTaskBranchMapping(taskId: string): TaskBranchMapping | null {
    return this.state.mappings.find((m) => m.taskId === taskId) || null;
  }

  /**
   * Get all task-branch mappings.
   */
  getAllMappings(): TaskBranchMapping[] {
    return [...this.state.mappings];
  }

  /**
   * Find mapping by branch name.
   */
  getMappingByBranch(branchName: string): TaskBranchMapping | null {
    return this.state.mappings.find((m) => m.branchName === branchName) || null;
  }

  /**
   * Create a new task branch.
   */
  async createTaskBranch(
    task: Task,
    config: GitConfig,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    const startTime = Date.now();

    // Check if mapping already exists
    const existing = this.getTaskBranchMapping(task.id);
    if (existing) {
      return {
        success: false,
        error: `Task ${task.id} already has a branch: ${existing.branchName}`,
      };
    }

    // Generate branch name
    const branchName = this.gitService.generateBranchName(
      task.id,
      task.title,
      config.branchConvention
    );

    // Check if branch already exists
    const branchExists = await this.gitService.branchExists(branchName);
    if (branchExists) {
      return {
        success: false,
        error: `Branch ${branchName} already exists`,
      };
    }

    // Get current HEAD for base commit
    const baseCommit = await this.gitService.getHeadCommit();
    if (!baseCommit) {
      return {
        success: false,
        error: 'Could not get current HEAD commit',
      };
    }

    // Create the branch
    const result = await this.gitService.createBranch(branchName, config.mainBranch);
    const duration = Date.now() - startTime;

    this.logOperation(
      `git branch ${branchName} ${config.mainBranch}`,
      result.success,
      result.stdout,
      result.stderr,
      task.id,
      initiatedBy,
      duration
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create branch',
      };
    }

    // Create mapping
    const mapping: TaskBranchMapping = {
      taskId: task.id,
      branchName,
      createdAt: new Date().toISOString(),
      baseCommitHash: baseCommit,
      headCommitHash: baseCommit,
      isCheckedOut: false,
      isMerged: false,
      mergeCommitHash: null,
    };

    this.state.mappings.push(mapping);
    this.saveState();

    return {
      success: true,
      branchName,
    };
  }

  /**
   * Checkout a task's branch.
   */
  async checkoutTaskBranch(
    taskId: string,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    const startTime = Date.now();
    const mapping = this.getTaskBranchMapping(taskId);

    if (!mapping) {
      return {
        success: false,
        error: `No branch mapping found for task ${taskId}`,
      };
    }

    const result = await this.gitService.checkoutBranch(mapping.branchName);
    const duration = Date.now() - startTime;

    this.logOperation(
      `git checkout ${mapping.branchName}`,
      result.success,
      result.stdout,
      result.stderr,
      taskId,
      initiatedBy,
      duration
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to checkout branch',
      };
    }

    // Update mapping
    this.state.mappings = this.state.mappings.map((m) => ({
      ...m,
      isCheckedOut: m.taskId === taskId,
    }));
    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
    };
  }

  /**
   * Detach a branch from a task (remove mapping but keep branch).
   */
  async detachBranchFromTask(taskId: string): Promise<TaskStatusChangeResult> {
    const mapping = this.getTaskBranchMapping(taskId);

    if (!mapping) {
      return {
        success: false,
        error: `No branch mapping found for task ${taskId}`,
      };
    }

    this.state.mappings = this.state.mappings.filter((m) => m.taskId !== taskId);
    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
      warnings: [`Branch ${mapping.branchName} was detached but not deleted`],
    };
  }

  /**
   * Delete a task's branch and remove mapping.
   */
  async deleteTaskBranch(
    taskId: string,
    force = false,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    const startTime = Date.now();
    const mapping = this.getTaskBranchMapping(taskId);

    if (!mapping) {
      return {
        success: false,
        error: `No branch mapping found for task ${taskId}`,
      };
    }

    // Don't delete if currently checked out
    if (mapping.isCheckedOut) {
      return {
        success: false,
        error: `Cannot delete currently checked out branch ${mapping.branchName}`,
      };
    }

    const result = await this.gitService.deleteBranch(mapping.branchName, force);
    const duration = Date.now() - startTime;

    this.logOperation(
      `git branch ${force ? '-D' : '-d'} ${mapping.branchName}`,
      result.success,
      result.stdout,
      result.stderr,
      taskId,
      initiatedBy,
      duration
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to delete branch',
      };
    }

    // Remove mapping
    this.state.mappings = this.state.mappings.filter((m) => m.taskId !== taskId);
    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
    };
  }

  // ============================================
  // Task Lifecycle State Machine
  // ============================================

  /**
   * Handle task status change - the core state machine.
   *
   * State transitions:
   * - backlog/todo → doing: Create branch, checkout
   * - doing → review: Commit changes, optionally merge to review branch
   * - review → done: Merge to main, delete branch
   * - review → doing: Revert merge (if in review branch)
   */
  async handleTaskStatusChange(
    task: Task,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    config: GitConfig,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    // Skip if git not enabled
    if (!config.gitEnabled || config.gitMode === 'none') {
      return { success: true };
    }

    const transition = `${fromStatus}->${toStatus}`;

    switch (transition) {
      // Starting work on a task
      case 'backlog->doing':
      case 'todo->doing':
        return this.handleStartWork(task, config, initiatedBy);

      // Moving to review
      case 'doing->review':
        return this.handleMoveToReview(task, config, initiatedBy);

      // Completing a task
      case 'review->done':
        return this.handleComplete(task, config, initiatedBy);

      // Reverting from review back to doing
      case 'review->doing':
        return this.handleRevertFromReview(task, config, initiatedBy);

      // Backlog movement doesn't need Git action
      case 'backlog->todo':
      case 'todo->backlog':
        return { success: true };

      default:
        // Other transitions - no special handling
        return { success: true };
    }
  }

  /**
   * Handle starting work on a task (backlog/todo → doing).
   */
  private async handleStartWork(
    task: Task,
    config: GitConfig,
    initiatedBy: GitOperationInitiator
  ): Promise<TaskStatusChangeResult> {
    const warnings: string[] = [];

    // Check if repo is clean
    const status = await this.gitService.getStatus();
    if (status.isDirty && config.gitMode === 'advanced') {
      warnings.push('Working tree has uncommitted changes');
    }

    // Check if we need to pull latest
    if (status.behind > 0) {
      warnings.push(`Branch is ${status.behind} commits behind upstream`);
    }

    // Check if task already has a branch
    const existing = this.getTaskBranchMapping(task.id);
    if (existing) {
      // Just checkout existing branch
      return this.checkoutTaskBranch(task.id, initiatedBy);
    }

    // In advanced mode, checkout main and pull before creating branch
    if (config.gitMode === 'advanced') {
      // Checkout main branch
      const checkoutResult = await this.gitService.checkoutBranch(config.mainBranch);
      if (!checkoutResult.success) {
        return {
          success: false,
          error: `Failed to checkout ${config.mainBranch}: ${checkoutResult.error}`,
        };
      }

      // Pull latest
      const pullResult = await this.gitService.pull(config.mainBranch);
      if (!pullResult.success && !pullResult.stderr.includes('no tracking')) {
        warnings.push('Could not pull latest changes from remote');
      }
    }

    // Create task branch
    const createResult = await this.createTaskBranch(task, config, initiatedBy);
    if (!createResult.success) {
      return createResult;
    }

    // Checkout the new branch
    const checkoutResult = await this.checkoutTaskBranch(task.id, initiatedBy);
    if (!checkoutResult.success) {
      return {
        ...checkoutResult,
        warnings: [...warnings, ...(checkoutResult.warnings || [])],
      };
    }

    return {
      success: true,
      branchName: createResult.branchName,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Handle moving task to review (doing → review).
   */
  private async handleMoveToReview(
    task: Task,
    config: GitConfig,
    initiatedBy: GitOperationInitiator
  ): Promise<TaskStatusChangeResult> {
    const mapping = this.getTaskBranchMapping(task.id);
    const warnings: string[] = [];

    // In basic mode, just update mapping status
    if (config.gitMode === 'basic') {
      return { success: true, branchName: mapping?.branchName };
    }

    if (!mapping) {
      return {
        success: false,
        error: 'No branch found for this task',
      };
    }

    // Check for uncommitted changes
    const status = await this.gitService.getStatus();
    if (status.isDirty) {
      // Stage and commit changes
      await this.gitService.stageFiles('all');
      const commitResult = await this.gitService.commit(
        `${task.id}: ${task.title}\n\nMoving to review.`
      );

      if (!commitResult.success) {
        warnings.push('Could not commit changes');
      } else {
        // Update mapping head commit
        const newHead = await this.gitService.getHeadCommit();
        if (newHead) {
          const idx = this.state.mappings.findIndex((m) => m.taskId === task.id);
          if (idx >= 0) {
            this.state.mappings[idx].headCommitHash = newHead;
          }
        }
      }
    }

    // If review branch is configured, merge into it
    if (config.reviewBranch) {
      const mergeResult = await this.mergeTaskToReview(task.id, config, initiatedBy);
      if (!mergeResult.success) {
        return {
          ...mergeResult,
          warnings: [...warnings, ...(mergeResult.warnings || [])],
        };
      }
    }

    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Handle completing a task (review → done).
   */
  private async handleComplete(
    task: Task,
    config: GitConfig,
    initiatedBy: GitOperationInitiator
  ): Promise<TaskStatusChangeResult> {
    const mapping = this.getTaskBranchMapping(task.id);

    if (!mapping) {
      return { success: true }; // No branch to manage
    }

    // In basic mode, just mark as merged
    if (config.gitMode === 'basic') {
      const idx = this.state.mappings.findIndex((m) => m.taskId === task.id);
      if (idx >= 0) {
        this.state.mappings[idx].isMerged = true;
      }
      this.saveState();
      return { success: true, branchName: mapping.branchName };
    }

    // In advanced mode, merge to main and delete branch
    const mergeResult = await this.mergeTaskToMain(task.id, config, initiatedBy);
    if (!mergeResult.success) {
      return mergeResult;
    }

    // Delete the task branch
    const deleteResult = await this.deleteTaskBranch(task.id, false, initiatedBy);
    if (!deleteResult.success) {
      return {
        success: true,
        branchName: mapping.branchName,
        warnings: [`Branch was merged but could not be deleted: ${deleteResult.error}`],
        mergeResult: mergeResult.mergeResult,
      };
    }

    return {
      success: true,
      branchName: mapping.branchName,
      mergeResult: mergeResult.mergeResult,
    };
  }

  /**
   * Handle reverting from review back to doing.
   */
  private async handleRevertFromReview(
    task: Task,
    config: GitConfig,
    initiatedBy: GitOperationInitiator
  ): Promise<TaskStatusChangeResult> {
    const mapping = this.getTaskBranchMapping(task.id);

    if (!mapping) {
      return { success: true };
    }

    // In basic mode, nothing to do
    if (config.gitMode === 'basic') {
      return { success: true, branchName: mapping.branchName };
    }

    // If task was merged to review branch, this is complex
    // For now, just checkout the task branch again
    const checkoutResult = await this.checkoutTaskBranch(task.id, initiatedBy);
    if (!checkoutResult.success) {
      return checkoutResult;
    }

    // Remove from review branch tracking
    if (this.state.reviewBranch) {
      this.state.reviewBranch.mergedTaskIds = this.state.reviewBranch.mergedTaskIds.filter(
        (id) => id !== task.id
      );
      this.saveState();
    }

    return {
      success: true,
      branchName: mapping.branchName,
      warnings: ['Note: Changes may still be in review branch if previously merged'],
    };
  }

  // ============================================
  // Merge Operations
  // ============================================

  /**
   * Merge a task branch into the review branch.
   */
  async mergeTaskToReview(
    taskId: string,
    config: GitConfig,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    if (!config.reviewBranch) {
      return {
        success: false,
        error: 'No review branch configured',
      };
    }

    const mapping = this.getTaskBranchMapping(taskId);
    if (!mapping) {
      return {
        success: false,
        error: `No branch found for task ${taskId}`,
      };
    }

    const startTime = Date.now();

    // Checkout review branch
    let result = await this.gitService.checkoutBranch(config.reviewBranch);
    if (!result.success) {
      // Review branch might not exist, create it
      result = await this.gitService.checkoutBranch(config.reviewBranch, true);
      if (!result.success) {
        return {
          success: false,
          error: `Failed to checkout/create review branch: ${result.error}`,
        };
      }
    }

    // Merge task branch
    const mergeResult = await this.gitService.mergeBranch(
      mapping.branchName,
      false,
      `Merge ${taskId} into ${config.reviewBranch}`
    );
    const duration = Date.now() - startTime;

    this.logOperation(
      `git merge ${mapping.branchName}`,
      mergeResult.success,
      '',
      mergeResult.error || '',
      taskId,
      initiatedBy,
      duration
    );

    if (!mergeResult.success) {
      if (mergeResult.hadConflicts) {
        return {
          success: false,
          error: 'Merge conflicts detected',
          mergeResult,
        };
      }
      return {
        success: false,
        error: mergeResult.error || 'Merge failed',
        mergeResult,
      };
    }

    // Update state
    const idx = this.state.mappings.findIndex((m) => m.taskId === taskId);
    if (idx >= 0) {
      this.state.mappings[idx].isMerged = true;
      this.state.mappings[idx].mergeCommitHash = mergeResult.mergeCommitHash;
      this.state.mappings[idx].mergedTo = config.reviewBranch;
    }

    // Update review branch info
    if (!this.state.reviewBranch) {
      this.state.reviewBranch = {
        name: config.reviewBranch,
        mergedTaskIds: [],
        headCommitHash: mergeResult.mergeCommitHash || '',
        lastMergeAt: new Date().toISOString(),
      };
    }
    if (!this.state.reviewBranch.mergedTaskIds.includes(taskId)) {
      this.state.reviewBranch.mergedTaskIds.push(taskId);
    }
    this.state.reviewBranch.lastMergeAt = new Date().toISOString();
    if (mergeResult.mergeCommitHash) {
      this.state.reviewBranch.headCommitHash = mergeResult.mergeCommitHash;
    }

    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
      mergeResult,
    };
  }

  /**
   * Merge a task branch (or review branch) into main.
   */
  async mergeTaskToMain(
    taskId: string,
    config: GitConfig,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    const mapping = this.getTaskBranchMapping(taskId);
    if (!mapping) {
      return {
        success: false,
        error: `No branch found for task ${taskId}`,
      };
    }

    const startTime = Date.now();
    const sourceBranch = mapping.branchName;

    // Checkout main branch
    let result = await this.gitService.checkoutBranch(config.mainBranch);
    if (!result.success) {
      return {
        success: false,
        error: `Failed to checkout ${config.mainBranch}: ${result.error}`,
      };
    }

    // Pull latest
    await this.gitService.pull(config.mainBranch);

    // Merge
    const mergeResult = await this.gitService.mergeBranch(
      sourceBranch,
      false,
      `Merge ${taskId}: ${mapping.branchName}`
    );
    const duration = Date.now() - startTime;

    this.logOperation(
      `git merge ${sourceBranch}`,
      mergeResult.success,
      '',
      mergeResult.error || '',
      taskId,
      initiatedBy,
      duration
    );

    if (!mergeResult.success) {
      if (mergeResult.hadConflicts) {
        return {
          success: false,
          error: 'Merge conflicts detected',
          mergeResult,
        };
      }
      return {
        success: false,
        error: mergeResult.error || 'Merge failed',
        mergeResult,
      };
    }

    // Update mapping
    const idx = this.state.mappings.findIndex((m) => m.taskId === taskId);
    if (idx >= 0) {
      this.state.mappings[idx].isMerged = true;
      this.state.mappings[idx].mergeCommitHash = mergeResult.mergeCommitHash;
      this.state.mappings[idx].mergedTo = config.mainBranch;
    }

    this.saveState();

    return {
      success: true,
      branchName: mapping.branchName,
      mergeResult,
    };
  }

  /**
   * Merge review branch into main.
   */
  async mergeReviewToMain(
    config: GitConfig,
    initiatedBy: GitOperationInitiator = 'system'
  ): Promise<TaskStatusChangeResult> {
    if (!config.reviewBranch) {
      return {
        success: false,
        error: 'No review branch configured',
      };
    }

    const startTime = Date.now();

    // Checkout main
    let result = await this.gitService.checkoutBranch(config.mainBranch);
    if (!result.success) {
      return {
        success: false,
        error: `Failed to checkout ${config.mainBranch}: ${result.error}`,
      };
    }

    // Pull latest
    await this.gitService.pull(config.mainBranch);

    // Merge review branch
    const mergeResult = await this.gitService.mergeBranch(
      config.reviewBranch,
      false,
      `Merge ${config.reviewBranch} into ${config.mainBranch}`
    );
    const duration = Date.now() - startTime;

    this.logOperation(
      `git merge ${config.reviewBranch}`,
      mergeResult.success,
      '',
      mergeResult.error || '',
      null,
      initiatedBy,
      duration
    );

    if (!mergeResult.success) {
      return {
        success: false,
        error: mergeResult.error || 'Merge failed',
        mergeResult,
      };
    }

    // Mark all tasks in review as merged to main
    if (this.state.reviewBranch) {
      for (const taskId of this.state.reviewBranch.mergedTaskIds) {
        const idx = this.state.mappings.findIndex((m) => m.taskId === taskId);
        if (idx >= 0) {
          this.state.mappings[idx].mergedTo = config.mainBranch;
        }
      }
      this.state.reviewBranch.mergedTaskIds = [];
    }

    this.saveState();

    return {
      success: true,
      mergeResult,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Sync state with actual Git branches.
   */
  async syncWithGitBranches(): Promise<void> {
    const branches = await this.gitService.listBranches(false);
    const branchNames = new Set(branches.map((b) => b.name));

    // Remove mappings for branches that no longer exist
    this.state.mappings = this.state.mappings.filter((m) => branchNames.has(m.branchName));

    // Update checkout status
    const currentBranch = branches.find((b) => b.isCurrent)?.name;
    this.state.mappings = this.state.mappings.map((m) => ({
      ...m,
      isCheckedOut: m.branchName === currentBranch,
    }));

    this.saveState();
  }

  /**
   * Get the GitService instance.
   */
  getGitService(): GitService {
    return this.gitService;
  }
}
