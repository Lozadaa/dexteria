/**
 * Layout Fuzz Test
 * Tests that the layout system maintains invariants under random operations
 */

import { describe, it, expect } from 'vitest';
import type { LayoutState, ViewType, DropTarget, DropZone, TreePath } from '../types';
import { VIEW_TYPE_REGISTRY } from '../registry';
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
// Random Helpers
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Random Action Generator
// ============================================================================

type RandomAction =
  | { type: 'openView'; viewType: ViewType; params: Record<string, unknown> }
  | { type: 'closeView'; viewId: string }
  | { type: 'moveView'; viewId: string; target: DropTarget }
  | { type: 'resizeSplit'; path: TreePath; ratio: number }
  | { type: 'reorderTab'; groupId: string; viewId: string; targetIndex: number };

function generateRandomAction(state: LayoutState): RandomAction {
  const actionTypes = ['openView', 'closeView', 'moveView', 'resizeSplit', 'reorderTab'];
  const actionType = randomChoice(actionTypes);

  switch (actionType) {
    case 'openView': {
      const viewType = randomChoice(Object.keys(VIEW_TYPE_REGISTRY) as ViewType[]);
      const params = viewType === 'board' ? { projectId: `proj_${randomInt(1, 5)}` } : {};
      return { type: 'openView', viewType, params };
    }

    case 'closeView': {
      const viewIds = Object.keys(state.views);
      if (viewIds.length === 0) return generateRandomAction(state);
      return { type: 'closeView', viewId: randomChoice(viewIds) };
    }

    case 'moveView': {
      const viewIds = Object.keys(state.views);
      const groupIds = Object.keys(state.groups);
      if (viewIds.length === 0 || groupIds.length === 0) return generateRandomAction(state);

      const targetGroupId = randomChoice(groupIds);
      const targetGroup = state.groups[targetGroupId];

      // tabIndex valid: 0 to viewIds.length (inclusive for insert at end)
      const maxTabIndex = targetGroup.viewIds.length;

      return {
        type: 'moveView',
        viewId: randomChoice(viewIds),
        target: {
          groupId: targetGroupId,
          zone: randomChoice(['center', 'top', 'bottom', 'left', 'right'] as DropZone[]),
          tabIndex: Math.random() > 0.5 ? randomInt(0, maxTabIndex) : undefined,
        },
      };
    }

    case 'resizeSplit': {
      const paths = collectSplitPaths(state.tree);
      if (paths.length === 0) return generateRandomAction(state);

      return {
        type: 'resizeSplit',
        path: randomChoice(paths),
        ratio: Math.random() * 0.8 + 0.1,
      };
    }

    case 'reorderTab': {
      const groupIds = Object.keys(state.groups);
      if (groupIds.length === 0) return generateRandomAction(state);

      const groupId = randomChoice(groupIds);
      const group = state.groups[groupId];
      if (group.viewIds.length < 2) return generateRandomAction(state);

      // targetIndex valid: 0 to viewIds.length
      return {
        type: 'reorderTab',
        groupId,
        viewId: randomChoice(group.viewIds),
        targetIndex: randomInt(0, group.viewIds.length),
      };
    }

    default:
      return generateRandomAction(state);
  }
}

function applyAction(state: LayoutState, action: RandomAction): LayoutState {
  switch (action.type) {
    case 'openView':
      return computeOpenView(state, action.viewType, action.params);
    case 'closeView':
      return computeCloseView(state, action.viewId);
    case 'moveView':
      return computeMoveView(state, action.viewId, action.target);
    case 'resizeSplit':
      return computeResizeSplit(state, action.path, action.ratio);
    case 'reorderTab':
      return reorderTabInGroup(state, action.groupId, action.viewId, action.targetIndex);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Layout Fuzz Test', () => {
  it('maintains invariants under 1000 random operations', () => {
    let state = createWelcomeState();

    for (let i = 0; i < 1000; i++) {
      const action = generateRandomAction(state);
      state = applyAction(state, action);

      const result = validateInvariants(state, { strictEmptyGroups: true });
      expect(result.valid, `Iteration ${i}: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('handles 5000 rapid operations', () => {
    let state = createWelcomeState();

    for (let i = 0; i < 5000; i++) {
      const action = generateRandomAction(state);
      state = applyAction(state, action);

      // Only validate every 100 operations for speed
      if (i % 100 === 0) {
        const result = validateInvariants(state, { strictEmptyGroups: true });
        expect(result.valid, `Iteration ${i}: ${result.errors.join(', ')}`).toBe(true);
      }
    }

    // Final mandatory validation
    const finalResult = validateInvariants(state, { strictEmptyGroups: true });
    expect(finalResult.valid, `Final: ${finalResult.errors.join(', ')}`).toBe(true);
  });
});
