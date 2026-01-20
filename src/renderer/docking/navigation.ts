/**
 * Dexteria Layout & View System v6
 * Tree Navigation Functions
 */

import type { LayoutNode, SplitNode, LeafNode, TreePath } from './types';

// ============================================================================
// Path Finding
// ============================================================================

/**
 * Find the path to a group in the tree
 */
export function findPathToGroup(
  tree: LayoutNode,
  groupId: string
): TreePath | null {
  function search(node: LayoutNode, path: TreePath): TreePath | null {
    if (node.type === 'leaf') {
      return node.groupId === groupId ? path : null;
    }

    const inA = search(node.a, [...path, 0]);
    if (inA) return inA;

    return search(node.b, [...path, 1]);
  }

  return search(tree, []);
}

// ============================================================================
// Node Access
// ============================================================================

/**
 * Get the node at a specific path
 */
export function getNodeAtPath(
  tree: LayoutNode,
  path: TreePath
): LayoutNode | null {
  let current: LayoutNode = tree;

  for (const index of path) {
    if (current.type !== 'split') return null;
    current = index === 0 ? current.a : current.b;
  }

  return current;
}

/**
 * Replace a node at a specific path
 */
export function replaceNodeAtPath(
  tree: LayoutNode,
  path: TreePath,
  newNode: LayoutNode
): LayoutNode {
  if (path.length === 0) {
    return newNode;
  }

  if (tree.type !== 'split') {
    return tree;
  }

  const [head, ...rest] = path;

  if (head === 0) {
    return { ...tree, a: replaceNodeAtPath(tree.a, rest, newNode) };
  } else {
    return { ...tree, b: replaceNodeAtPath(tree.b, rest, newNode) };
  }
}

/**
 * Update a node at a specific path with an updater function
 */
export function updateNodeAtPath(
  tree: LayoutNode,
  path: TreePath,
  updater: (node: LayoutNode) => LayoutNode
): LayoutNode {
  if (path.length === 0) {
    return updater(tree);
  }

  if (tree.type !== 'split') return tree;

  const [head, ...rest] = path;

  if (head === 0) {
    return { ...tree, a: updateNodeAtPath(tree.a, rest, updater) };
  } else {
    return { ...tree, b: updateNodeAtPath(tree.b, rest, updater) };
  }
}

// ============================================================================
// Focus Target Finding
// ============================================================================

/**
 * Find the best focus target when a group is removed.
 * Returns the sibling's first (or last) group based on position.
 */
export function findBestFocusTarget(
  tree: LayoutNode,
  removedGroupId: string
): string | null {
  const path = findPathToGroup(tree, removedGroupId);
  if (!path) return findFirstGroupInNode(tree);

  for (let depth = path.length - 1; depth >= 0; depth--) {
    const ancestorPath = path.slice(0, depth);
    const ancestor = getNodeAtPath(tree, ancestorPath);

    if (!ancestor || ancestor.type !== 'split') continue;

    const wasInA = path[depth] === 0;
    const sibling = wasInA ? ancestor.b : ancestor.a;

    if (!containsGroup(sibling, removedGroupId)) {
      return wasInA
        ? findFirstGroupInNode(sibling)
        : findLastGroupInNode(sibling);
    }
  }

  return findFirstGroupInNode(tree);
}

/**
 * Find the first (leftmost/topmost) group in a node
 */
export function findFirstGroupInNode(node: LayoutNode): string {
  if (node.type === 'leaf') return node.groupId;
  return findFirstGroupInNode(node.a);
}

/**
 * Find the last (rightmost/bottommost) group in a node
 */
export function findLastGroupInNode(node: LayoutNode): string {
  if (node.type === 'leaf') return node.groupId;
  return findLastGroupInNode(node.b);
}

// ============================================================================
// Group Queries
// ============================================================================

/**
 * Check if a node contains a specific group
 */
export function containsGroup(node: LayoutNode, groupId: string): boolean {
  if (node.type === 'leaf') return node.groupId === groupId;
  return containsGroup(node.a, groupId) || containsGroup(node.b, groupId);
}

/**
 * Collect all group IDs from a node into a set
 */
export function collectGroupIds(node: LayoutNode, set: Set<string>): void {
  if (node.type === 'leaf') {
    set.add(node.groupId);
  } else {
    collectGroupIds(node.a, set);
    collectGroupIds(node.b, set);
  }
}

/**
 * Collect all group IDs from a node into an array
 */
export function collectLeafGroupIds(node: LayoutNode, result: string[]): void {
  if (node.type === 'leaf') {
    result.push(node.groupId);
  } else {
    collectLeafGroupIds(node.a, result);
    collectLeafGroupIds(node.b, result);
  }
}

/**
 * Collect all split paths in a tree
 */
export function collectSplitPaths(
  node: LayoutNode,
  path: TreePath = []
): TreePath[] {
  if (node.type === 'leaf') return [];

  return [
    path,
    ...collectSplitPaths(node.a, [...path, 0]),
    ...collectSplitPaths(node.b, [...path, 1]),
  ];
}
