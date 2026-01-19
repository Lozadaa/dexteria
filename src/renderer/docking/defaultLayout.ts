/**
 * Default Layout
 * Initial layout configuration for new users
 */

import type { DockingState, SplitNode, PanelNode, TabDefinition } from './types';

// ============================================================================
// Component Keys (used by ComponentRegistry)
// ============================================================================

export const COMPONENT_KEYS = {
  BOARD: 'board',
  CHAT: 'chat',
  SETTINGS: 'settings',
  THEME_EDITOR: 'theme-editor',
  TASK_DETAIL: 'task-detail',
  TASK_RUNNER: 'task-runner',
} as const;

// ============================================================================
// Default Tab IDs
// ============================================================================

const DEFAULT_TAB_IDS = {
  BOARD: 'tab-board-default',
  CHAT: 'tab-chat-default',
  RUNNER: 'tab-runner-default',
} as const;

// ============================================================================
// Default Tab Definitions
// ============================================================================

const defaultTabs: Record<string, TabDefinition> = {
  [DEFAULT_TAB_IDS.BOARD]: {
    id: DEFAULT_TAB_IDS.BOARD,
    title: 'Board',
    icon: 'LayoutGrid',
    componentKey: COMPONENT_KEYS.BOARD,
    closable: false, // Board is always open
    singleton: true,
  },
  [DEFAULT_TAB_IDS.CHAT]: {
    id: DEFAULT_TAB_IDS.CHAT,
    title: 'Chat',
    icon: 'MessageSquare',
    componentKey: COMPONENT_KEYS.CHAT,
    closable: true,
    singleton: false, // Can have multiple chat instances
  },
  [DEFAULT_TAB_IDS.RUNNER]: {
    id: DEFAULT_TAB_IDS.RUNNER,
    title: 'Task Runner',
    icon: 'Play',
    componentKey: COMPONENT_KEYS.TASK_RUNNER,
    closable: true,
    singleton: true,
  },
};

// ============================================================================
// Default Panel IDs
// ============================================================================

const DEFAULT_PANEL_IDS = {
  LEFT: 'panel-left-default',
  RIGHT: 'panel-right-default',
  BOTTOM: 'panel-bottom-default',
} as const;

// ============================================================================
// Default Layout Structure
// ============================================================================

/*
  Layout:
  ┌────────────────────────────────────────────────┐
  │                    TopBar (fixed)              │
  ├─────────────────────────┬──────────────────────┤
  │                         │                      │
  │       Board (60%)       │      Chat (40%)      │
  │                         │                      │
  ├─────────────────────────┴──────────────────────┤
  │              Task Runner (25%)                  │
  └────────────────────────────────────────────────┘
*/

const leftPanel: PanelNode = {
  id: DEFAULT_PANEL_IDS.LEFT,
  type: 'panel',
  tabs: [DEFAULT_TAB_IDS.BOARD],
  activeTabId: DEFAULT_TAB_IDS.BOARD,
};

const rightPanel: PanelNode = {
  id: DEFAULT_PANEL_IDS.RIGHT,
  type: 'panel',
  tabs: [DEFAULT_TAB_IDS.CHAT],
  activeTabId: DEFAULT_TAB_IDS.CHAT,
};

const bottomPanel: PanelNode = {
  id: DEFAULT_PANEL_IDS.BOTTOM,
  type: 'panel',
  tabs: [DEFAULT_TAB_IDS.RUNNER],
  activeTabId: DEFAULT_TAB_IDS.RUNNER,
};

const topSplit: SplitNode = {
  id: 'split-top-default',
  type: 'split',
  direction: 'horizontal',
  children: [leftPanel, rightPanel],
  sizes: [60, 40],
};

const rootSplit: SplitNode = {
  id: 'split-root-default',
  type: 'split',
  direction: 'vertical',
  children: [topSplit, bottomPanel],
  sizes: [75, 25],
};

// ============================================================================
// Create Default Layout
// ============================================================================

/**
 * Create a fresh default layout
 */
export function createDefaultLayout(): DockingState {
  return {
    root: rootSplit,
    tabs: { ...defaultTabs },
  };
}

/**
 * Get default panel IDs (for reference)
 */
export function getDefaultPanelIds() {
  return DEFAULT_PANEL_IDS;
}

/**
 * Get default tab IDs (for reference)
 */
export function getDefaultTabIds() {
  return DEFAULT_TAB_IDS;
}

/**
 * Check if a tab ID is a default tab
 */
export function isDefaultTab(tabId: string): boolean {
  return Object.values(DEFAULT_TAB_IDS).includes(tabId as typeof DEFAULT_TAB_IDS[keyof typeof DEFAULT_TAB_IDS]);
}
