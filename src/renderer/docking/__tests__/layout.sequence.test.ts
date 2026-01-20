/**
 * Layout Sequence Tests
 * Tests specific sequences of operations
 */

import { describe, it, expect } from 'vitest';
import type { LayoutState } from '../types';
import { validateInvariants } from '../normalize';
import {
  createWelcomeState,
  computeCloseView,
  computeMoveView,
  computeOpenView,
  computeResizeSplit,
  reorderTabInGroup,
} from '../reducers';
import { collectSplitPaths } from '../navigation';

// ============================================================================
// Helpers
// ============================================================================

function countGroups(state: LayoutState): number {
  return Object.keys(state.groups).length;
}

// ============================================================================
// Tests
// ============================================================================

describe('Layout Sequence Tests', () => {
  it('split → move → close → resize', () => {
    let state = createWelcomeState();
    const welcomeViewId = Object.keys(state.views)[0];

    // Open chat
    state = computeOpenView(state, 'chat', {});
    expect(validateInvariants(state).valid).toBe(true);
    const chatViewId = Object.keys(state.views).find(
      (id) => state.views[id].viewType === 'chat'
    )!;

    // Open board in new split
    state = computeOpenView(
      state,
      'board',
      { projectId: 'proj_1' },
      {
        type: 'newSplit',
        direction: 'row',
        position: 'after',
      }
    );
    expect(validateInvariants(state).valid).toBe(true);
    expect(countGroups(state)).toBe(2);

    // Move chat to the other group
    const groups = Object.keys(state.groups);
    const targetGroup = groups.find((g) => state.groups[g].viewIds.length === 1)!;

    state = computeMoveView(state, chatViewId, { groupId: targetGroup, zone: 'center' });
    expect(validateInvariants(state).valid).toBe(true);

    // Close welcome
    state = computeCloseView(state, welcomeViewId);
    expect(validateInvariants(state).valid).toBe(true);
    expect(countGroups(state)).toBe(1);

    // Open terminal in new split
    state = computeOpenView(
      state,
      'terminal',
      {},
      {
        type: 'newSplit',
        direction: 'col',
        position: 'after',
      }
    );
    expect(validateInvariants(state).valid).toBe(true);
    expect(countGroups(state)).toBe(2);

    // Resize split
    const splitPath = collectSplitPaths(state.tree)[0];
    state = computeResizeSplit(state, splitPath, 0.7);
    expect(validateInvariants(state).valid).toBe(true);
  });

  it('rapid close leaves Welcome', () => {
    let state = createWelcomeState();

    // Open 10 terminals
    for (let i = 0; i < 10; i++) {
      state = computeOpenView(state, 'terminal', {});
    }
    expect(Object.keys(state.views).length).toBe(11);

    // Close all but one
    const viewIds = Object.keys(state.views);
    for (let i = 0; i < viewIds.length - 1; i++) {
      state = computeCloseView(state, viewIds[i]);
      expect(validateInvariants(state).valid).toBe(true);
    }

    expect(Object.keys(state.views).length).toBe(1);
    expect(countGroups(state)).toBe(1);
  });

  it('close all creates Welcome', () => {
    let state = createWelcomeState();
    const viewId = Object.keys(state.views)[0];

    state = computeCloseView(state, viewId);
    expect(validateInvariants(state).valid).toBe(true);

    // Should have created Welcome
    expect(Object.keys(state.views).length).toBe(1);
    expect(Object.values(state.views)[0].viewType).toBe('welcome');
  });

  it('complex split then collapse', () => {
    let state = createWelcomeState();

    // Create multiple splits
    state = computeOpenView(
      state,
      'chat',
      {},
      { type: 'newSplit', direction: 'row', position: 'after' }
    );
    state = computeOpenView(
      state,
      'board',
      { projectId: 'p1' },
      { type: 'newSplit', direction: 'col', position: 'after' }
    );
    state = computeOpenView(
      state,
      'logs',
      {},
      { type: 'newSplit', direction: 'row', position: 'before' }
    );

    expect(countGroups(state)).toBe(4);
    expect(validateInvariants(state).valid).toBe(true);

    // Close all views except last
    const allViewIds = Object.keys(state.views);
    for (const viewId of allViewIds.slice(0, -1)) {
      state = computeCloseView(state, viewId);
      expect(validateInvariants(state).valid).toBe(true);
    }

    expect(countGroups(state)).toBe(1);
    expect(state.tree.type).toBe('leaf');
  });

  it('reorder tabs in all directions', () => {
    let state = createWelcomeState();

    // Create 5 tabs in one group
    for (let i = 0; i < 4; i++) {
      state = computeOpenView(state, 'terminal', {});
    }

    const group = Object.values(state.groups)[0];
    expect(group.viewIds.length).toBe(5);

    // Move first tab to end
    state = reorderTabInGroup(state, group.id, group.viewIds[0], group.viewIds.length);
    expect(validateInvariants(state).valid).toBe(true);

    // Move last tab to beginning
    const updatedGroup = state.groups[group.id];
    state = reorderTabInGroup(state, group.id, updatedGroup.viewIds[4], 0);
    expect(validateInvariants(state).valid).toBe(true);
  });

  it('move to edge of same group creates split', () => {
    let state = createWelcomeState();
    state = computeOpenView(state, 'chat', {});

    expect(countGroups(state)).toBe(1);

    const group = Object.values(state.groups)[0];
    const viewId = group.viewIds[0];

    // Move to right edge of same group
    state = computeMoveView(state, viewId, { groupId: group.id, zone: 'right' });
    expect(validateInvariants(state).valid).toBe(true);
    expect(countGroups(state)).toBe(2);
  });

  it('singleton views are deduplicated', () => {
    let state = createWelcomeState();

    // Open settings
    state = computeOpenView(state, 'settings', {});
    const settingsViewId1 = Object.keys(state.views).find(
      (id) => state.views[id].viewType === 'settings'
    );
    expect(settingsViewId1).toBeDefined();

    // Open settings again - should activate existing
    state = computeOpenView(state, 'settings', {});
    const settingsViews = Object.values(state.views).filter(
      (v) => v.viewType === 'settings'
    );
    expect(settingsViews.length).toBe(1);

    expect(validateInvariants(state).valid).toBe(true);
  });

  it('dedupeByKey views are deduplicated by key', () => {
    let state = createWelcomeState();

    // Open board with projectId p1
    state = computeOpenView(state, 'board', { projectId: 'p1' });
    const boardCount1 = Object.values(state.views).filter(
      (v) => v.viewType === 'board'
    ).length;
    expect(boardCount1).toBe(1);

    // Open same board again - should activate existing
    state = computeOpenView(state, 'board', { projectId: 'p1' });
    const boardCount2 = Object.values(state.views).filter(
      (v) => v.viewType === 'board'
    ).length;
    expect(boardCount2).toBe(1);

    // Open board with different projectId - should create new
    state = computeOpenView(state, 'board', { projectId: 'p2' });
    const boardCount3 = Object.values(state.views).filter(
      (v) => v.viewType === 'board'
    ).length;
    expect(boardCount3).toBe(2);

    expect(validateInvariants(state).valid).toBe(true);
  });

  it('alwaysNew views create new instances', () => {
    let state = createWelcomeState();

    // Open multiple chats
    state = computeOpenView(state, 'chat', {});
    state = computeOpenView(state, 'chat', {});
    state = computeOpenView(state, 'chat', {});

    const chatViews = Object.values(state.views).filter(
      (v) => v.viewType === 'chat'
    );
    expect(chatViews.length).toBe(3);

    expect(validateInvariants(state).valid).toBe(true);
  });
});
