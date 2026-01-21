/**
 * Types for IPC Handlers
 *
 * Shared type definitions used across all handler modules.
 */

import type { LocalKanbanStore } from '../../services/LocalKanbanStore';
import type { AgentRuntime } from '../../agent/AgentRuntime';
import type { Runner } from '../../agent/tools/Runner';
import type { AgentProvider } from '../../agent/AgentProvider';

/**
 * Provider type for configuration
 */
export type ProviderType = 'mock' | 'anthropic' | 'claude-code' | 'opencode' | 'codex';

/**
 * Recent project entry
 */
export interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

/**
 * Result from executing a tool call
 */
export interface ToolResult {
  name: string;
  success: boolean;
  result: unknown;
  error?: string;
}

/**
 * Shared state managed by the handler system
 */
export interface HandlerState {
  store: LocalKanbanStore | null;
  runtime: AgentRuntime | null;
  runner: Runner | null;
  agentProvider: AgentProvider | null;
  projectRoot: string | null;
}
