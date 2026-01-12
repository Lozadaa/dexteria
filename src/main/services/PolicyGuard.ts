/**
 * PolicyGuard
 *
 * Security enforcement based on policy.json.
 * Validates paths, commands, and enforces limits.
 */

import * as path from 'path';
import { minimatch } from 'minimatch';
import type { Policy, PolicyLimits } from '../../shared/types';

export interface DiffStats {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface RuntimeStats {
  startTime: number;
  stepsExecuted: number;
  filesModified: string[];
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export class PolicyGuard {
  private policy: Policy;
  private projectRoot: string;

  constructor(projectRoot: string, policy: Policy) {
    this.projectRoot = path.resolve(projectRoot);
    this.policy = policy;
  }

  // ============================================
  // Path Validation
  // ============================================

  /**
   * Normalize and resolve a path relative to project root.
   * Returns null if path escapes project root.
   */
  private normalizePath(inputPath: string): string | null {
    // Handle both absolute and relative paths
    const resolved = path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(this.projectRoot, inputPath);

    // Check for path traversal - must be within project root
    if (!resolved.startsWith(this.projectRoot)) {
      return null;
    }

    // Get relative path from project root
    return path.relative(this.projectRoot, resolved);
  }

  /**
   * Check if a path matches any pattern in a list.
   */
  private matchesPattern(relativePath: string, patterns: string[]): boolean {
    // Normalize path separators for cross-platform matching
    const normalized = relativePath.replace(/\\/g, '/');

    for (const pattern of patterns) {
      if (minimatch(normalized, pattern, { dot: true })) {
        return true;
      }
      // Also check if any parent directory matches
      const parts = normalized.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const partial = parts.slice(0, i).join('/');
        if (minimatch(partial, pattern, { dot: true })) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if filename matches blocked patterns (secrets, keys, etc.)
   */
  private matchesBlockedPattern(relativePath: string): boolean {
    const fileName = path.basename(relativePath);
    const normalized = relativePath.replace(/\\/g, '/');

    for (const pattern of this.policy.blockedPatterns) {
      // Match against filename
      if (minimatch(fileName, pattern, { dot: true })) {
        return true;
      }
      // Match against full path
      if (minimatch(normalized, pattern, { dot: true })) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate a path for any operation.
   */
  validatePath(inputPath: string): ValidationResult {
    const relativePath = this.normalizePath(inputPath);

    if (relativePath === null) {
      return {
        allowed: false,
        reason: `Path traversal detected: "${inputPath}" escapes project root`,
      };
    }

    // Check blocked patterns first (highest priority)
    if (this.matchesBlockedPattern(relativePath)) {
      return {
        allowed: false,
        reason: `Path matches blocked pattern: "${relativePath}"`,
      };
    }

    // Check explicitly blocked paths
    if (this.matchesPattern(relativePath, this.policy.blockedPaths)) {
      return {
        allowed: false,
        reason: `Path is blocked by policy: "${relativePath}"`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate a path for read operations.
   */
  validateRead(inputPath: string): ValidationResult {
    const baseValidation = this.validatePath(inputPath);
    if (!baseValidation.allowed) {
      return baseValidation;
    }

    if (!this.policy.allowedOperations.includes('read')) {
      return {
        allowed: false,
        reason: 'Read operations are not allowed by policy',
      };
    }

    const relativePath = this.normalizePath(inputPath)!;

    // Check if path is in allowed paths
    if (this.policy.allowedPaths.length > 0) {
      if (!this.matchesPattern(relativePath, this.policy.allowedPaths)) {
        return {
          allowed: false,
          reason: `Path not in allowed paths: "${relativePath}"`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate a path for write operations.
   */
  validateWrite(inputPath: string, fileSize?: number): ValidationResult {
    const baseValidation = this.validatePath(inputPath);
    if (!baseValidation.allowed) {
      return baseValidation;
    }

    if (!this.policy.allowedOperations.includes('write')) {
      return {
        allowed: false,
        reason: 'Write operations are not allowed by policy',
      };
    }

    const relativePath = this.normalizePath(inputPath)!;

    // Check if path is in allowed paths
    if (this.policy.allowedPaths.length > 0) {
      if (!this.matchesPattern(relativePath, this.policy.allowedPaths)) {
        return {
          allowed: false,
          reason: `Path not in allowed paths for write: "${relativePath}"`,
        };
      }
    }

    // Check file size limit
    if (fileSize !== undefined && fileSize > this.policy.maxFileSize) {
      return {
        allowed: false,
        reason: `File size (${fileSize} bytes) exceeds limit (${this.policy.maxFileSize} bytes)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate a shell command.
   */
  validateCommand(cmd: string): ValidationResult {
    const trimmed = cmd.trim();
    const lowerCmd = trimmed.toLowerCase();

    // Check blocked commands/patterns
    for (const blocked of this.policy.shellCommands.blocked) {
      if (lowerCmd.includes(blocked.toLowerCase())) {
        return {
          allowed: false,
          reason: `Command contains blocked pattern: "${blocked}"`,
        };
      }
    }

    // Check if command starts with an allowed program
    const firstWord = trimmed.split(/\s+/)[0];
    const isAllowed = this.policy.shellCommands.allowed.some(
      allowed => firstWord === allowed || firstWord.endsWith('/' + allowed) || firstWord.endsWith('\\' + allowed)
    );

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Command "${firstWord}" is not in the allowed list: [${this.policy.shellCommands.allowed.join(', ')}]`,
      };
    }

    return { allowed: true };
  }

  // ============================================
  // Limit Enforcement
  // ============================================

  /**
   * Enforce diff limits (files changed, lines added/removed).
   */
  enforceDiffLimits(stats: DiffStats): ValidationResult {
    const limits = this.policy.limits;

    if (stats.filesChanged > limits.maxFilesPerRun) {
      return {
        allowed: false,
        reason: `Files changed (${stats.filesChanged}) exceeds limit (${limits.maxFilesPerRun})`,
      };
    }

    const totalDiffLines = stats.linesAdded + stats.linesRemoved;
    if (totalDiffLines > limits.maxDiffLinesPerRun) {
      return {
        allowed: false,
        reason: `Diff lines (${totalDiffLines}) exceeds limit (${limits.maxDiffLinesPerRun})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Enforce runtime limits.
   */
  enforceRuntimeLimits(stats: RuntimeStats): ValidationResult {
    const limits = this.policy.limits;

    // Check runtime duration
    const runtimeMinutes = (Date.now() - stats.startTime) / 1000 / 60;
    if (runtimeMinutes > limits.maxRuntimeMinutes) {
      return {
        allowed: false,
        reason: `Runtime (${runtimeMinutes.toFixed(1)} min) exceeds limit (${limits.maxRuntimeMinutes} min)`,
      };
    }

    // Check steps
    if (stats.stepsExecuted > limits.maxStepsPerRun) {
      return {
        allowed: false,
        reason: `Steps executed (${stats.stepsExecuted}) exceeds limit (${limits.maxStepsPerRun})`,
      };
    }

    // Check files modified
    if (stats.filesModified.length > limits.maxFilesPerRun) {
      return {
        allowed: false,
        reason: `Files modified (${stats.filesModified.length}) exceeds limit (${limits.maxFilesPerRun})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Full limit check combining diff and runtime.
   */
  enforceLimits(diffStats: DiffStats, runtimeStats: RuntimeStats): ValidationResult {
    const diffCheck = this.enforceDiffLimits(diffStats);
    if (!diffCheck.allowed) return diffCheck;

    const runtimeCheck = this.enforceRuntimeLimits(runtimeStats);
    if (!runtimeCheck.allowed) return runtimeCheck;

    return { allowed: true };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the absolute path for a relative path within project.
   */
  getAbsolutePath(relativePath: string): string {
    return path.resolve(this.projectRoot, relativePath);
  }

  /**
   * Get relative path from absolute path.
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.projectRoot, absolutePath);
  }

  /**
   * Check if a path is within project root.
   */
  isWithinProject(inputPath: string): boolean {
    return this.normalizePath(inputPath) !== null;
  }

  /**
   * Get the limits from policy.
   */
  getLimits(): PolicyLimits {
    return this.policy.limits;
  }

  /**
   * Check if an operation requires confirmation.
   */
  requiresConfirmation(operation: string): boolean {
    return this.policy.requireConfirmation.includes(operation);
  }

  /**
   * Redact sensitive content from strings (for logging).
   */
  redactSecrets(content: string): string {
    // Patterns to redact
    const patterns = [
      /password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
      /api[_-]?key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
      /secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
      /token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
      /bearer\s+[a-zA-Z0-9._-]+/gi,
      /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g,
    ];

    let redacted = content;
    for (const pattern of patterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }

    return redacted;
  }
}
