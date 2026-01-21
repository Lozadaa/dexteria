/**
 * Git IPC Handlers
 *
 * Handles all Git-related IPC communication between renderer and main process.
 */

import { ipcMain } from 'electron';
import { GitService } from '../../services/GitService';
import { GitStateManager } from '../../services/GitStateManager';
import { getProjectRoot, getStore } from './shared';
import type {
  GitStatus,
  BranchInfo,
  CommitInfo,
  GitCommandResult,
  GitSafetyCheck,
  MergeResult,
  ConflictInfo,
  TaskBranchMapping,
  GitOperationLog,
  GitConfig,
  CreateTaskBranchOptions,
  CommitOptions,
  MergeOptions,
  ResolveConflictOptions,
} from '../../../shared/types';
import { DEFAULT_GIT_CONFIG } from '../../../shared/types';

// Git service instances (initialized per project)
let gitService: GitService | null = null;
let gitStateManager: GitStateManager | null = null;

/**
 * Get or create GitService for current project.
 */
function getGitService(): GitService | null {
  const root = getProjectRoot();
  if (!root) return null;

  if (!gitService) {
    gitService = new GitService(root);
  }
  return gitService;
}

/**
 * Get or create GitStateManager for current project.
 */
function getGitStateManager(): GitStateManager | null {
  const root = getProjectRoot();
  const store = getStore();
  if (!root || !store) return null;

  if (!gitStateManager) {
    gitStateManager = new GitStateManager(root, store);
  }
  return gitStateManager;
}

/**
 * Get Git config from project settings.
 */
function getGitConfig(): GitConfig {
  const store = getStore();
  if (!store) return DEFAULT_GIT_CONFIG;

  const settings = store.getSettings();
  return (settings as { git?: GitConfig }).git || DEFAULT_GIT_CONFIG;
}

/**
 * Clear Git services (called when project changes).
 */
export function clearGitServices(): void {
  gitService = null;
  gitStateManager = null;
}

/**
 * Get the GitStateManager instance (exported for task handlers).
 */
export function getGitStateManagerInstance(): GitStateManager | null {
  return getGitStateManager();
}

/**
 * Register all Git IPC handlers.
 */
export function registerGitHandlers(): void {
  // ============================================
  // Environment Detection
  // ============================================

  ipcMain.handle('git:isInstalled', async (): Promise<boolean> => {
    return GitService.isGitInstalled();
  });

  ipcMain.handle('git:getVersion', async (): Promise<string | null> => {
    return GitService.getGitVersion();
  });

  ipcMain.handle('git:getInstallInstructions', async (): Promise<string> => {
    return GitService.getInstallInstructions();
  });

  // ============================================
  // Repository Operations
  // ============================================

  ipcMain.handle('git:isRepository', async (): Promise<boolean> => {
    const service = getGitService();
    if (!service) return false;
    return service.isRepository();
  });

  ipcMain.handle('git:initRepository', async (_event, defaultBranch?: string): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.initRepository(defaultBranch);
  });

  ipcMain.handle('git:getStatus', async (): Promise<GitStatus> => {
    const service = getGitService();
    if (!service) {
      return {
        isRepo: false,
        currentBranch: null,
        isDirty: false,
        stagedCount: 0,
        modifiedCount: 0,
        untrackedCount: 0,
        ahead: 0,
        behind: 0,
        isMerging: false,
        isRebasing: false,
      };
    }
    return service.getStatus();
  });

  ipcMain.handle('git:getDefaultBranch', async (): Promise<string> => {
    const service = getGitService();
    if (!service) return 'main';
    return service.getDefaultBranch();
  });

  // ============================================
  // Branch Operations
  // ============================================

  ipcMain.handle('git:listBranches', async (_event, includeRemote = true): Promise<BranchInfo[]> => {
    const service = getGitService();
    if (!service) return [];
    return service.listBranches(includeRemote);
  });

  ipcMain.handle('git:createBranch', async (_event, name: string, base?: string): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.createBranch(name, base);
  });

  ipcMain.handle('git:checkoutBranch', async (_event, name: string, create = false): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.checkoutBranch(name, create);
  });

  ipcMain.handle('git:deleteBranch', async (_event, name: string, force = false): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.deleteBranch(name, force);
  });

  ipcMain.handle('git:branchExists', async (_event, name: string): Promise<boolean> => {
    const service = getGitService();
    if (!service) return false;
    return service.branchExists(name);
  });

  // ============================================
  // Task-Branch Mapping Operations
  // ============================================

  ipcMain.handle('git:getTaskBranch', async (_event, taskId: string): Promise<TaskBranchMapping | null> => {
    const manager = getGitStateManager();
    if (!manager) return null;
    return manager.getTaskBranchMapping(taskId);
  });

  ipcMain.handle('git:getAllTaskBranches', async (): Promise<TaskBranchMapping[]> => {
    const manager = getGitStateManager();
    if (!manager) return [];
    return manager.getAllMappings();
  });

  ipcMain.handle('git:createTaskBranch', async (_event, options: CreateTaskBranchOptions): Promise<{
    success: boolean;
    branchName?: string;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    const store = getStore();
    if (!manager || !store) {
      return { success: false, error: 'No project open' };
    }

    const task = store.getTask(options.taskId);
    if (!task) {
      return { success: false, error: `Task ${options.taskId} not found` };
    }

    const config = getGitConfig();
    return manager.createTaskBranch(task, config, 'user');
  });

  ipcMain.handle('git:checkoutTaskBranch', async (_event, taskId: string): Promise<{
    success: boolean;
    branchName?: string;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }
    return manager.checkoutTaskBranch(taskId, 'user');
  });

  ipcMain.handle('git:detachTaskBranch', async (_event, taskId: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }
    return manager.detachBranchFromTask(taskId);
  });

  ipcMain.handle('git:deleteTaskBranch', async (_event, taskId: string, force = false): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }
    return manager.deleteTaskBranch(taskId, force, 'user');
  });

  // ============================================
  // Commit Operations
  // ============================================

  ipcMain.handle('git:stageFiles', async (_event, files: string[] | 'all'): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.stageFiles(files);
  });

  ipcMain.handle('git:commit', async (_event, options: CommitOptions): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }

    // Stage files if specified
    if (options.files) {
      await service.stageFiles(options.files);
    }

    return service.commit(options.message, options.amend);
  });

  ipcMain.handle('git:getCommitHistory', async (_event, count = 20, branch?: string): Promise<CommitInfo[]> => {
    const service = getGitService();
    if (!service) return [];
    return service.getCommitHistory(count, branch);
  });

  ipcMain.handle('git:getHeadCommit', async (): Promise<string | null> => {
    const service = getGitService();
    if (!service) return null;
    return service.getHeadCommit();
  });

  // ============================================
  // Merge Operations
  // ============================================

  ipcMain.handle('git:mergeBranch', async (_event, options: MergeOptions): Promise<MergeResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, hadConflicts: false, conflicts: [], mergeCommitHash: null, error: 'No project open' };
    }

    // Checkout target branch first
    const checkoutResult = await service.checkoutBranch(options.targetBranch);
    if (!checkoutResult.success) {
      return { success: false, hadConflicts: false, conflicts: [], mergeCommitHash: null, error: checkoutResult.error || null };
    }

    return service.mergeBranch(options.sourceBranch, false, options.message);
  });

  ipcMain.handle('git:mergeTaskToReview', async (_event, taskId: string): Promise<{
    success: boolean;
    mergeResult?: MergeResult;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }

    const config = getGitConfig();
    return manager.mergeTaskToReview(taskId, config, 'user');
  });

  ipcMain.handle('git:mergeTaskToMain', async (_event, taskId: string): Promise<{
    success: boolean;
    mergeResult?: MergeResult;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }

    const config = getGitConfig();
    return manager.mergeTaskToMain(taskId, config, 'user');
  });

  ipcMain.handle('git:mergeReviewToMain', async (): Promise<{
    success: boolean;
    mergeResult?: MergeResult;
    error?: string;
  }> => {
    const manager = getGitStateManager();
    if (!manager) {
      return { success: false, error: 'No project open' };
    }

    const config = getGitConfig();
    return manager.mergeReviewToMain(config, 'user');
  });

  ipcMain.handle('git:abortMerge', async (): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.abortMerge();
  });

  // ============================================
  // Conflict Resolution
  // ============================================

  ipcMain.handle('git:getConflicts', async (): Promise<ConflictInfo[]> => {
    const service = getGitService();
    if (!service) return [];
    return service.getConflicts();
  });

  ipcMain.handle('git:resolveConflict', async (_event, options: ResolveConflictOptions): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }

    let resolution: 'ours' | 'theirs' | string;
    if (options.resolution === 'ours' || options.resolution === 'theirs') {
      resolution = options.resolution;
    } else if (options.resolution === 'manual' && options.manualContent) {
      resolution = options.manualContent;
    } else {
      return { success: false, stdout: '', stderr: 'Invalid resolution', exitCode: -1, error: 'Invalid resolution option' };
    }

    return service.resolveConflict(options.filePath, resolution);
  });

  // ============================================
  // Remote Operations
  // ============================================

  ipcMain.handle('git:push', async (_event, branch?: string, setUpstream = false): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.push(branch, setUpstream);
  });

  ipcMain.handle('git:pull', async (_event, branch?: string): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.pull(branch);
  });

  ipcMain.handle('git:fetch', async (_event, prune = false): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.fetch(prune);
  });

  // ============================================
  // Stash Operations
  // ============================================

  ipcMain.handle('git:stash', async (_event, message?: string): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.stash(message);
  });

  ipcMain.handle('git:stashPop', async (): Promise<GitCommandResult> => {
    const service = getGitService();
    if (!service) {
      return { success: false, stdout: '', stderr: 'No project open', exitCode: -1, error: 'No project open' };
    }
    return service.stashPop();
  });

  ipcMain.handle('git:stashList', async (): Promise<string[]> => {
    const service = getGitService();
    if (!service) return [];
    return service.stashList();
  });

  // ============================================
  // Diff Operations
  // ============================================

  ipcMain.handle('git:getStagedDiff', async (): Promise<string> => {
    const service = getGitService();
    if (!service) return '';
    return service.getStagedDiff();
  });

  ipcMain.handle('git:getUnstagedDiff', async (): Promise<string> => {
    const service = getGitService();
    if (!service) return '';
    return service.getUnstagedDiff();
  });

  ipcMain.handle('git:getDiff', async (_event, from: string, to: string): Promise<string> => {
    const service = getGitService();
    if (!service) return '';
    return service.getDiff(from, to);
  });

  // ============================================
  // Safety Checks
  // ============================================

  ipcMain.handle('git:runSafetyCheck', async (_event, operation: string): Promise<GitSafetyCheck> => {
    const service = getGitService();
    if (!service) {
      return { safe: false, warnings: [], blockers: ['No project open'], suggestions: [] };
    }
    const config = getGitConfig();
    return service.runSafetyCheck(operation, config);
  });

  // ============================================
  // Operation Logs
  // ============================================

  ipcMain.handle('git:getOperationLogs', async (_event, limit = 50, taskId?: string): Promise<GitOperationLog[]> => {
    const manager = getGitStateManager();
    if (!manager) return [];
    return manager.getOperationLogs(limit, taskId);
  });

  // ============================================
  // Sync & Utility
  // ============================================

  ipcMain.handle('git:syncWithBranches', async (): Promise<void> => {
    const manager = getGitStateManager();
    if (manager) {
      await manager.syncWithGitBranches();
    }
  });

  ipcMain.handle('git:generateBranchName', async (_event, taskId: string, taskTitle: string): Promise<string> => {
    const service = getGitService();
    if (!service) return `task/${taskId}`;
    const config = getGitConfig();
    return service.generateBranchName(taskId, taskTitle, config.branchConvention);
  });

  // ============================================
  // Configuration
  // ============================================

  ipcMain.handle('git:getConfig', async (): Promise<GitConfig> => {
    return getGitConfig();
  });
}
