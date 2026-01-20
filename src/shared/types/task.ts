/**
 * Task Domain Types
 *
 * Types related to tasks, their lifecycle, configuration, and metadata.
 */

// ============================================
// Task Status Types
// ============================================

/**
 * Valid task statuses representing the Kanban workflow stages.
 */
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';

/**
 * Task runtime execution status.
 */
export type TaskRuntimeStatus = 'idle' | 'running' | 'blocked' | 'done' | 'failed';

/**
 * Task priority levels for ordering and urgency.
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// Task Comment Types
// ============================================

/**
 * Comment attached to a task for communication and tracking.
 */
export interface TaskComment {
  /** Unique identifier for the comment */
  id: string;
  /** ID of the task this comment belongs to */
  taskId: string;
  /** Type of comment determining its purpose */
  type: 'note' | 'instruction' | 'failure' | 'agent' | 'system';
  /** Name or identifier of the comment author */
  author: string;
  /** Content of the comment */
  content: string;
  /** ISO timestamp when the comment was created */
  createdAt: string;
  /** Associated agent run ID if applicable */
  runId?: string;
}

// ============================================
// Task Runtime Types
// ============================================

/**
 * Runtime state of a task during agent execution.
 */
export interface TaskRuntimeState {
  /** Current runtime status */
  status: TaskRuntimeStatus;
  /** ID of the currently active run */
  currentRunId?: string;
  /** ID of the most recent completed run */
  lastRunId?: string;
  /** ISO timestamp of the last run */
  lastRunAt?: string;
  /** Total number of agent runs for this task */
  runCount: number;
  /** Number of failed attempts */
  failureCount?: number;
  /** Total execution time in milliseconds */
  totalDurationMs: number;
}

// ============================================
// Task Configuration Types
// ============================================

/**
 * Agent configuration for task execution.
 */
export interface TaskAgentConfig {
  /** High-level goal for the agent to achieve */
  goal: string;
  /** File paths or patterns the agent can work with */
  scope: string[];
  /** Criteria that must be met for task completion */
  definitionOfDone: string[];
  /** Task IDs that must be completed first */
  dependencies?: string[];
}

/**
 * Epic metadata for Jira alignment.
 */
export interface TaskEpic {
  /** Name of the epic */
  name: string;
  /** Hex color for visual identification (e.g., "#3b82f6") */
  color: string;
}

// ============================================
// AI Review Types
// ============================================

/**
 * Result of an AI review when a task is in the Review column.
 */
export interface AIReviewResult {
  /** Whether the task passed review */
  passed: boolean;
  /** Detailed feedback from the review */
  feedback: string;
  /** ISO timestamp when review was completed */
  reviewedAt: string;
  /** Who performed the review */
  reviewedBy: 'ai' | 'human';
  /** Detailed checklist results */
  checklist?: Array<{
    criterion: string;
    passed: boolean;
    note?: string;
  }>;
}

// ============================================
// Main Task Type
// ============================================

/**
 * Complete task definition with all metadata.
 */
export interface Task {
  /** Unique identifier (e.g., TSK-001) */
  id: string;
  /** Task title/summary */
  title: string;
  /** Detailed task description */
  description: string;
  /** Current Kanban status */
  status: TaskStatus;
  /** Task priority level */
  priority: TaskPriority;
  /** Position within the column */
  order: number;
  /** List of acceptance criteria */
  acceptanceCriteria: string[];
  /** Optional tags for categorization */
  tags?: string[];
  /** IDs of tasks this depends on */
  dependsOn?: string[];
  /** Epic metadata for Jira alignment */
  epic?: TaskEpic;
  /** Sprint identifier */
  sprint?: string;
  /** Comments and activity on the task */
  comments: TaskComment[];
  /** Agent execution configuration */
  agent: TaskAgentConfig;
  /** Runtime execution state */
  runtime: TaskRuntimeState;
  /** ISO timestamp when task was created */
  createdAt: string;
  /** ISO timestamp when task was last updated */
  updatedAt: string;
  /** ISO timestamp when task was completed */
  completedAt?: string;
  /** Whether only humans can complete this task */
  humanOnly?: boolean;
  /** Whether AI should auto-review when moved to Review */
  aiReviewable?: boolean;
  /** Criteria for AI review */
  reviewCriteria?: string;
  /** Result of AI review (null to clear) */
  aiReview?: AIReviewResult | null;
  /** Whether AI is currently processing this task */
  aiProcessing?: boolean;
}

/**
 * File format for storing tasks.
 */
export interface TasksFile {
  tasks: Task[];
}

// ============================================
// Task Patch Types
// ============================================

/**
 * Partial task update for patching operations.
 */
export interface TaskPatch {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  order?: number;
  acceptanceCriteria?: string[];
  tags?: string[];
  dependsOn?: string[];
  epic?: TaskEpic | null;
  sprint?: string | null;
  agent?: Partial<TaskAgentConfig>;
  /** Partial runtime state update (e.g., for setting runtime status to 'blocked') */
  runtime?: Partial<TaskRuntimeState>;
  humanOnly?: boolean;
  aiReviewable?: boolean;
  reviewCriteria?: string;
  aiReview?: AIReviewResult | null;
  aiProcessing?: boolean;
}

// ============================================
// Task Creation Types
// ============================================

/**
 * Input for creating a new task via hooks.
 */
export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: string;
  priority?: TaskPriority;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  tags?: string[];
}
