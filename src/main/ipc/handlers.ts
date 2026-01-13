/**
 * IPC Handlers
 *
 * Main entry point for IPC handler initialization.
 * This file re-exports from the modular handlers for backwards compatibility.
 *
 * The handlers are now organized by domain in src/main/ipc/handlers/:
 * - boardHandlers.ts    - Kanban board operations
 * - taskHandlers.ts     - Task CRUD and analysis
 * - stateHandlers.ts    - Agent state and policy
 * - agentHandlers.ts    - Agent runtime and Ralph mode
 * - runLogHandlers.ts   - Run log operations
 * - contextHandlers.ts  - Project context and repo index
 * - chatHandlers.ts     - Chat operations and tool execution
 * - settingsHandlers.ts - Provider and settings management
 * - projectHandlers.ts  - Project open/close/recent
 * - shared.ts           - Shared state and utilities
 * - types.ts            - Type definitions
 * - index.ts            - Aggregates all handlers
 */

// Re-export everything from the modular handlers
export { initializeIpcHandlers, getProjectRoot } from './handlers/index';
export type { ProviderType, RecentProject, ToolResult, HandlerState } from './handlers/types';
