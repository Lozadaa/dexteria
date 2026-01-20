/**
 * Dexteria Layout & View System
 * Persistence (localStorage)
 */

import type { LayoutState, SerializedLayout } from './types';
import { validateInvariants } from './normalize';
import { createWelcomeState } from './reducers';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'dexteria-layout-v1';
const CURRENT_VERSION = 1;

// ============================================================================
// Save Layout
// ============================================================================

/**
 * Save layout to localStorage
 */
export function saveLayout(state: LayoutState): void {
  try {
    const serialized: SerializedLayout = {
      version: 1,
      tree: state.tree,
      groups: state.groups,
      views: state.views,
      activeGroupId: state.activeGroupId,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

/**
 * Debounced save layout
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveLayout(state: LayoutState, delay = 500): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveLayout(state);
    saveTimeout = null;
  }, delay);
}

// ============================================================================
// Load Layout
// ============================================================================

/**
 * Load layout from localStorage
 */
export function loadLayout(): LayoutState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as SerializedLayout;

    // Version check
    if (parsed.version !== CURRENT_VERSION) {
      console.warn(
        `Layout version mismatch: expected ${CURRENT_VERSION}, got ${parsed.version}`
      );
      return null;
    }

    const state: LayoutState = {
      tree: parsed.tree,
      groups: parsed.groups,
      views: parsed.views,
      activeGroupId: parsed.activeGroupId,
    };

    // Validate before returning
    const validation = validateInvariants(state, { strictEmptyGroups: false });
    if (!validation.valid) {
      console.warn('Loaded layout failed validation:', validation.errors);
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load layout:', error);
    return null;
  }
}

/**
 * Load layout or create default
 */
export function loadLayoutOrDefault(): LayoutState {
  const loaded = loadLayout();
  if (loaded) return loaded;
  return createWelcomeState();
}

// ============================================================================
// Clear Layout
// ============================================================================

/**
 * Clear saved layout from localStorage
 */
export function clearLayout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear layout:', error);
  }
}
