/**
 * Dexteria Layout & View System
 * Core type definitions
 */

// ============================================================================
// View Instance
// ============================================================================

/**
 * A single view instance within a ViewGroup
 */
export interface ViewInstance {
  readonly id: string;
  readonly viewType: ViewType;
  readonly viewKey: string;
  readonly params: Record<string, unknown>;
  readonly hasDocument: boolean;
  readonly documentId?: string;
  readonly isDirty: boolean;
}

// ============================================================================
// View Group
// ============================================================================

/**
 * A container for multiple views (tab group)
 */
export interface ViewGroup {
  readonly id: string;
  readonly viewIds: string[];
  readonly activeViewId: string | null;
}

// ============================================================================
// Layout Tree Nodes
// ============================================================================

/**
 * Leaf node - references a ViewGroup by ID
 */
export interface LeafNode {
  readonly type: 'leaf';
  readonly groupId: string;
}

/**
 * Split node - divides space between two children
 * direction: 'row' = left/right (horizontal), 'col' = top/bottom (vertical)
 * ratio: single value 0.1-0.9 for first child's proportion
 */
export interface SplitNode {
  readonly type: 'split';
  readonly direction: 'row' | 'col';
  readonly ratio: number;
  readonly a: LayoutNode;
  readonly b: LayoutNode;
}

/**
 * Union type for layout tree nodes
 */
export type LayoutNode = LeafNode | SplitNode;

// ============================================================================
// Layout State
// ============================================================================

/**
 * Complete layout state
 */
export interface LayoutState {
  readonly tree: LayoutNode;
  readonly groups: Record<string, ViewGroup>;
  readonly views: Record<string, ViewInstance>;
  readonly activeGroupId: string;
}

// ============================================================================
// Tree Path
// ============================================================================

/**
 * Path through the tree: 0 = child a, 1 = child b
 */
export type TreePath = number[];

// ============================================================================
// View Types
// ============================================================================

/**
 * All supported view types
 */
export type ViewType =
  | 'chat'
  | 'board'
  | 'taskRunner'
  | 'taskDetail'
  | 'plugins'
  | 'settings'
  | 'jsonEditor'
  | 'logs'
  | 'terminal'
  | 'themeEditor'
  | 'welcome';

/**
 * Instance creation mode for view types
 */
export type InstanceMode = 'singleton' | 'dedupeByKey' | 'alwaysNew';

/**
 * Configuration for a view type
 */
export interface ViewTypeConfig {
  readonly mode: InstanceMode;
  readonly getDedupeKey?: (params: Record<string, unknown>) => string | null;
}

// ============================================================================
// Drop Zones
// ============================================================================

/**
 * Drop zone positions for drag & drop
 */
export type DropZone = 'center' | 'top' | 'bottom' | 'left' | 'right';

/**
 * Drop target for move operations
 */
export interface DropTarget {
  readonly groupId: string;
  readonly zone: DropZone;
  readonly tabIndex?: number;
}

/**
 * Open target for view operations
 */
export type OpenTarget =
  | { readonly type: 'active' }
  | { readonly type: 'group'; readonly groupId: string }
  | {
      readonly type: 'newSplit';
      readonly groupId?: string;
      readonly direction?: 'row' | 'col';
      readonly position?: 'before' | 'after';
    };

// ============================================================================
// Drag State
// ============================================================================

/**
 * Active drag state during a drag operation
 */
export interface DragState {
  readonly viewId: string;
  readonly sourceGroupId: string;
  readonly currentDropZone: DropZone | null;
  readonly currentTargetGroupId: string | null;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result from invariant checks
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Options for validation
 */
export interface ValidateOptions {
  readonly strictEmptyGroups?: boolean;
}

// ============================================================================
// Tree Operation Results
// ============================================================================

/**
 * Result of removing a group from the tree
 */
export type RemoveResult =
  | { readonly type: 'removed'; readonly tree: LayoutNode }
  | { readonly type: 'wasLastLeaf' }
  | { readonly type: 'notFound' };

// ============================================================================
// Drop Zone Detection
// ============================================================================

/**
 * Result from drop zone detection
 */
export interface DropZoneResult {
  readonly zone: DropZone;
  readonly tabIndex?: number;
}

/**
 * Configuration for drop zone detection
 */
export interface DropZoneConfig {
  readonly edgeThreshold: number;
  readonly tabBarHeight: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isLeafNode(node: LayoutNode): node is LeafNode {
  return node.type === 'leaf';
}

export function isSplitNode(node: LayoutNode): node is SplitNode {
  return node.type === 'split';
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Serialized layout for persistence
 */
export interface SerializedLayout {
  readonly version: 1;
  readonly tree: LayoutNode;
  readonly groups: Record<string, ViewGroup>;
  readonly views: Record<string, ViewInstance>;
  readonly activeGroupId: string;
}
