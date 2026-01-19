/**
 * Persistence Utilities
 * Save and restore layout from localStorage
 */

import type { DockingState, SerializedLayout } from './types';

const STORAGE_KEY = 'dexteria_layout_v1';
const CURRENT_VERSION = 1;

/**
 * Save layout to localStorage
 */
export function saveLayout(state: DockingState): void {
  try {
    const serialized: SerializedLayout = {
      version: CURRENT_VERSION,
      root: state.root,
      tabs: state.tabs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save layout:', err);
  }
}

/**
 * Load layout from localStorage
 * Returns null if no valid layout is saved
 */
export function loadLayout(): DockingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SerializedLayout;

    // Version check
    if (parsed.version !== CURRENT_VERSION) {
      console.log('Layout version mismatch, using default');
      return null;
    }

    // Basic validation
    if (!isValidLayout(parsed)) {
      console.log('Invalid layout structure, using default');
      return null;
    }

    return {
      root: parsed.root,
      tabs: parsed.tabs,
    };
  } catch (err) {
    console.error('Failed to load layout:', err);
    return null;
  }
}

/**
 * Clear saved layout
 */
export function clearLayout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear layout:', err);
  }
}

/**
 * Validate layout structure
 */
function isValidLayout(layout: unknown): layout is SerializedLayout {
  if (!layout || typeof layout !== 'object') return false;

  const l = layout as Record<string, unknown>;

  if (typeof l.version !== 'number') return false;
  if (l.root !== null && !isValidNode(l.root)) return false;
  if (!l.tabs || typeof l.tabs !== 'object') return false;

  // Validate each tab
  for (const tab of Object.values(l.tabs as Record<string, unknown>)) {
    if (!isValidTab(tab)) return false;
  }

  return true;
}

/**
 * Validate node structure
 */
function isValidNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;

  const n = node as Record<string, unknown>;

  if (typeof n.id !== 'string') return false;
  if (n.type !== 'split' && n.type !== 'panel') return false;

  if (n.type === 'split') {
    if (n.direction !== 'horizontal' && n.direction !== 'vertical') return false;
    if (!Array.isArray(n.children) || n.children.length !== 2) return false;
    if (!Array.isArray(n.sizes) || n.sizes.length !== 2) return false;
    return isValidNode(n.children[0]) && isValidNode(n.children[1]);
  }

  if (n.type === 'panel') {
    if (!Array.isArray(n.tabs)) return false;
    if (n.activeTabId !== null && typeof n.activeTabId !== 'string') return false;
  }

  return true;
}

/**
 * Validate tab structure
 */
function isValidTab(tab: unknown): boolean {
  if (!tab || typeof tab !== 'object') return false;

  const t = tab as Record<string, unknown>;

  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.componentKey === 'string' &&
    typeof t.closable === 'boolean' &&
    typeof t.singleton === 'boolean'
  );
}

/**
 * Debounced save - saves after a delay to avoid excessive writes
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveLayout(state: DockingState, delay = 500): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveLayout(state);
    saveTimeout = null;
  }, delay);
}
