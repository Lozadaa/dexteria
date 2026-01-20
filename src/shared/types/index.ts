/**
 * Shared Type Definitions
 *
 * Central export point for all type definitions.
 * Import from here for convenience or from individual modules for smaller bundles.
 */

// Task types
export type {
  TaskStatus,
  TaskRuntimeStatus,
  TaskPriority,
  TaskComment,
  TaskRuntimeState,
  TaskAgentConfig,
  TaskEpic,
  AIReviewResult,
  Task,
  TasksFile,
  TaskPatch,
  TaskCreateInput,
} from './task';

// Board types
export type { Column, Board } from './board';

// Chat types
export type {
  ChatMessage,
  Chat,
  ChatIndexEntry,
  ChatIndex,
} from './chat';

// Agent types
export type {
  AgentMode,
  RalphModeState,
  AgentState,
  RunTaskOptions,
  RalphModeOptions,
  AgentRunToolCall,
  AgentRunPatch,
  AgentRunCommand,
  AcceptanceCriterionResult,
  AgentRun,
  CommandRunMetadata,
  AgentMessage,
  AgentToolDefinition,
  AgentToolCall,
  AgentResponse,
  AgentBeforeRunContext,
  AgentBeforeRunResult,
  AgentAfterRunContext,
  AgentToolCallContext,
  AgentToolCallResult,
  AgentStepContext,
} from './agent';

// Theme types
export type {
  HSLValue,
  ThemeColorTokens,
  ThemeCodeTokens,
  ThemeDiffTokens,
  ThemeTerminalTokens,
  ThemeColors,
  ThemeFonts,
  CustomTheme,
  ThemeIndexEntry,
  ThemeIndex,
  ThemePreset,
} from './theme';

// Plugin types
export type {
  PluginPermissionLevel,
  PluginAgentPermission,
  PluginTerminalPermission,
  PluginNetworkPermission,
  PluginUIPermissions,
  PluginPermissions,
  PluginCommandContribution,
  PluginTabContribution,
  PluginContextMenuItemDef,
  PluginContextMenuContribution,
  PluginHookContribution,
  PluginSettingContribution,
  PluginContributions,
  PluginManifest,
  PluginState,
  PluginInfo,
  PluginIndex,
  ChatBeforeSendContext,
  ChatBeforeSendResult,
  ChatAfterResponseContext,
  ChatAfterResponseResult,
  TaskBeforeCreateContext,
  TaskBeforeCreateResult,
  TaskAfterCreateContext,
  TaskBeforeUpdateContext,
  TaskBeforeUpdateResult,
  TaskAfterUpdateContext,
  TaskBeforeMoveContext,
  TaskBeforeMoveResult,
  TaskAfterMoveContext,
  TaskBeforeDeleteContext,
  TaskBeforeDeleteResult,
  BoardRefreshContext,
  PluginTab,
  PluginContextMenuItem,
  ExtensionSlotId,
  PluginSettingsTabContribution,
  PluginDockingPanelContribution,
  PluginSlotContribution,
  PluginRendererConfig,
  PluginContributionsExtended,
  PluginManifestExtended,
  PluginUIContribution,
  UIContributions,
} from './plugin';

// Project types
export type {
  PolicyLimits,
  ShellCommandPolicy,
  Policy,
  ProjectContext,
  RepoIndex,
  ProjectCommand,
  NotificationSound,
  NotificationSettings,
  ProjectCommandsSettings,
  RunnerSettings,
  ProjectSettings,
  DetectedCommands,
  ProjectProcessType,
  ProjectProcessStatus,
  ProjectRunResult,
} from './project';

// Common types
export type {
  ActivityType,
  ActivityEntry,
  IPCChannel,
} from './common';

export { IPC_CHANNELS } from './common';
