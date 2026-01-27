/**
 * Agent Domain Types
 *
 * Types related to the AI agent system, execution, and runtime.
 */

import type { Task } from './task';

// ============================================
// Agent Mode Types
// ============================================

/**
 * Agent operational mode.
 * - 'agent': Full capabilities including code writing
 * - 'planner': Read-only, task management only
 */
export type AgentMode = 'agent' | 'planner';

// ============================================
// Ralph Mode Types
// ============================================

/**
 * Ralph autonomous execution mode state.
 */
export interface RalphModeState {
  /** Whether Ralph mode is active */
  enabled: boolean;
  /** Task selection strategy */
  strategy: 'fifo' | 'priority' | 'dependency';
  /** ISO timestamp when Ralph started */
  startedAt?: string;
  /** Number of tasks processed this session */
  processedCount: number;
  /** Number of failed tasks this session */
  failedCount: number;
  /** Currently executing task ID */
  currentTaskId?: string;
}

// ============================================
// Agent State Types
// ============================================

/**
 * Global agent state persisted to disk.
 */
export interface AgentState {
  /** Execution mode: manual or autonomous */
  mode: 'manual' | 'ralph';
  /** Agent capability mode */
  agentMode: AgentMode;
  /** Whether agent is currently executing */
  isRunning: boolean;
  /** Currently active task ID */
  activeTaskId: string | null;
  /** Currently active chat ID */
  activeChatId?: string | null;
  /** ISO timestamp of last state update */
  lastUpdated: string;
  /** Ralph autonomous mode state */
  ralphMode: RalphModeState;
  /** Counter for sequential task IDs (TSK-001, TSK-002, etc.) */
  lastTaskNumber: number;
}

// ============================================
// Run Options Types
// ============================================

/**
 * Options for running a single task.
 */
export interface RunTaskOptions {
  /** Execution mode */
  mode: 'manual' | 'dexter';
  /** Maximum number of agent steps */
  maxSteps?: number;
}

/**
 * Options for starting Ralph autonomous mode.
 */
export interface RalphModeOptions {
  /** Task selection strategy */
  strategy?: 'fifo' | 'priority' | 'dependency';
  /** Stop when a task is blocked */
  stopOnBlocking?: boolean;
  /** Maximum tasks to process */
  maxTasks?: number;
  /** Maximum retry attempts per task (default: 2) */
  maxAttempts?: number;
}

// ============================================
// Agent Run Artifact Types
// ============================================

/**
 * Record of a tool call during agent execution.
 */
export interface AgentRunToolCall {
  /** ISO timestamp of the call */
  timestamp: string;
  /** Tool name */
  name: string;
  /** Tool input parameters */
  input: Record<string, unknown>;
  /** Summary of the output */
  outputSummary: string;
  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Record of a file patch during agent execution.
 */
export interface AgentRunPatch {
  /** ISO timestamp of the patch */
  timestamp: string;
  /** File path that was modified */
  path: string;
  /** Summary of the diff */
  diffSummary?: string;
  /** Number of lines added */
  linesAdded: number;
  /** Number of lines removed */
  linesRemoved: number;
}

/**
 * Record of a command execution during agent run.
 */
export interface AgentRunCommand {
  /** ISO timestamp of execution */
  timestamp: string;
  /** Command that was run */
  command: string;
  /** Exit code (null if interrupted) */
  exitCode: number | null;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Path to full output log */
  outputPath?: string;
}

/**
 * Result of checking a single acceptance criterion.
 */
export interface AcceptanceCriterionResult {
  /** The criterion being checked */
  criterion: string;
  /** Whether it passed */
  passed: boolean;
  /** Evidence or explanation */
  evidence: string;
}

/**
 * Complete record of an agent execution run.
 */
export interface AgentRun {
  /** Unique run identifier */
  id: string;
  /** Task being executed */
  taskId: string;
  /** Execution mode */
  mode: 'manual' | 'dexter';
  /** ISO timestamp when run started */
  startedAt: string;
  /** ISO timestamp when run completed */
  completedAt?: string;
  /** Run outcome status */
  status: 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled';
  /** Number of agent steps taken */
  steps: number;
  /** All tool calls made */
  toolCalls: AgentRunToolCall[];
  /** All file patches applied */
  patches: AgentRunPatch[];
  /** All commands executed */
  commands: AgentRunCommand[];
  /** List of modified file paths */
  filesModified: string[];
  /** Acceptance criteria verification results */
  acceptanceResults?: AcceptanceCriterionResult[];
  /** Summary of what was accomplished */
  summary?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Metadata for a command execution log.
 */
export interface CommandRunMetadata {
  runId: string;
  taskId: string;
  command: string;
  cwd: string;
  startedAt: string;
  completedAt: string;
  exitCode?: number;
  timedOut: boolean;
  logPath: string;
}

// ============================================
// Agent Provider Types
// ============================================

/**
 * Message in the agent conversation.
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Tool definition for the agent.
 */
export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: unknown;
}

/**
 * Tool call requested by the agent.
 */
export interface AgentToolCall {
  /** Optional unique identifier */
  id?: string;
  /** Name of the tool to call */
  name: string;
  /** Arguments for the tool */
  arguments: Record<string, unknown>;
}

/**
 * Response from the agent provider.
 */
export interface AgentResponse {
  /** Text content of the response (cleaned for display) */
  content: string;
  /** Raw unprocessed content including JSON blocks and tool calls */
  rawContent?: string;
  /** Tool calls requested */
  toolCalls?: AgentToolCall[];
  /** Reason the response ended */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

// ============================================
// Agent Hook Types
// ============================================

/**
 * Context for agent:beforeRun hook.
 */
export interface AgentBeforeRunContext {
  taskId: string;
  task: Task;
  runId: string;
  mode: 'agent' | 'planner';
}

/**
 * Result for agent:beforeRun hook.
 */
export interface AgentBeforeRunResult {
  cancel?: boolean;
  modifiedTask?: Partial<Task>;
}

/**
 * Context for agent:afterRun hook.
 */
export interface AgentAfterRunContext {
  taskId: string;
  task: Task;
  runId: string;
  success: boolean;
  error?: string;
  filesModified?: string[];
  summary?: string;
}

/**
 * Context for agent:onToolCall hook.
 */
export interface AgentToolCallContext {
  taskId: string;
  runId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  stepNumber: number;
}

/**
 * Result for agent:onToolCall hook.
 */
export interface AgentToolCallResult {
  cancel?: boolean;
  modifiedInput?: Record<string, unknown>;
}

/**
 * Context for agent:onStep hook.
 */
export interface AgentStepContext {
  taskId: string;
  runId: string;
  stepNumber: number;
  content: string;
  isComplete: boolean;
}
