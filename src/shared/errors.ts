/**
 * Structured Error Types
 *
 * Custom error classes for consistent error handling across the application.
 * Each error has a code, message, and optional context for debugging.
 */

// ============================================
// Base Error
// ============================================

/**
 * Base error class for all Dexteria errors.
 */
export class DexteriaError extends Error {
  /** Unique error code for programmatic handling */
  readonly code: string;
  /** Additional context for debugging */
  readonly context?: Record<string, unknown>;
  /** Timestamp when error occurred */
  readonly timestamp: string;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'DexteriaError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a plain object for logging/serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================
// Task Errors
// ============================================

/**
 * Error thrown when a task cannot be found.
 */
export class TaskNotFoundError extends DexteriaError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, 'TASK_NOT_FOUND', { taskId });
    this.name = 'TaskNotFoundError';
  }
}

/**
 * Error thrown when a task operation is invalid.
 */
export class TaskOperationError extends DexteriaError {
  constructor(message: string, taskId: string, operation: string) {
    super(message, 'TASK_OPERATION_ERROR', { taskId, operation });
    this.name = 'TaskOperationError';
  }
}

/**
 * Error thrown when task validation fails.
 */
export class TaskValidationError extends DexteriaError {
  constructor(message: string, taskId?: string, validationErrors?: string[]) {
    super(message, 'TASK_VALIDATION_ERROR', { taskId, validationErrors });
    this.name = 'TaskValidationError';
  }
}

// ============================================
// Policy Errors
// ============================================

/**
 * Error thrown when a security policy is violated.
 */
export class PolicyViolationError extends DexteriaError {
  constructor(reason: string, path?: string, operation?: string) {
    super(`Policy violation: ${reason}`, 'POLICY_VIOLATION', { reason, path, operation });
    this.name = 'PolicyViolationError';
  }
}

/**
 * Error thrown when path traversal is detected.
 */
export class PathTraversalError extends DexteriaError {
  constructor(path: string) {
    super(`Path traversal detected: ${path}`, 'PATH_TRAVERSAL', { path });
    this.name = 'PathTraversalError';
  }
}

/**
 * Error thrown when a blocked command is attempted.
 */
export class BlockedCommandError extends DexteriaError {
  constructor(command: string, reason: string) {
    super(`Blocked command: ${reason}`, 'BLOCKED_COMMAND', { command, reason });
    this.name = 'BlockedCommandError';
  }
}

// ============================================
// Agent Errors
// ============================================

/**
 * Error thrown during agent task execution.
 */
export class AgentExecutionError extends DexteriaError {
  constructor(message: string, taskId: string, runId?: string, step?: number) {
    super(message, 'AGENT_EXECUTION_ERROR', { taskId, runId, step });
    this.name = 'AgentExecutionError';
  }
}

/**
 * Error thrown when agent execution times out.
 */
export class AgentTimeoutError extends DexteriaError {
  constructor(taskId: string, runId: string, timeoutMs: number) {
    super(`Agent execution timed out after ${timeoutMs}ms`, 'AGENT_TIMEOUT', {
      taskId,
      runId,
      timeoutMs,
    });
    this.name = 'AgentTimeoutError';
  }
}

/**
 * Error thrown when agent encounters a tool error.
 */
export class ToolExecutionError extends DexteriaError {
  constructor(toolName: string, message: string, taskId?: string) {
    super(`Tool "${toolName}" failed: ${message}`, 'TOOL_EXECUTION_ERROR', {
      toolName,
      taskId,
    });
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error thrown when agent limits are exceeded.
 */
export class AgentLimitError extends DexteriaError {
  constructor(
    limitType: 'steps' | 'files' | 'runtime' | 'diffLines',
    current: number,
    limit: number,
    taskId?: string
  ) {
    super(
      `Agent ${limitType} limit exceeded: ${current}/${limit}`,
      'AGENT_LIMIT_ERROR',
      { limitType, current, limit, taskId }
    );
    this.name = 'AgentLimitError';
  }
}

// ============================================
// Store Errors
// ============================================

/**
 * Error thrown when store operations fail.
 */
export class StoreError extends DexteriaError {
  constructor(message: string, operation: string, filePath?: string) {
    super(message, 'STORE_ERROR', { operation, filePath });
    this.name = 'StoreError';
  }
}

/**
 * Error thrown when file validation fails.
 */
export class FileValidationError extends DexteriaError {
  constructor(filePath: string, validationError: string) {
    super(`Invalid file: ${validationError}`, 'FILE_VALIDATION_ERROR', {
      filePath,
      validationError,
    });
    this.name = 'FileValidationError';
  }
}

// ============================================
// Plugin Errors
// ============================================

/**
 * Error thrown when plugin operations fail.
 */
export class PluginError extends DexteriaError {
  constructor(message: string, pluginId: string, operation?: string) {
    super(message, 'PLUGIN_ERROR', { pluginId, operation });
    this.name = 'PluginError';
  }
}

/**
 * Error thrown when plugin manifest is invalid.
 */
export class PluginManifestError extends DexteriaError {
  constructor(pluginId: string, validationError: string) {
    super(`Invalid plugin manifest: ${validationError}`, 'PLUGIN_MANIFEST_ERROR', {
      pluginId,
      validationError,
    });
    this.name = 'PluginManifestError';
  }
}

// ============================================
// Configuration Errors
// ============================================

/**
 * Error thrown when configuration is invalid.
 */
export class ConfigurationError extends DexteriaError {
  constructor(message: string, configKey?: string) {
    super(message, 'CONFIGURATION_ERROR', { configKey });
    this.name = 'ConfigurationError';
  }
}

// ============================================
// Network Errors
// ============================================

/**
 * Error thrown when API requests fail.
 */
export class ApiError extends DexteriaError {
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    response?: unknown
  ) {
    super(message, 'API_ERROR', { statusCode, endpoint, response });
    this.name = 'ApiError';
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Type guard to check if an error is a DexteriaError.
 */
export function isDexteriaError(error: unknown): error is DexteriaError {
  return error instanceof DexteriaError;
}

/**
 * Wrap an unknown error in a DexteriaError.
 */
export function wrapError(error: unknown, code = 'UNKNOWN_ERROR'): DexteriaError {
  if (isDexteriaError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new DexteriaError(error.message, code, {
      originalName: error.name,
      originalStack: error.stack,
    });
  }

  return new DexteriaError(String(error), code);
}

/**
 * Extract a user-friendly message from an error.
 */
export function getErrorMessage(error: unknown): string {
  if (isDexteriaError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Extract error code for programmatic handling.
 */
export function getErrorCode(error: unknown): string {
  if (isDexteriaError(error)) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}
