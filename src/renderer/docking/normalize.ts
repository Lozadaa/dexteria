/**
 * Dexteria Layout & View System v6
 * Normalization and Validation
 */

import type {
  LayoutNode,
  LayoutState,
  ViewGroup,
  ValidationResult,
  ValidateOptions,
} from './types';
import {
  collectGroupIds,
  collectLeafGroupIds,
  findFirstGroupInNode,
} from './navigation';
import { VIEW_TYPE_REGISTRY } from './registry';
import { clamp } from './utils';

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize the layout state by cleaning up orphaned references
 */
export function normalizeState(state: LayoutState): LayoutState {
  const tree = normalizeTree(state.tree, state.groups);

  const referencedGroupIds = new Set<string>();
  collectGroupIds(tree, referencedGroupIds);

  const groups: Record<string, ViewGroup> = {};
  for (const [groupId, group] of Object.entries(state.groups)) {
    if (referencedGroupIds.has(groupId)) {
      groups[groupId] = group;
    }
  }

  const referencedViewIds = new Set<string>();
  for (const group of Object.values(groups)) {
    for (const viewId of group.viewIds) {
      referencedViewIds.add(viewId);
    }
  }

  const views: Record<string, typeof state.views[string]> = {};
  for (const [viewId, view] of Object.entries(state.views)) {
    if (referencedViewIds.has(viewId)) {
      views[viewId] = view;
    }
  }

  let activeGroupId = state.activeGroupId;
  if (!groups[activeGroupId]) {
    activeGroupId = findFirstGroupInNode(tree);
  }

  return { tree, groups, views, activeGroupId };
}

/**
 * Normalize the tree by removing dead leaves
 */
function normalizeTree(
  node: LayoutNode,
  groups: Record<string, ViewGroup>
): LayoutNode {
  if (node.type === 'leaf') {
    return node;
  }

  const a = normalizeTree(node.a, groups);
  const b = normalizeTree(node.b, groups);

  const aIsDead = a.type === 'leaf' && groups[a.groupId] === undefined;
  const bIsDead = b.type === 'leaf' && groups[b.groupId] === undefined;

  if (aIsDead && bIsDead) {
    console.error('normalizeTree: both children are dead leaves');
    return a;
  }
  if (aIsDead) return b;
  if (bIsDead) return a;

  const ratio = clamp(node.ratio, 0.1, 0.9);

  return { ...node, a, b, ratio };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate all invariants of the layout state
 *
 * Invariants:
 * - INV-1: Every leaf references an existing group
 * - INV-2: Every group is referenced exactly once by a leaf
 * - INV-3: Every view is in exactly one group
 * - INV-4: Every group's viewIds reference existing views
 * - INV-5: Non-empty groups have a valid activeViewId
 * - INV-6: activeGroupId references an existing group
 * - INV-7: Split ratios are in range [0.1, 0.9]
 * - INV-8: Singleton view types have at most one instance
 * - INV-9: (strict) No empty groups
 */
export function validateInvariants(
  state: LayoutState,
  options: ValidateOptions = {}
): ValidationResult {
  const { strictEmptyGroups = process.env.NODE_ENV === 'development' } = options;
  const errors: string[] = [];

  // Collect all leaf group IDs
  const leafGroupIds: string[] = [];
  collectLeafGroupIds(state.tree, leafGroupIds);

  // INV-1: Every leaf references an existing group
  for (const groupId of leafGroupIds) {
    if (!state.groups[groupId]) {
      errors.push(`INV-1: Leaf references non-existent group: ${groupId}`);
    }
  }

  // INV-2: Every group is referenced exactly once
  const groupIdCounts = new Map<string, number>();
  for (const groupId of leafGroupIds) {
    groupIdCounts.set(groupId, (groupIdCounts.get(groupId) ?? 0) + 1);
  }

  for (const [groupId, count] of groupIdCounts) {
    if (count !== 1) {
      errors.push(`INV-2: Group ${groupId} referenced ${count} times`);
    }
  }

  for (const groupId of Object.keys(state.groups)) {
    if (!groupIdCounts.has(groupId)) {
      errors.push(`INV-2: Group ${groupId} not referenced by any leaf`);
    }
  }

  // INV-3: Every view is in exactly one group
  const viewGroupMap = new Map<string, string[]>();
  for (const [groupId, group] of Object.entries(state.groups)) {
    for (const viewId of group.viewIds) {
      const groups = viewGroupMap.get(viewId) ?? [];
      groups.push(groupId);
      viewGroupMap.set(viewId, groups);
    }
  }

  for (const [viewId, groupIds] of viewGroupMap) {
    if (groupIds.length !== 1) {
      errors.push(`INV-3: View ${viewId} in ${groupIds.length} groups`);
    }
  }

  // INV-4: Every group's viewIds reference existing views
  for (const group of Object.values(state.groups)) {
    for (const viewId of group.viewIds) {
      if (!state.views[viewId]) {
        errors.push(
          `INV-4: Group ${group.id} references non-existent view: ${viewId}`
        );
      }
    }
  }

  // INV-5: Non-empty groups have a valid activeViewId
  for (const group of Object.values(state.groups)) {
    if (group.viewIds.length > 0) {
      if (!group.activeViewId) {
        errors.push(`INV-5: Non-empty group ${group.id} has no activeViewId`);
      } else if (!group.viewIds.includes(group.activeViewId)) {
        errors.push(
          `INV-5: Group ${group.id} activeViewId not in viewIds`
        );
      }
    }
  }

  // INV-6: activeGroupId references an existing group
  if (!state.groups[state.activeGroupId]) {
    errors.push(`INV-6: activeGroupId is invalid: ${state.activeGroupId}`);
  }

  // INV-7: Split ratios are in range [0.1, 0.9]
  validateRatios(state.tree, errors);

  // INV-8: Singleton view types have at most one instance
  const singletonCounts = new Map<string, number>();
  for (const view of Object.values(state.views)) {
    const config = VIEW_TYPE_REGISTRY[view.viewType];
    if (config?.mode === 'singleton') {
      singletonCounts.set(
        view.viewType,
        (singletonCounts.get(view.viewType) ?? 0) + 1
      );
    }
  }
  for (const [viewType, count] of singletonCounts) {
    if (count > 1) {
      errors.push(`INV-8: Singleton ${viewType} has ${count} instances`);
    }
  }

  // INV-9: No empty groups (strict mode)
  if (strictEmptyGroups) {
    for (const [groupId, group] of Object.entries(state.groups)) {
      if (group.viewIds.length === 0) {
        errors.push(`INV-9: Empty group found: ${groupId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Recursively validate split ratios
 */
function validateRatios(node: LayoutNode, errors: string[]): void {
  if (node.type === 'split') {
    if (node.ratio < 0.1 || node.ratio > 0.9) {
      errors.push(`INV-7: Ratio out of range: ${node.ratio}`);
    }
    validateRatios(node.a, errors);
    validateRatios(node.b, errors);
  }
}

/**
 * Assert invariants in development mode
 */
export function assertInvariants(state: LayoutState, action: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const result = validateInvariants(state, { strictEmptyGroups: true });
  if (!result.valid) {
    console.error(`Invariant violations after ${action}:`, result.errors);
  }
}
