/**
 * Structured Logger Service
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured context (JSON-serializable metadata)
 * - Environment-aware output (dev vs production)
 * - Timestamp and source tracking
 */

// ============================================
// Types
// ============================================

/**
 * Available log levels in order of severity.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry.
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Structured context data */
  context?: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Source module or component */
  source?: string;
}

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel?: LogLevel;
  /** Whether to enable console output */
  enableConsole?: boolean;
  /** Whether to include timestamps in console output */
  includeTimestamp?: boolean;
  /** Custom log handler for external logging services */
  customHandler?: (entry: LogEntry) => void;
}

// ============================================
// Log Level Utilities
// ============================================

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(currentLevel: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[currentLevel] >= LOG_LEVEL_ORDER[minLevel];
}

// ============================================
// Logger Class
// ============================================

/**
 * Structured logger with configurable output and context.
 */
class Logger {
  private config: Required<LoggerConfig>;
  private defaultContext: Record<string, unknown> = {};

  constructor(config: LoggerConfig = {}) {
    // Determine if we're in development mode
    const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

    this.config = {
      minLevel: config.minLevel ?? (isDev ? 'debug' : 'info'),
      enableConsole: config.enableConsole ?? true,
      includeTimestamp: config.includeTimestamp ?? true,
      customHandler: config.customHandler ?? (() => {}),
    };
  }

  /**
   * Set default context that will be included in all log entries.
   */
  setDefaultContext(context: Record<string, unknown>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Clear default context.
   */
  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  /**
   * Create a child logger with additional default context.
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }

  /**
   * Core logging method.
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string
  ): void {
    if (!shouldLog(level, this.config.minLevel)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.defaultContext, ...context },
      timestamp: new Date().toISOString(),
      source,
    };

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Custom handler
    this.config.customHandler(entry);
  }

  /**
   * Write log entry to console with formatting.
   */
  private writeToConsole(entry: LogEntry): void {
    const { level, message, context, timestamp, source } = entry;

    // Build prefix
    const parts: string[] = [];
    if (this.config.includeTimestamp) {
      parts.push(`[${timestamp}]`);
    }
    parts.push(`[${level.toUpperCase()}]`);
    if (source) {
      parts.push(`[${source}]`);
    }

    const prefix = parts.join(' ');
    const hasContext = context && Object.keys(context).length > 0;

    // Map log level to console method
    const consoleMethod = level === 'debug' ? 'log' : level;

    if (hasContext) {
      console[consoleMethod](prefix, message, context);
    } else {
      console[consoleMethod](prefix, message);
    }
  }

  // ============================================
  // Public Log Methods
  // ============================================

  /**
   * Log a debug message (verbose, development only).
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message (general operational info).
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message (potential issues).
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message (errors and failures).
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  // ============================================
  // Specialized Log Methods
  // ============================================

  /**
   * Log with explicit source (for module-specific logging).
   */
  withSource(source: string) {
    return {
      debug: (message: string, context?: Record<string, unknown>) =>
        this.log('debug', message, context, source),
      info: (message: string, context?: Record<string, unknown>) =>
        this.log('info', message, context, source),
      warn: (message: string, context?: Record<string, unknown>) =>
        this.log('warn', message, context, source),
      error: (message: string, context?: Record<string, unknown>) =>
        this.log('error', message, context, source),
    };
  }

  /**
   * Log an error object with stack trace.
   */
  logError(error: unknown, message?: string, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = { ...context };

    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;

      // Include DexteriaError fields if present
      if ('code' in error) {
        errorContext.errorCode = (error as { code: string }).code;
      }
      if ('context' in error) {
        errorContext.originalContext = (error as { context: unknown }).context;
      }
    } else {
      errorContext.errorValue = String(error);
    }

    this.error(message ?? 'An error occurred', errorContext);
  }

  /**
   * Log task-related operations.
   */
  task(taskId: string, action: string, context?: Record<string, unknown>): void {
    this.info(`Task ${action}`, { taskId, action, ...context });
  }

  /**
   * Log agent-related operations.
   */
  agent(
    taskId: string,
    runId: string | undefined,
    action: string,
    context?: Record<string, unknown>
  ): void {
    this.info(`Agent ${action}`, { taskId, runId, action, ...context });
  }

  /**
   * Log IPC calls.
   */
  ipc(channel: string, direction: 'invoke' | 'send' | 'handle', context?: Record<string, unknown>): void {
    this.debug(`IPC ${direction}: ${channel}`, { channel, direction, ...context });
  }

  /**
   * Log tool executions.
   */
  tool(toolName: string, action: 'start' | 'success' | 'error', context?: Record<string, unknown>): void {
    const level = action === 'error' ? 'error' : action === 'start' ? 'debug' : 'info';
    this.log(level, `Tool ${toolName}: ${action}`, { toolName, action, ...context });
  }
}

// ============================================
// Singleton Export
// ============================================

/**
 * Default logger instance.
 * Use this for most logging needs across the application.
 */
export const logger = new Logger();

/**
 * Create a new logger instance with custom configuration.
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

// ============================================
// Module-specific Loggers
// ============================================

/**
 * Logger for store operations.
 */
export const storeLogger = logger.withSource('Store');

/**
 * Logger for agent operations.
 */
export const agentLogger = logger.withSource('Agent');

/**
 * Logger for IPC handlers.
 */
export const ipcLogger = logger.withSource('IPC');

/**
 * Logger for plugin operations.
 */
export const pluginLogger = logger.withSource('Plugin');
