/**
 * Dexteria Layout & View System v6
 * Tree Operations
 */

import type {
  LayoutNode,
  SplitNode,
  LeafNode,
  RemoveResult,
} from './types';
import {
  findPathToGroup,
  getNodeAtPath,
  replaceNodeAtPath,
  containsGroup,
} from './navigation';

// ============================================================================
// Remove Group From Tree
// ============================================================================

/**
 * Remove a group from the tree.
 *
 * DEFENSIVE VALIDATIONS:
 * - If the path doesn't exist → notFound
 * - If the parent is null (corrupted tree) → notFound
 * - If the sibling contains the group to remove (corrupted tree) → notFound
 */
export function removeGroupFromTree(
  tree: LayoutNode,
  groupId: string
): RemoveResult {
  // Case 1: Tree is a leaf
  if (tree.type === 'leaf') {
    if (tree.groupId === groupId) {
      return { type: 'wasLastLeaf' };
    }
    return { type: 'notFound' };
  }

  // Case 2: Tree is a split - find the path
  const path = findPathToGroup(tree, groupId);

  if (!path || path.length === 0) {
    return { type: 'notFound' };
  }

  // Get parent path and verify it exists
  const parentPath = path.slice(0, -1);
  const wasInA = path[path.length - 1] === 0;

  // Case 2a: The parent is the root
  if (parentPath.length === 0) {
    const root = tree as SplitNode;
    const sibling = wasInA ? root.b : root.a;

    // VALIDATION: sibling must not contain the group to remove
    if (containsGroup(sibling, groupId)) {
      console.error(
        'removeGroupFromTree: sibling contains target group (corrupted tree)'
      );
      return { type: 'notFound' };
    }

    return { type: 'removed', tree: sibling };
  }

  // Case 2b: The parent is an internal split
  const parent = getNodeAtPath(tree, parentPath);

  // VALIDATION: parent must exist and be a split
  if (!parent || parent.type !== 'split') {
    console.error(
      'removeGroupFromTree: parent is null or not a split (corrupted tree)'
    );
    return { type: 'notFound' };
  }

  const sibling = wasInA ? parent.b : parent.a;

  // VALIDATION: sibling must not contain the group to remove
  if (containsGroup(sibling, groupId)) {
    console.error(
      'removeGroupFromTree: sibling contains target group (corrupted tree)'
    );
    return { type: 'notFound' };
  }

  const newTree = replaceNodeAtPath(tree, parentPath, sibling);
  return { type: 'removed', tree: newTree };
}

// ============================================================================
// Insert Split At Group
// ============================================================================

/**
 * Insert a new split at a target group, creating a new group alongside it.
 */
export function insertSplitAtGroup(
  tree: LayoutNode,
  targetGroupId: string,
  newGroupId: string,
  direction: 'row' | 'col',
  position: 'before' | 'after'
): LayoutNode {
  const path = findPathToGroup(tree, targetGroupId);
  if (!path) return tree;

  const existingLeaf: LeafNode = { type: 'leaf', groupId: targetGroupId };
  const newLeaf: LeafNode = { type: 'leaf', groupId: newGroupId };

  const splitNode: SplitNode = {
    type: 'split',
    direction,
    ratio: 0.5,
    a: position === 'before' ? newLeaf : existingLeaf,
    b: position === 'before' ? existingLeaf : newLeaf,
  };

  return replaceNodeAtPath(tree, path, splitNode);
}
