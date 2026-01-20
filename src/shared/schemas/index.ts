/**
 * Shared Schemas
 *
 * Central export point for all Zod schemas and factory functions.
 */

// Task schemas
export {
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskRuntimeStatusSchema,
  CommentTypeSchema,
  TaskAgentSchema,
  TaskCommentSchema,
  TaskRuntimeSchema,
  TaskSchema,
  TasksFileSchema,
} from './task';

// Board schemas
export { ColumnSchema, BoardSchema } from './board';

// Chat schemas
export {
  MessageRoleSchema,
  ChatMessageSchema,
  ChatSchema,
  ChatIndexEntrySchema,
  ChatIndexSchema,
} from './chat';

// Agent schemas
export {
  AgentModeSchema,
  AgentModeTypeSchema,
  AgentRunStatusSchema,
  RalphModeStateSchema,
  AgentStateSchema,
  AgentRunToolCallSchema,
  AgentRunPatchSchema,
  AgentRunCommandSchema,
  AcceptanceCriterionResultSchema,
  AgentRunSchema,
} from './agent';

// Project schemas
export {
  ProjectContextSchema,
  RepoIndexSchema,
  PolicyLimitsSchema,
  ShellCommandPolicySchema,
  PolicySchema,
  ProjectCommandSchema,
  NotificationSoundSchema,
  NotificationSettingsSchema,
  ProjectCommandsSettingsSchema,
  RunnerSettingsSchema,
  ProjectSettingsSchema,
} from './project';

// Common schemas and utilities
export {
  ActivityTypeSchema,
  ActivityEntrySchema,
  DEFAULT_COLUMNS,
  LOCAL_KANBAN_PATHS,
  isValidTaskStatus,
  isValidTask,
  isTerminalStatus,
  hasUnmetDependencies,
} from './common';

// Factory functions
export {
  createTaskId,
  createChatId,
  createCommentId,
  createRunId,
  createDefaultRuntime,
  createTask,
  createComment,
  createBoard,
  createChat,
  createChatIndex,
  createDefaultState,
  createAgentRun,
  createDefaultPolicy,
  createDefaultSettings,
  createProjectContext,
  createRepoIndex,
  createActivityEntry,
  migrateTaskToV3,
} from './factories';
