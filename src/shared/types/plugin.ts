/**
 * Plugin Domain Types
 *
 * Types related to the plugin system, permissions, and contributions.
 */

import type { Task, TaskPatch, TaskCreateInput } from './task';
import type { Board } from './board';

// ============================================
// Permission Types
// ============================================

/**
 * General permission level for resources.
 */
export type PluginPermissionLevel = 'none' | 'read' | 'write' | 'full';

/**
 * Agent-specific permission level.
 */
export type PluginAgentPermission = 'none' | 'read' | 'execute';

/**
 * Terminal-specific permission level.
 */
export type PluginTerminalPermission = 'none' | 'read' | 'execute';

/**
 * Network access permission level.
 */
export type PluginNetworkPermission = 'none' | 'local' | 'restricted' | 'full';

/**
 * UI-specific permissions.
 */
export interface PluginUIPermissions {
  tabs?: boolean;
  sidebars?: boolean;
  modals?: boolean;
  contextMenus?: boolean;
  notifications?: boolean;
}

/**
 * Complete plugin permissions definition.
 */
export interface PluginPermissions {
  tasks?: PluginPermissionLevel;
  chat?: PluginPermissionLevel;
  agent?: PluginAgentPermission;
  files?: PluginPermissionLevel;
  terminal?: PluginTerminalPermission;
  settings?: PluginPermissionLevel;
  ui?: PluginUIPermissions;
  network?: PluginNetworkPermission;
}

// ============================================
// Contribution Types
// ============================================

/**
 * Command contribution from a plugin.
 */
export interface PluginCommandContribution {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
}

/**
 * Tab contribution from a plugin.
 */
export interface PluginTabContribution {
  id: string;
  title: string;
  icon: string;
  component: string;
  position?: 'before' | 'after';
}

/**
 * Context menu item definition.
 */
export interface PluginContextMenuItemDef {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: string;
  when?: string;
}

/**
 * Context menu contribution from a plugin.
 */
export interface PluginContextMenuContribution {
  location: 'task-card' | 'chat-message' | 'board-column' | 'file';
  items: PluginContextMenuItemDef[];
}

/**
 * Hook contribution from a plugin.
 */
export interface PluginHookContribution {
  hook: string;
  handler: string;
  priority?: number;
}

/**
 * Setting contribution from a plugin.
 */
export interface PluginSettingContribution {
  id: string;
  title: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default: unknown;
  description?: string;
  options?: { label: string; value: unknown }[];
}

/**
 * Plugin contributions (extensions to the app).
 */
export interface PluginContributions {
  commands?: PluginCommandContribution[];
  tabs?: PluginTabContribution[];
  contextMenus?: PluginContextMenuContribution[];
  hooks?: PluginHookContribution[];
  settings?: PluginSettingContribution[];
}

// ============================================
// Manifest Types
// ============================================

/**
 * Plugin manifest - describes a plugin's capabilities.
 */
export interface PluginManifest {
  /** Unique plugin identifier (reverse domain) */
  id: string;
  /** Display name */
  name: string;
  /** Semantic version */
  version: string;
  /** Plugin author */
  author?: string;
  /** Plugin description */
  description?: string;
  /** Main process entry point */
  main?: string;
  /** Renderer process entry point */
  renderer?: string;
  /** Required permissions */
  permissions: PluginPermissions;
  /** Feature contributions */
  contributes?: PluginContributions;
}

// ============================================
// Runtime Types
// ============================================

/**
 * Plugin runtime state.
 */
export type PluginState = 'installed' | 'disabled' | 'enabled' | 'active' | 'error';

/**
 * Runtime information about a loaded plugin.
 */
export interface PluginInfo {
  manifest: PluginManifest;
  state: PluginState;
  path: string;
  error?: string;
  loadedAt?: string;
  activatedAt?: string;
}

/**
 * Plugin index stored in .local-kanban/plugins/index.json.
 */
export interface PluginIndex {
  version: number;
  enabled: string[];
  disabled: string[];
  settings: Record<string, Record<string, unknown>>;
}

// ============================================
// Chat Hook Types
// ============================================

/**
 * Context for chat:beforeSend hook.
 */
export interface ChatBeforeSendContext {
  message: string;
  chatId: string;
  mode: 'agent' | 'planner';
}

/**
 * Result for chat:beforeSend hook.
 */
export interface ChatBeforeSendResult {
  message: string;
  cancel?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Context for chat:afterResponse hook.
 */
export interface ChatAfterResponseContext {
  response: string;
  chatId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result for chat:afterResponse hook.
 */
export interface ChatAfterResponseResult {
  response: string;
}

// ============================================
// Task Hook Types
// ============================================

/**
 * Context for task:beforeCreate hook.
 */
export interface TaskBeforeCreateContext {
  input: TaskCreateInput;
}

/**
 * Result for task:beforeCreate hook.
 */
export interface TaskBeforeCreateResult {
  input: TaskCreateInput;
  cancel?: boolean;
}

/**
 * Context for task:afterCreate hook.
 */
export interface TaskAfterCreateContext {
  task: Task;
}

/**
 * Context for task:beforeUpdate hook.
 */
export interface TaskBeforeUpdateContext {
  taskId: string;
  patch: TaskPatch;
  task: Task;
}

/**
 * Result for task:beforeUpdate hook.
 */
export interface TaskBeforeUpdateResult {
  patch: TaskPatch;
  cancel?: boolean;
}

/**
 * Context for task:afterUpdate hook.
 */
export interface TaskAfterUpdateContext {
  task: Task;
  previousTask: Task;
}

/**
 * Context for task:beforeMove hook.
 */
export interface TaskBeforeMoveContext {
  taskId: string;
  task: Task;
  fromColumn: string;
  toColumn: string;
}

/**
 * Result for task:beforeMove hook.
 */
export interface TaskBeforeMoveResult {
  toColumn: string;
  cancel?: boolean;
}

/**
 * Context for task:afterMove hook.
 */
export interface TaskAfterMoveContext {
  task: Task;
  fromColumn: string;
}

/**
 * Context for task:beforeDelete hook.
 */
export interface TaskBeforeDeleteContext {
  taskId: string;
  task: Task;
}

/**
 * Result for task:beforeDelete hook.
 */
export interface TaskBeforeDeleteResult {
  cancel?: boolean;
}

/**
 * Context for board:refresh hook.
 */
export interface BoardRefreshContext {
  board: Board;
  tasks: Task[];
}

// ============================================
// UI Extension Types
// ============================================

/**
 * Plugin-registered custom tab.
 */
export interface PluginTab {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  order?: number;
  component: string;
  componentType: 'html' | 'url' | 'iframe';
}

/**
 * Plugin-registered context menu item.
 */
export interface PluginContextMenuItem {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  location: 'task' | 'board' | 'column';
  order?: number;
}

// ============================================
// Extension Slot Types
// ============================================

/**
 * Available extension slot IDs in the application.
 */
export type ExtensionSlotId =
  | 'settings:tab'
  | 'docking:panel'
  | 'topbar:left'
  | 'topbar:right'
  | 'task-detail:sidebar'
  | 'task-detail:footer'
  | 'task-card:badge'
  | 'bottom-panel:tab';

/**
 * Settings tab contribution from a plugin.
 */
export interface PluginSettingsTabContribution {
  id: string;
  title: string;
  icon: string;
  order?: number;
}

/**
 * Docking panel contribution from a plugin.
 */
export interface PluginDockingPanelContribution {
  id: string;
  title: string;
  icon: string;
  singleton?: boolean;
  defaultPosition?: 'left' | 'right' | 'bottom';
  order?: number;
}

/**
 * Slot contribution from a plugin.
 */
export interface PluginSlotContribution {
  slotId: ExtensionSlotId;
  order?: number;
  when?: string;
}

/**
 * Renderer entry configuration for plugins.
 */
export interface PluginRendererConfig {
  entry: string;
  styles?: string;
}

/**
 * Extended plugin contributions including UI extensions.
 */
export interface PluginContributionsExtended extends PluginContributions {
  settingsTab?: PluginSettingsTabContribution;
  dockingPanels?: PluginDockingPanelContribution[];
  slots?: PluginSlotContribution[];
}

/**
 * Extended plugin manifest with full UI contribution support.
 */
export interface PluginManifestExtended extends Omit<PluginManifest, 'contributes' | 'renderer'> {
  contributes?: PluginContributionsExtended;
  renderer?: PluginRendererConfig | string;
}

/**
 * UI contribution from a plugin (returned to renderer).
 */
export interface PluginUIContribution {
  pluginId: string;
  pluginPath: string;
  settingsTab?: PluginSettingsTabContribution;
  dockingPanels?: PluginDockingPanelContribution[];
  slots?: PluginSlotContribution[];
  renderer?: PluginRendererConfig;
}

/**
 * All UI contributions from all active plugins.
 */
export interface UIContributions {
  settingsTabs: Array<PluginSettingsTabContribution & { pluginId: string; pluginPath: string }>;
  dockingPanels: Array<PluginDockingPanelContribution & { pluginId: string; pluginPath: string }>;
  slots: Record<ExtensionSlotId, Array<PluginSlotContribution & { pluginId: string; pluginPath: string }>>;
}
