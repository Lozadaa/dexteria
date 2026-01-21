/**
 * GitService - Core Git Operations Service
 *
 * Handles all Git command execution with safety checks, logging, and proper error handling.
 * This service is stateless and operates on the provided project root directory.
 */

import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type {
  GitStatus,
  BranchInfo,
  CommitInfo,
  GitCommandResult,
  GitSafetyCheck,
  MergeResult,
  ConflictInfo,
  GitConfig,
} from '../../shared/types';

/**
 * Options for running Git commands.
 */
interface GitExecOptions {
  /** Working directory */
  cwd?: string;
  /** Command timeout in milliseconds */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * GitService provides low-level Git operations.
 */
export class GitService {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  // ============================================
  // Static Methods - Environment Detection
  // ============================================

  /**
   * Check if Git is installed on the system.
   */
  static isGitInstalled(): boolean {
    try {
      execSync('git --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get installed Git version.
   */
  static getGitVersion(): string | null {
    try {
      const result = execSync('git --version', { encoding: 'utf-8' });
      const match = result.match(/git version (\d+\.\d+\.\d+)/);
      return match ? match[1] : result.trim();
    } catch {
      return null;
    }
  }

  /**
   * Get Git installation instructions for the current platform.
   */
  static getInstallInstructions(): string {
    const platform = process.platform;
    switch (platform) {
      case 'win32':
        return 'Download and install Git from https://git-scm.com/download/win or use: winget install Git.Git';
      case 'darwin':
        return 'Install Git using: brew install git or download from https://git-scm.com/download/mac';
      case 'linux':
        return 'Install Git using: sudo apt install git (Debian/Ubuntu) or sudo dnf install git (Fedora)';
      default:
        return 'Download and install Git from https://git-scm.com/downloads';
    }
  }

  // ============================================
  // Core Git Command Execution
  // ============================================

  /**
   * Execute a Git command and return the result.
   */
  private async exec(args: string[], options: GitExecOptions = {}): Promise<GitCommandResult> {
    const cwd = options.cwd || this.projectRoot;
    const timeout = options.timeout || 30000;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn('git', args, {
        cwd,
        env: { ...process.env, ...options.env },
        shell: process.platform === 'win32',
      });

      const timeoutId = setTimeout(() => {
        proc.kill();
        resolve({
          success: false,
          stdout,
          stderr,
          exitCode: -1,
          error: `Command timed out after ${timeout}ms`,
        });
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? -1,
          error: code !== 0 ? stderr.trim() || `Git command failed with exit code ${code}` : undefined,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr: err.message,
          exitCode: -1,
          error: err.message,
        });
      });
    });
  }

  // ============================================
  // Repository Operations
  // ============================================

  /**
   * Check if the project root is a Git repository.
   */
  async isRepository(): Promise<boolean> {
    const result = await this.exec(['rev-parse', '--is-inside-work-tree']);
    return result.success && result.stdout === 'true';
  }

  /**
   * Initialize a new Git repository.
   */
  async initRepository(defaultBranch = 'main'): Promise<GitCommandResult> {
    const result = await this.exec(['init', '-b', defaultBranch]);
    return result;
  }

  /**
   * Get the repository root directory.
   */
  async getRepoRoot(): Promise<string | null> {
    const result = await this.exec(['rev-parse', '--show-toplevel']);
    return result.success ? result.stdout : null;
  }

  /**
   * Get comprehensive repository status.
   */
  async getStatus(): Promise<GitStatus> {
    const isRepo = await this.isRepository();
    if (!isRepo) {
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

    // Get current branch
    const branchResult = await this.exec(['branch', '--show-current']);
    const currentBranch = branchResult.success ? branchResult.stdout || null : null;

    // Get porcelain status
    const statusResult = await this.exec(['status', '--porcelain=v1']);
    const lines = statusResult.stdout.split('\n').filter(Boolean);

    let stagedCount = 0;
    let modifiedCount = 0;
    let untrackedCount = 0;

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];

      if (indexStatus !== ' ' && indexStatus !== '?') stagedCount++;
      if (workTreeStatus !== ' ' && workTreeStatus !== '?') modifiedCount++;
      if (indexStatus === '?') untrackedCount++;
    }

    // Get ahead/behind
    let ahead = 0;
    let behind = 0;
    if (currentBranch) {
      const trackingResult = await this.exec(['rev-list', '--left-right', '--count', `HEAD...@{upstream}`]);
      if (trackingResult.success) {
        const [a, b] = trackingResult.stdout.split(/\s+/).map(Number);
        ahead = a || 0;
        behind = b || 0;
      }
    }

    // Check merge state
    const gitDir = path.join(this.projectRoot, '.git');
    const isMerging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
    const isRebasing = fs.existsSync(path.join(gitDir, 'rebase-merge')) ||
                       fs.existsSync(path.join(gitDir, 'rebase-apply'));

    return {
      isRepo: true,
      currentBranch,
      isDirty: stagedCount > 0 || modifiedCount > 0 || untrackedCount > 0,
      stagedCount,
      modifiedCount,
      untrackedCount,
      ahead,
      behind,
      isMerging,
      isRebasing,
    };
  }

  /**
   * Get the default branch name.
   */
  async getDefaultBranch(): Promise<string> {
    // Try to get from remote
    const remoteResult = await this.exec(['remote', 'show', 'origin']);
    if (remoteResult.success) {
      const match = remoteResult.stdout.match(/HEAD branch: (\S+)/);
      if (match) return match[1];
    }

    // Try symbolic-ref
    const symResult = await this.exec(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    if (symResult.success) {
      const match = symResult.stdout.match(/refs\/remotes\/origin\/(\S+)/);
      if (match) return match[1];
    }

    // Default fallback
    return 'main';
  }

  // ============================================
  // Branch Operations
  // ============================================

  /**
   * List all branches (local and remote).
   */
  async listBranches(includeRemote = true): Promise<BranchInfo[]> {
    const args = ['branch', '-v', '--format=%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(subject)|%(HEAD)'];
    if (includeRemote) args.push('-a');

    const result = await this.exec(args);
    if (!result.success) return [];

    const branches: BranchInfo[] = [];
    const lines = result.stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      const [name, hash, date, message, head] = line.split('|');
      if (!name) continue;

      const isRemote = name.startsWith('remotes/');
      const cleanName = isRemote ? name.replace(/^remotes\/origin\//, '') : name;

      // Extract task ID from branch name (task/{taskId}-{slug} pattern)
      const taskMatch = cleanName.match(/^task\/([A-Z]+-\d+)/i);

      branches.push({
        name: cleanName,
        isCurrent: head === '*',
        isRemote,
        taskId: taskMatch ? taskMatch[1] : null,
        lastCommitHash: hash,
        lastCommitDate: date,
        lastCommitMessage: message,
      });
    }

    return branches;
  }

  /**
   * Create a new branch.
   */
  async createBranch(name: string, base?: string): Promise<GitCommandResult> {
    const args = ['branch', name];
    if (base) args.push(base);
    return this.exec(args);
  }

  /**
   * Checkout a branch.
   */
  async checkoutBranch(name: string, create = false): Promise<GitCommandResult> {
    const args = create ? ['checkout', '-b', name] : ['checkout', name];
    return this.exec(args);
  }

  /**
   * Delete a branch.
   */
  async deleteBranch(name: string, force = false): Promise<GitCommandResult> {
    const flag = force ? '-D' : '-d';
    return this.exec(['branch', flag, name]);
  }

  /**
   * Rename a branch.
   */
  async renameBranch(oldName: string, newName: string): Promise<GitCommandResult> {
    return this.exec(['branch', '-m', oldName, newName]);
  }

  /**
   * Check if a branch exists.
   */
  async branchExists(name: string): Promise<boolean> {
    const result = await this.exec(['show-ref', '--verify', '--quiet', `refs/heads/${name}`]);
    return result.success;
  }

  // ============================================
  // Staging & Commit Operations
  // ============================================

  /**
   * Stage files for commit.
   */
  async stageFiles(files: string[] | 'all'): Promise<GitCommandResult> {
    if (files === 'all') {
      return this.exec(['add', '-A']);
    }
    return this.exec(['add', '--', ...files]);
  }

  /**
   * Unstage files.
   */
  async unstageFiles(files: string[] | 'all'): Promise<GitCommandResult> {
    if (files === 'all') {
      return this.exec(['reset', 'HEAD']);
    }
    return this.exec(['reset', 'HEAD', '--', ...files]);
  }

  /**
   * Create a commit.
   */
  async commit(message: string, amend = false): Promise<GitCommandResult> {
    const args = ['commit', '-m', message];
    if (amend) args.push('--amend');
    return this.exec(args);
  }

  /**
   * Get the current HEAD commit hash.
   */
  async getHeadCommit(): Promise<string | null> {
    const result = await this.exec(['rev-parse', 'HEAD']);
    return result.success ? result.stdout : null;
  }

  /**
   * Get commit history.
   */
  async getCommitHistory(count = 20, branch?: string): Promise<CommitInfo[]> {
    const args = [
      'log',
      `-${count}`,
      '--format=%H|%h|%s|%an|%ae|%aI',
    ];
    if (branch) args.push(branch);

    const result = await this.exec(args);
    if (!result.success) return [];

    return result.stdout.split('\n').filter(Boolean).map((line) => {
      const [hash, shortHash, message, author, authorEmail, date] = line.split('|');
      return { hash, shortHash, message, author, authorEmail, date };
    });
  }

  // ============================================
  // Merge Operations
  // ============================================

  /**
   * Merge a branch into the current branch.
   */
  async mergeBranch(name: string, noCommit = false, message?: string): Promise<MergeResult> {
    const args = ['merge', name];
    if (noCommit) args.push('--no-commit');
    if (message) args.push('-m', message);

    const result = await this.exec(args);

    if (result.success) {
      const commitHash = await this.getHeadCommit();
      return {
        success: true,
        hadConflicts: false,
        conflicts: [],
        mergeCommitHash: commitHash,
        error: null,
      };
    }

    // Check for conflicts
    if (result.stderr.includes('CONFLICT') || result.stdout.includes('CONFLICT')) {
      const conflicts = await this.getConflicts();
      return {
        success: false,
        hadConflicts: true,
        conflicts,
        mergeCommitHash: null,
        error: 'Merge conflicts detected',
      };
    }

    return {
      success: false,
      hadConflicts: false,
      conflicts: [],
      mergeCommitHash: null,
      error: result.error || 'Merge failed',
    };
  }

  /**
   * Abort a merge in progress.
   */
  async abortMerge(): Promise<GitCommandResult> {
    return this.exec(['merge', '--abort']);
  }

  /**
   * Get list of conflicted files with details.
   */
  async getConflicts(): Promise<ConflictInfo[]> {
    const result = await this.exec(['diff', '--name-only', '--diff-filter=U']);
    if (!result.success) return [];

    const conflicts: ConflictInfo[] = [];
    const files = result.stdout.split('\n').filter(Boolean);

    for (const filePath of files) {
      const info = await this.getConflictInfo(filePath);
      if (info) conflicts.push(info);
    }

    return conflicts;
  }

  /**
   * Get detailed conflict info for a file.
   */
  private async getConflictInfo(filePath: string): Promise<ConflictInfo | null> {
    const fullPath = path.join(this.projectRoot, filePath);

    // Check if file exists and is binary
    const isBinary = await this.isFileBinary(filePath);

    // Get file size
    let fileSize = 0;
    try {
      const stats = fs.statSync(fullPath);
      fileSize = stats.size;
    } catch {
      // File might be deleted
    }

    if (isBinary) {
      return {
        filePath,
        conflictType: 'binary',
        isBinary: true,
        oursContent: null,
        theirsContent: null,
        baseContent: null,
        suggestedResolution: null,
        status: 'unresolved',
        fileSize,
      };
    }

    // Get ours, theirs, base content
    const oursResult = await this.exec(['show', `:2:${filePath}`]);
    const theirsResult = await this.exec(['show', `:3:${filePath}`]);
    const baseResult = await this.exec(['show', `:1:${filePath}`]);

    return {
      filePath,
      conflictType: 'content',
      isBinary: false,
      oursContent: oursResult.success ? oursResult.stdout : null,
      theirsContent: theirsResult.success ? theirsResult.stdout : null,
      baseContent: baseResult.success ? baseResult.stdout : null,
      suggestedResolution: null,
      status: 'unresolved',
      fileSize,
    };
  }

  /**
   * Check if a file is binary.
   */
  private async isFileBinary(filePath: string): Promise<boolean> {
    const result = await this.exec(['diff', '--numstat', '-z', '--', '/dev/null', filePath]);
    return result.stdout.startsWith('-');
  }

  /**
   * Resolve a conflict by choosing a version.
   */
  async resolveConflict(filePath: string, resolution: 'ours' | 'theirs' | string): Promise<GitCommandResult> {
    if (resolution === 'ours') {
      return this.exec(['checkout', '--ours', '--', filePath]);
    }
    if (resolution === 'theirs') {
      return this.exec(['checkout', '--theirs', '--', filePath]);
    }

    // Manual resolution - write content to file
    const fullPath = path.join(this.projectRoot, filePath);
    try {
      fs.writeFileSync(fullPath, resolution, 'utf-8');
      return this.exec(['add', '--', filePath]);
    } catch (err) {
      return {
        success: false,
        stdout: '',
        stderr: (err as Error).message,
        exitCode: -1,
        error: `Failed to write resolved content: ${(err as Error).message}`,
      };
    }
  }

  // ============================================
  // Remote Operations
  // ============================================

  /**
   * Push to remote.
   */
  async push(branch?: string, setUpstream = false, force = false): Promise<GitCommandResult> {
    const args = ['push'];
    if (setUpstream) args.push('-u', 'origin');
    if (force) args.push('--force-with-lease');
    if (branch) args.push('origin', branch);
    return this.exec(args, { timeout: 60000 });
  }

  /**
   * Pull from remote.
   */
  async pull(branch?: string): Promise<GitCommandResult> {
    const args = ['pull'];
    if (branch) args.push('origin', branch);
    return this.exec(args, { timeout: 60000 });
  }

  /**
   * Fetch from remote.
   */
  async fetch(prune = false): Promise<GitCommandResult> {
    const args = ['fetch'];
    if (prune) args.push('--prune');
    return this.exec(args, { timeout: 60000 });
  }

  // ============================================
  // Stash Operations
  // ============================================

  /**
   * Stash current changes.
   */
  async stash(message?: string): Promise<GitCommandResult> {
    const args = ['stash', 'push'];
    if (message) args.push('-m', message);
    return this.exec(args);
  }

  /**
   * Pop the most recent stash.
   */
  async stashPop(): Promise<GitCommandResult> {
    return this.exec(['stash', 'pop']);
  }

  /**
   * List stashes.
   */
  async stashList(): Promise<string[]> {
    const result = await this.exec(['stash', 'list']);
    return result.success ? result.stdout.split('\n').filter(Boolean) : [];
  }

  // ============================================
  // Diff Operations
  // ============================================

  /**
   * Get diff for staged changes.
   */
  async getStagedDiff(): Promise<string> {
    const result = await this.exec(['diff', '--cached']);
    return result.stdout;
  }

  /**
   * Get diff for unstaged changes.
   */
  async getUnstagedDiff(): Promise<string> {
    const result = await this.exec(['diff']);
    return result.stdout;
  }

  /**
   * Get diff between two commits/branches.
   */
  async getDiff(from: string, to: string): Promise<string> {
    const result = await this.exec(['diff', from, to]);
    return result.stdout;
  }

  // ============================================
  // Safety Checks
  // ============================================

  /**
   * Run safety checks before a Git operation.
   */
  async runSafetyCheck(operation: string, config: GitConfig): Promise<GitSafetyCheck> {
    const warnings: string[] = [];
    const blockers: string[] = [];
    const suggestions: string[] = [];

    const status = await this.getStatus();

    // Check for uncommitted changes
    if (status.isDirty) {
      if (operation === 'checkout' || operation === 'merge') {
        warnings.push('You have uncommitted changes that may be affected');
        suggestions.push('Consider committing or stashing your changes first');
      }
    }

    // Check for merge in progress
    if (status.isMerging) {
      blockers.push('A merge is currently in progress');
      suggestions.push('Resolve the current merge before proceeding');
    }

    // Check for rebase in progress
    if (status.isRebasing) {
      blockers.push('A rebase is currently in progress');
      suggestions.push('Complete or abort the current rebase first');
    }

    // Check protected branches for dangerous operations
    if (operation === 'delete' || operation === 'force-push') {
      if (status.currentBranch && config.protectedBranches.includes(status.currentBranch)) {
        blockers.push(`Cannot perform ${operation} on protected branch: ${status.currentBranch}`);
      }
    }

    // Check if behind upstream before push
    if (operation === 'push' && status.behind > 0) {
      warnings.push(`Branch is ${status.behind} commits behind upstream`);
      suggestions.push('Consider pulling first to avoid push rejection');
    }

    return {
      safe: blockers.length === 0,
      warnings,
      blockers,
      suggestions,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate a branch name from task info using convention.
   */
  generateBranchName(taskId: string, taskTitle: string, convention: string): string {
    // Create a slug from the title
    const slug = taskTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    return convention
      .replace('{taskId}', taskId)
      .replace('{slug}', slug);
  }

  /**
   * Clean up old/orphan task branches.
   */
  async cleanupOrphanBranches(activeTaskIds: string[]): Promise<string[]> {
    const branches = await this.listBranches(false);
    const deletedBranches: string[] = [];

    for (const branch of branches) {
      if (branch.taskId && !activeTaskIds.includes(branch.taskId) && !branch.isCurrent) {
        const result = await this.deleteBranch(branch.name);
        if (result.success) {
          deletedBranches.push(branch.name);
        }
      }
    }

    return deletedBranches;
  }
}
