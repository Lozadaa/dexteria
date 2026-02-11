/**
 * Dexteria Layout & View System v6
 * ViewType Registry
 */

import type { ViewType, ViewTypeConfig, ViewInstance } from './types';
import { generateId } from './utils';

// ============================================================================
// ViewType Registry
// ============================================================================

/**
 * Registry of all view types and their configuration
 */
export const VIEW_TYPE_REGISTRY: Record<ViewType, ViewTypeConfig> = {
  // Singletons - only one instance allowed globally
  settings: { mode: 'singleton' },
  plugins: { mode: 'singleton' },
  taskRunner: { mode: 'singleton' },
  logs: { mode: 'singleton' },
  welcome: { mode: 'singleton' },
  runHistory: { mode: 'singleton' },
  policyEditor: { mode: 'singleton' },
  templates: { mode: 'singleton' },
  roadmap: { mode: 'singleton' },
  dashboard: { mode: 'singleton' },

  // Dedupe by key - reuse if same key exists
  board: {
    mode: 'dedupeByKey',
    getDedupeKey: (p) => (p.projectId ? `board:${p.projectId}` : null),
  },
  taskDetail: {
    mode: 'dedupeByKey',
    getDedupeKey: (p) => (p.taskId ? `taskDetail:${p.taskId}` : null),
  },
  themeEditor: {
    mode: 'dedupeByKey',
    getDedupeKey: (p) => (p.themeId ? `themeEditor:${p.themeId}` : null),
  },

  // Always new - create a new instance every time
  chat: { mode: 'alwaysNew' },
  jsonEditor: { mode: 'alwaysNew' },
  terminal: { mode: 'alwaysNew' },
};

// ============================================================================
// View Key Generation
// ============================================================================

/**
 * Generate a view key based on the view type and params
 */
export function generateViewKey(
  viewType: ViewType,
  params: Record<string, unknown>
): string {
  const config = VIEW_TYPE_REGISTRY[viewType];

  switch (config.mode) {
    case 'singleton':
      return viewType;

    case 'dedupeByKey': {
      const key = config.getDedupeKey?.(params);
      return key ?? `${viewType}:${generateId()}`;
    }

    case 'alwaysNew':
      return `${viewType}:${generateId()}`;
  }
}

// ============================================================================
// View Finding
// ============================================================================

/**
 * Find an existing view to reuse based on view type policy.
 *
 * POLICY FOR DUPLICATES (singleton):
 * If multiple instances of a singleton exist due to a bug,
 * returns the FIRST found (deterministic in V8 for string keys inserted in order).
 */
export function findExistingView(
  views: Record<string, ViewInstance>,
  viewType: ViewType,
  params: Record<string, unknown>
): ViewInstance | null {
  const config = VIEW_TYPE_REGISTRY[viewType];

  switch (config.mode) {
    case 'singleton':
      // First found (deterministic in insertion order)
      return Object.values(views).find((v) => v.viewType === viewType) ?? null;

    case 'dedupeByKey': {
      const key = config.getDedupeKey?.(params);
      if (!key) return null;
      return Object.values(views).find((v) => v.viewKey === key) ?? null;
    }

    case 'alwaysNew':
      return null;
  }
}
