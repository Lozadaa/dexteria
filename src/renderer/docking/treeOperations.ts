/**
 * Tree Operations
 * Utility functions for manipulating the layout tree
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  LayoutNode,
  SplitNode,
  PanelNode,
  DropZone,
  TabDefinition,
  DockingState,
} from './types';
import { isSplitNode, isPanelNode } from './types';

// ============================================================================
// Node Creation
// ============================================================================

/**
 * Create a new panel node
 */
export function createPanelNode(tabs: string[] = [], activeTabId: string | null = null): PanelNode {
  return {
    id: `panel-${uuidv4()}`,
    type: 'panel',
    tabs,
    activeTabId: activeTabId ?? tabs[0] ?? null,
  };
}

/**
 * Create a new split node
 */
export function createSplitNode(
  direction: 'horizontal' | 'vertical',
  children: [LayoutNode, LayoutNode],
  sizes: [number, number] = [50, 50]
): SplitNode {
  return {
    id: `split-${uuidv4()}`,
    type: 'split',
    direction,
    children,
    sizes,
  };
}

// ============================================================================
// Node Finding
// ============================================================================

/**
 * Find a node by ID in the tree
 */
export function findNode(root: LayoutNode | null, nodeId: string): LayoutNode | null {
  if (!root) return null;
  if (root.id === nodeId) return root;

  if (isSplitNode(root)) {
    const left = findNode(root.children[0], nodeId);
    if (left) return left;
    return findNode(root.children[1], nodeId);
  }

  return null;
}

/**
 * Find a panel containing a specific tab
 */
export function findPanelWithTab(root: LayoutNode | null, tabId: string): PanelNode | null {
  if (!root) return null;

  if (isPanelNode(root)) {
    return root.tabs.includes(tabId) ? root : null;
  }

  if (isSplitNode(root)) {
    const left = findPanelWithTab(root.children[0], tabId);
    if (left) return left;
    return findPanelWithTab(root.children[1], tabId);
  }

  return null;
}

/**
 * Find the parent split node of a given node
 */
export function findParentSplit(
  root: LayoutNode | null,
  nodeId: string,
  parent: SplitNode | null = null
): { parent: SplitNode; index: 0 | 1 } | null {
  if (!root) return null;

  if (root.id === nodeId && parent) {
    const index = parent.children[0].id === nodeId ? 0 : 1;
    return { parent, index };
  }

  if (isSplitNode(root)) {
    const left = findParentSplit(root.children[0], nodeId, root);
    if (left) return left;
    return findParentSplit(root.children[1], nodeId, root);
  }

  return null;
}

/**
 * Get all panel nodes in the tree
 */
export function getAllPanels(root: LayoutNode | null): PanelNode[] {
  if (!root) return [];

  if (isPanelNode(root)) {
    return [root];
  }

  if (isSplitNode(root)) {
    return [...getAllPanels(root.children[0]), ...getAllPanels(root.children[1])];
  }

  return [];
}

/**
 * Get all tab IDs in the tree
 */
export function getAllTabIds(root: LayoutNode | null): string[] {
  const panels = getAllPanels(root);
  return panels.flatMap((panel) => panel.tabs);
}

// ============================================================================
// Tree Modification (Immutable)
// ============================================================================

/**
 * Update a node in the tree (immutable)
 */
export function updateNode(
  root: LayoutNode | null,
  nodeId: string,
  updater: (node: LayoutNode) => LayoutNode
): LayoutNode | null {
  if (!root) return null;

  if (root.id === nodeId) {
    return updater(root);
  }

  if (isSplitNode(root)) {
    const newChildren: [LayoutNode, LayoutNode] = [
      updateNode(root.children[0], nodeId, updater) ?? root.children[0],
      updateNode(root.children[1], nodeId, updater) ?? root.children[1],
    ];

    // Only create new object if children changed
    if (newChildren[0] !== root.children[0] || newChildren[1] !== root.children[1]) {
      return { ...root, children: newChildren };
    }
  }

  return root;
}

/**
 * Replace a node in the tree (immutable)
 */
export function replaceNode(
  root: LayoutNode | null,
  nodeId: string,
  replacement: LayoutNode | null
): LayoutNode | null {
  if (!root) return replacement;

  if (root.id === nodeId) {
    return replacement;
  }

  if (isSplitNode(root)) {
    const leftResult = replaceNode(root.children[0], nodeId, replacement);
    const rightResult = replaceNode(root.children[1], nodeId, replacement);

    // If a child was replaced with null, return the other child
    if (leftResult === null) return rightResult;
    if (rightResult === null) return leftResult;

    // If the replacement happened in a subtree
    if (leftResult !== root.children[0] || rightResult !== root.children[1]) {
      return {
        ...root,
        children: [leftResult, rightResult],
      };
    }
  }

  return root;
}

// ============================================================================
// Tab Operations
// ============================================================================

/**
 * Add a tab to a panel
 */
export function addTabToPanel(
  root: LayoutNode | null,
  panelId: string,
  tabId: string,
  position?: number
): LayoutNode | null {
  return updateNode(root, panelId, (node) => {
    if (!isPanelNode(node)) return node;

    const tabs = [...node.tabs];
    const insertPosition = position ?? tabs.length;
    tabs.splice(insertPosition, 0, tabId);

    return {
      ...node,
      tabs,
      activeTabId: tabId, // Focus the new tab
    };
  });
}

/**
 * Remove a tab from a panel
 */
export function removeTabFromPanel(
  root: LayoutNode | null,
  panelId: string,
  tabId: string
): LayoutNode | null {
  return updateNode(root, panelId, (node) => {
    if (!isPanelNode(node)) return node;

    const tabIndex = node.tabs.indexOf(tabId);
    if (tabIndex === -1) return node;

    const tabs = node.tabs.filter((t) => t !== tabId);
    let activeTabId = node.activeTabId;

    // Update active tab if we removed the active one
    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        // Select the next tab, or the previous if we removed the last one
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        activeTabId = tabs[newIndex];
      } else {
        activeTabId = null;
      }
    }

    return { ...node, tabs, activeTabId };
  });
}

/**
 * Move a tab from one panel to another
 */
export function moveTab(
  root: LayoutNode | null,
  tabId: string,
  sourcePanelId: string,
  targetPanelId: string,
  position?: number
): LayoutNode | null {
  if (sourcePanelId === targetPanelId) {
    // Reorder within same panel
    return updateNode(root, sourcePanelId, (node) => {
      if (!isPanelNode(node)) return node;

      const tabs = [...node.tabs];
      const currentIndex = tabs.indexOf(tabId);
      if (currentIndex === -1) return node;

      tabs.splice(currentIndex, 1);
      const insertPosition = position ?? tabs.length;
      tabs.splice(insertPosition, 0, tabId);

      return { ...node, tabs, activeTabId: tabId };
    });
  }

  // Move between panels
  let result = removeTabFromPanel(root, sourcePanelId, tabId);
  result = addTabToPanel(result, targetPanelId, tabId, position);

  return result;
}

// ============================================================================
// Panel Operations
// ============================================================================

/**
 * Split a panel in the given direction
 * Returns the new split node ID and the new panel ID
 */
export function splitPanel(
  root: LayoutNode | null,
  panelId: string,
  direction: 'horizontal' | 'vertical',
  dropZone: DropZone
): { root: LayoutNode | null; newPanelId: string; newSplitId: string } {
  const newPanel = createPanelNode();

  const result = updateNode(root, panelId, (node) => {
    // Determine order based on drop zone
    const isFirstPosition = dropZone === 'left' || dropZone === 'top';
    const children: [LayoutNode, LayoutNode] = isFirstPosition
      ? [newPanel, node]
      : [node, newPanel];

    return createSplitNode(direction, children);
  });

  const newSplit = result && findNode(result, newPanel.id);
  const parentSplit = newSplit ? findParentSplit(result, newPanel.id) : null;

  return {
    root: result,
    newPanelId: newPanel.id,
    newSplitId: parentSplit?.parent.id ?? '',
  };
}

/**
 * Remove an empty panel and clean up the tree
 */
export function removeEmptyPanel(root: LayoutNode | null, panelId: string): LayoutNode | null {
  const panel = findNode(root, panelId);
  if (!panel || !isPanelNode(panel)) return root;

  // If panel still has tabs, don't remove
  if (panel.tabs.length > 0) return root;

  // Find parent split
  const parentInfo = findParentSplit(root, panelId);
  if (!parentInfo) {
    // This is the root panel, can't remove
    return root;
  }

  // Replace the parent split with the sibling
  const siblingIndex = parentInfo.index === 0 ? 1 : 0;
  const sibling = parentInfo.parent.children[siblingIndex];

  return replaceNode(root, parentInfo.parent.id, sibling);
}

// ============================================================================
// Size Operations
// ============================================================================

/**
 * Update sizes on a split node
 */
export function updateSplitSizes(
  root: LayoutNode | null,
  splitId: string,
  sizes: [number, number]
): LayoutNode | null {
  return updateNode(root, splitId, (node) => {
    if (!isSplitNode(node)) return node;
    return { ...node, sizes };
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a layout against available tabs
 * Removes references to tabs that don't exist
 */
export function validateLayout(
  state: DockingState,
  availableTabs: Set<string>
): DockingState {
  const validTabs: Record<string, TabDefinition> = {};

  // Filter to only valid tabs
  for (const [id, tab] of Object.entries(state.tabs)) {
    if (availableTabs.has(tab.componentKey)) {
      validTabs[id] = tab;
    }
  }

  const validTabIds = new Set(Object.keys(validTabs));

  // Update root to only reference valid tabs
  const cleanRoot = cleanLayoutTree(state.root, validTabIds);

  return {
    root: cleanRoot,
    tabs: validTabs,
  };
}

/**
 * Clean layout tree of invalid tab references
 */
function cleanLayoutTree(
  root: LayoutNode | null,
  validTabIds: Set<string>
): LayoutNode | null {
  if (!root) return null;

  if (isPanelNode(root)) {
    const validPanelTabs = root.tabs.filter((t) => validTabIds.has(t));
    if (validPanelTabs.length === 0) {
      return null; // Empty panel, will be cleaned up
    }

    const activeTabId =
      root.activeTabId && validTabIds.has(root.activeTabId)
        ? root.activeTabId
        : validPanelTabs[0];

    return {
      ...root,
      tabs: validPanelTabs,
      activeTabId,
    };
  }

  if (isSplitNode(root)) {
    const cleanedLeft = cleanLayoutTree(root.children[0], validTabIds);
    const cleanedRight = cleanLayoutTree(root.children[1], validTabIds);

    if (!cleanedLeft && !cleanedRight) return null;
    if (!cleanedLeft) return cleanedRight;
    if (!cleanedRight) return cleanedLeft;

    return {
      ...root,
      children: [cleanedLeft, cleanedRight],
    };
  }

  return root;
}

/**
 * Get drop direction from zone
 */
export function getDirectionFromZone(zone: DropZone): 'horizontal' | 'vertical' {
  return zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
}
