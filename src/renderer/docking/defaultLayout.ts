/**
 * Default Layout Configuration
 * Creates the initial layout for the app
 */

import type { LayoutState } from './types';
import { generateId } from './utils';

/**
 * Create the default layout state
 * Layout: Board (left) | Chat (right) with TaskRunner at bottom
 */
export function createDefaultLayout(): LayoutState {
  // Generate IDs
  const boardGroupId = generateId('vg');
  const chatGroupId = generateId('vg');
  const runnerGroupId = generateId('vg');

  const boardViewId = generateId('vi');
  const chatViewId = generateId('vi');
  const runnerViewId = generateId('vi');

  return {
    tree: {
      type: 'split',
      direction: 'col', // Top/bottom split
      ratio: 0.75,
      a: {
        type: 'split',
        direction: 'row', // Left/right split
        ratio: 0.6,
        a: { type: 'leaf', groupId: boardGroupId },
        b: { type: 'leaf', groupId: chatGroupId },
      },
      b: { type: 'leaf', groupId: runnerGroupId },
    },
    groups: {
      [boardGroupId]: {
        id: boardGroupId,
        viewIds: [boardViewId],
        activeViewId: boardViewId,
      },
      [chatGroupId]: {
        id: chatGroupId,
        viewIds: [chatViewId],
        activeViewId: chatViewId,
      },
      [runnerGroupId]: {
        id: runnerGroupId,
        viewIds: [runnerViewId],
        activeViewId: runnerViewId,
      },
    },
    views: {
      [boardViewId]: {
        id: boardViewId,
        viewType: 'board',
        viewKey: 'board:default',
        params: {},
        hasDocument: false,
        isDirty: false,
      },
      [chatViewId]: {
        id: chatViewId,
        viewType: 'chat',
        viewKey: `chat:${chatViewId}`,
        params: {},
        hasDocument: false,
        isDirty: false,
      },
      [runnerViewId]: {
        id: runnerViewId,
        viewType: 'taskRunner',
        viewKey: 'taskRunner',
        params: {},
        hasDocument: false,
        isDirty: false,
      },
    },
    activeGroupId: boardGroupId,
  };
}

/**
 * Check if a layout is the welcome/empty layout
 */
export function isWelcomeLayout(state: LayoutState): boolean {
  const views = Object.values(state.views);
  return views.length === 1 && views[0].viewType === 'welcome';
}
