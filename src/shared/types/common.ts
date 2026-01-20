/**
 * Common Types
 *
 * Shared types used across multiple domains.
 */

// ============================================
// Activity Log Types
// ============================================

/**
 * Types of activities that can be logged.
 */
export type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'comment_added'
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'ralph_started'
  | 'ralph_stopped'
  | 'command_executed'
  | 'file_modified';

/**
 * Single activity log entry.
 */
export interface ActivityEntry {
  /** ISO timestamp of the activity */
  timestamp: string;
  /** Type of activity */
  type: ActivityType;
  /** Related task ID */
  taskId?: string;
  /** Related chat ID */
  chatId?: string;
  /** Related agent run ID */
  runId?: string;
  /** Additional activity data */
  data: Record<string, unknown>;
}

// ============================================
// IPC Channels
// ============================================

/**
 * IPC channel constants for main-renderer communication.
 */
export const IPC_CHANNELS = {
  GET_BOARD: 'kanban:getBoard',
  GET_TASKS: 'kanban:getTasks',
  MOVE_TASK: 'kanban:moveTask',
  GET_CHATS: 'chat:getChats',
  SEND_MESSAGE: 'chat:sendMessage',
  GET_STATE: 'agent:getState',
} as const;

/**
 * Type for IPC channel names.
 */
export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
