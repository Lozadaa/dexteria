/**
 * Dexteria Layout & View System v6
 * Reducers (State Transformations)
 */

import type {
  LayoutState,
  ViewInstance,
  ViewGroup,
  ViewType,
  DropTarget,
  OpenTarget,
  TreePath,
} from './types';
import { generateId, arraysEqual, clamp } from './utils';
import { generateViewKey, findExistingView } from './registry';
import {
  findBestFocusTarget,
  updateNodeAtPath,
} from './navigation';
import { removeGroupFromTree, insertSplitAtGroup } from './treeOperations';
import { normalizeState } from './normalize';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the group containing a view
 */
function findGroupContainingView(
  groups: Record<string, ViewGroup>,
  viewId: string
): string | null {
  for (const [groupId, group] of Object.entries(groups)) {
    if (group.viewIds.includes(viewId)) return groupId;
  }
  return null;
}

/**
 * Compute the new active view ID when closing a view
 */
function computeNewActiveViewId(
  group: ViewGroup,
  closedViewId: string,
  remainingViewIds: string[]
): string {
  if (group.activeViewId !== closedViewId) {
    return group.activeViewId!;
  }
  const oldIndex = group.viewIds.indexOf(closedViewId);
  const newIndex = Math.min(oldIndex, remainingViewIds.length - 1);
  return remainingViewIds[newIndex];
}

// ============================================================================
// Create Welcome State
// ============================================================================

/**
 * Create a fresh welcome state (used when all views are closed)
 */
export function createWelcomeState(): LayoutState {
  const groupId = generateId('vg');
  const viewId = generateId('vi');

  return {
    tree: { type: 'leaf', groupId },
    groups: {
      [groupId]: {
        id: groupId,
        viewIds: [viewId],
        activeViewId: viewId,
      },
    },
    views: {
      [viewId]: {
        id: viewId,
        viewType: 'welcome',
        viewKey: 'welcome',
        params: {},
        hasDocument: false,
        isDirty: false,
      },
    },
    activeGroupId: groupId,
  };
}

// ============================================================================
// Close View
// ============================================================================

/**
 * Close a view
 */
export function computeCloseView(
  state: LayoutState,
  viewId: string
): LayoutState {
  const groupId = findGroupContainingView(state.groups, viewId);
  if (!groupId) return state;

  const group = state.groups[groupId];
  const newViewIds = group.viewIds.filter((id) => id !== viewId);
  const { [viewId]: removedView, ...remainingViews } = state.views;

  // Case 1: Group still has views
  if (newViewIds.length > 0) {
    const newActiveViewId = computeNewActiveViewId(group, viewId, newViewIds);

    return normalizeState({
      ...state,
      views: remainingViews,
      groups: {
        ...state.groups,
        [groupId]: {
          ...group,
          viewIds: newViewIds,
          activeViewId: newActiveViewId,
        },
      },
    });
  }

  // Case 2: Group is now empty - remove it
  const { [groupId]: removedGroup, ...remainingGroups } = state.groups;
  const isLastGroup = Object.keys(remainingGroups).length === 0;

  if (isLastGroup) {
    return createWelcomeState();
  }

  const newActiveGroupId =
    findBestFocusTarget(state.tree, groupId) ??
    Object.keys(remainingGroups)[0];

  const removeResult = removeGroupFromTree(state.tree, groupId);

  if (removeResult.type !== 'removed') {
    console.error('computeCloseView: unexpected removeResult', removeResult);
    return createWelcomeState();
  }

  return normalizeState({
    tree: removeResult.tree,
    groups: remainingGroups,
    views: remainingViews,
    activeGroupId: newActiveGroupId,
  });
}

// ============================================================================
// Activate View
// ============================================================================

/**
 * Activate a view (make it the active tab and focus its group)
 */
export function activateView(state: LayoutState, viewId: string): LayoutState {
  const groupId = findGroupContainingView(state.groups, viewId);
  if (!groupId) return state;

  return {
    ...state,
    groups: {
      ...state.groups,
      [groupId]: { ...state.groups[groupId], activeViewId: viewId },
    },
    activeGroupId: groupId,
  };
}

// ============================================================================
// Move View
// ============================================================================

/**
 * Move a view to a new location
 */
export function computeMoveView(
  state: LayoutState,
  viewId: string,
  target: DropTarget
): LayoutState {
  const sourceGroupId = findGroupContainingView(state.groups, viewId);
  if (!sourceGroupId) return state;

  const sourceGroup = state.groups[sourceGroupId];
  const isSameGroup = sourceGroupId === target.groupId;

  // Case 1: Reorder in same group
  if (isSameGroup && target.zone === 'center' && target.tabIndex !== undefined) {
    return reorderTabInGroup(state, sourceGroupId, viewId, target.tabIndex);
  }

  // Case 2: No-op (drop center without tabIndex in same group)
  if (isSameGroup && target.zone === 'center' && target.tabIndex === undefined) {
    return state;
  }

  let newState = { ...state };
  let targetGroupId: string;

  if (target.zone === 'center') {
    // Move to existing group
    targetGroupId = target.groupId;
  } else {
    // Create new split - CREATE GROUP WITH VIEW ALREADY INSIDE
    // (avoids intermediate state with empty group)
    const direction =
      target.zone === 'left' || target.zone === 'right' ? 'row' : 'col';
    const position =
      target.zone === 'left' || target.zone === 'top' ? 'before' : 'after';

    const newGroupId = generateId('vg');

    // Remove from source FIRST
    const newSourceViewIds = sourceGroup.viewIds.filter((id) => id !== viewId);
    const newSourceActiveId =
      newSourceViewIds.length > 0
        ? computeNewActiveViewId(sourceGroup, viewId, newSourceViewIds)
        : null;

    // Create new group WITH the view already inside (not empty)
    newState = {
      ...newState,
      groups: {
        ...newState.groups,
        [sourceGroupId]: {
          ...sourceGroup,
          viewIds: newSourceViewIds,
          activeViewId: newSourceActiveId,
        },
        [newGroupId]: {
          id: newGroupId,
          viewIds: [viewId], // View already included
          activeViewId: viewId, // Already active
        },
      },
      tree: insertSplitAtGroup(
        newState.tree,
        target.groupId,
        newGroupId,
        direction,
        position
      ),
      activeGroupId: newGroupId,
    };

    // Clean up source group if empty
    if (newSourceViewIds.length === 0 && sourceGroupId !== newGroupId) {
      const { [sourceGroupId]: removed, ...remainingGroups } = newState.groups;
      const removeResult = removeGroupFromTree(newState.tree, sourceGroupId);

      if (removeResult.type === 'removed') {
        newState = {
          ...newState,
          tree: removeResult.tree,
          groups: remainingGroups,
        };
      }
    }

    return normalizeState(newState);
  }

  // Move to existing group (zone === "center")
  const newSourceViewIds = sourceGroup.viewIds.filter((id) => id !== viewId);
  const newSourceActiveId =
    newSourceViewIds.length > 0
      ? computeNewActiveViewId(sourceGroup, viewId, newSourceViewIds)
      : null;

  newState = {
    ...newState,
    groups: {
      ...newState.groups,
      [sourceGroupId]: {
        ...sourceGroup,
        viewIds: newSourceViewIds,
        activeViewId: newSourceActiveId,
      },
    },
  };

  const targetGroup = newState.groups[targetGroupId];

  // Clamp tabIndex to valid range
  const maxIndex = targetGroup.viewIds.length;
  const insertIndex =
    target.tabIndex !== undefined
      ? Math.min(Math.max(0, target.tabIndex), maxIndex)
      : maxIndex;

  const newTargetViewIds = [
    ...targetGroup.viewIds.slice(0, insertIndex),
    viewId,
    ...targetGroup.viewIds.slice(insertIndex),
  ];

  newState = {
    ...newState,
    groups: {
      ...newState.groups,
      [targetGroupId]: {
        ...targetGroup,
        viewIds: newTargetViewIds,
        activeViewId: viewId,
      },
    },
    activeGroupId: targetGroupId,
  };

  // Clean up source group if empty
  if (newSourceViewIds.length === 0 && sourceGroupId !== targetGroupId) {
    const { [sourceGroupId]: removed, ...remainingGroups } = newState.groups;
    const removeResult = removeGroupFromTree(newState.tree, sourceGroupId);

    if (removeResult.type === 'removed') {
      newState = {
        ...newState,
        tree: removeResult.tree,
        groups: remainingGroups,
      };
    }
  }

  return normalizeState(newState);
}

// ============================================================================
// Reorder Tab
// ============================================================================

/**
 * Reorder a tab within the same group.
 *
 * NOTE: Removed the no-op "targetIndex === currentIndex + 1"
 * because the finalIndex logic already handles it correctly.
 * The previous check could block valid rightward movements.
 */
export function reorderTabInGroup(
  state: LayoutState,
  groupId: string,
  viewId: string,
  targetIndex: number
): LayoutState {
  const group = state.groups[groupId];
  const currentIndex = group.viewIds.indexOf(viewId);

  if (currentIndex === -1) return state;

  // Only no-op if exactly the same position
  if (targetIndex === currentIndex) {
    return state;
  }

  // Clamp targetIndex to valid range
  const clampedTargetIndex = Math.min(
    Math.max(0, targetIndex),
    group.viewIds.length
  );

  const newViewIds = [...group.viewIds];
  newViewIds.splice(currentIndex, 1);

  // Adjust index if moving forward
  const finalIndex =
    clampedTargetIndex > currentIndex
      ? clampedTargetIndex - 1
      : clampedTargetIndex;

  newViewIds.splice(finalIndex, 0, viewId);

  // Check if anything actually changed
  if (arraysEqual(newViewIds, group.viewIds)) {
    return state;
  }

  return {
    ...state,
    groups: {
      ...state.groups,
      [groupId]: { ...group, viewIds: newViewIds },
    },
  };
}

// ============================================================================
// Open View
// ============================================================================

/**
 * Find the group containing the board view (the "main" panel)
 * Falls back to the first group if board is not found
 */
function findMainGroupId(state: LayoutState): string {
  // Look for the group containing the 'board' view
  for (const view of Object.values(state.views)) {
    if (view.viewType === 'board') {
      const groupId = findGroupContainingView(state.groups, view.id);
      if (groupId) return groupId;
    }
  }
  // Fallback to active group if no board found
  return state.activeGroupId;
}

/**
 * Open a view (or activate an existing one if deduplication applies)
 * Default target is 'main' - opens in the main panel where board is located
 */
export function computeOpenView(
  state: LayoutState,
  viewType: ViewType,
  params: Record<string, unknown> = {},
  target: OpenTarget = { type: 'main' }
): LayoutState {
  const existingView = findExistingView(state.views, viewType, params);
  if (existingView) {
    return activateView(state, existingView.id);
  }

  const viewId = generateId('vi');
  const viewKey = generateViewKey(viewType, params);

  const newView: ViewInstance = {
    id: viewId,
    viewType,
    viewKey,
    params,
    hasDocument: false,
    isDirty: false,
  };

  let newState: LayoutState = {
    ...state,
    views: { ...state.views, [viewId]: newView },
  };

  let targetGroupId: string;

  switch (target.type) {
    case 'active':
      targetGroupId = state.activeGroupId;
      break;

    case 'main':
      targetGroupId = findMainGroupId(state);
      break;

    case 'group':
      targetGroupId = target.groupId;
      break;

    case 'newSplit': {
      // Create group WITH view already inside (avoids empty intermediate state)
      const newGroupId = generateId('vg');
      newState = {
        ...newState,
        groups: {
          ...newState.groups,
          [newGroupId]: {
            id: newGroupId,
            viewIds: [viewId],
            activeViewId: viewId,
          },
        },
        tree: insertSplitAtGroup(
          newState.tree,
          target.groupId ?? state.activeGroupId,
          newGroupId,
          target.direction ?? 'row',
          target.position ?? 'after'
        ),
        activeGroupId: newGroupId,
      };

      return normalizeState(newState);
    }
  }

  const targetGroup = newState.groups[targetGroupId];
  newState = {
    ...newState,
    groups: {
      ...newState.groups,
      [targetGroupId]: {
        ...targetGroup,
        viewIds: [...targetGroup.viewIds, viewId],
        activeViewId: viewId,
      },
    },
    activeGroupId: targetGroupId,
  };

  return normalizeState(newState);
}

// ============================================================================
// Resize Split
// ============================================================================

/**
 * Resize a split at the given path
 */
export function computeResizeSplit(
  state: LayoutState,
  path: TreePath,
  ratio: number
): LayoutState {
  const clampedRatio = clamp(ratio, 0.1, 0.9);

  const newTree = updateNodeAtPath(state.tree, path, (node) => {
    if (node.type !== 'split') return node;
    return { ...node, ratio: clampedRatio };
  });

  return { ...state, tree: newTree };
}

// ============================================================================
// Focus Group
// ============================================================================

/**
 * Focus a group
 */
export function computeFocusGroup(
  state: LayoutState,
  groupId: string
): LayoutState {
  if (!state.groups[groupId]) return state;
  return { ...state, activeGroupId: groupId };
}

// ============================================================================
// Set View Dirty
// ============================================================================

/**
 * Set the dirty flag on a view
 */
export function computeSetViewDirty(
  state: LayoutState,
  viewId: string,
  isDirty: boolean
): LayoutState {
  const view = state.views[viewId];
  if (!view) return state;

  return {
    ...state,
    views: {
      ...state.views,
      [viewId]: { ...view, isDirty },
    },
  };
}

// ============================================================================
// Update View Params
// ============================================================================

/**
 * Update the params of a view
 */
export function computeUpdateViewParams(
  state: LayoutState,
  viewId: string,
  params: Record<string, unknown>
): LayoutState {
  const view = state.views[viewId];
  if (!view) return state;

  return {
    ...state,
    views: {
      ...state.views,
      [viewId]: { ...view, params: { ...view.params, ...params } },
    },
  };
}
