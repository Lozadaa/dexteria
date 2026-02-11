/**
 * Dexteria Layout & View System
 * Public API
 */

// Types
export type {
  ViewInstance,
  ViewGroup,
  LeafNode,
  SplitNode,
  LayoutNode,
  LayoutState,
  TreePath,
  ViewType,
  InstanceMode,
  ViewTypeConfig,
  DropZone,
  DropTarget,
  OpenTarget,
  DragState,
  ValidationResult,
  ValidateOptions,
  RemoveResult,
  DropZoneResult,
  DropZoneConfig,
  SerializedLayout,
} from './types';

export { isLeafNode, isSplitNode } from './types';

// Registry
export { VIEW_TYPE_REGISTRY, generateViewKey, findExistingView } from './registry';

// Navigation
export {
  findPathToGroup,
  getNodeAtPath,
  replaceNodeAtPath,
  updateNodeAtPath,
  findBestFocusTarget,
  findFirstGroupInNode,
  findLastGroupInNode,
  containsGroup,
  collectGroupIds,
  collectLeafGroupIds,
  collectSplitPaths,
} from './navigation';

// Tree Operations
export { removeGroupFromTree, insertSplitAtGroup } from './treeOperations';

// Normalization & Validation
export { normalizeState, validateInvariants, assertInvariants } from './normalize';

// Reducers
export {
  createWelcomeState,
  computeCloseView,
  computeMoveView,
  computeOpenView,
  computeResizeSplit,
  computeFocusGroup,
  activateView,
  computeSetViewDirty,
  computeUpdateViewParams,
  reorderTabInGroup,
} from './reducers';

// Drop Zones
export {
  ZONE_CONFIG,
  detectDropZone,
  getDropZoneOverlayStyle,
  getDropZonePreviewRect,
} from './dropZones';

// Store
export {
  useLayoutStore,
  useLayoutActions,
  useView,
  useGroup,
  useIsGroupFocused,
  useActiveGroupId,
  useGroupViews,
  useDragState,
  useIsDragging,
  findGroupContainingView,
} from './store';

// Component Registry
export {
  ComponentRegistryProvider,
  useComponentRegistry,
  PlaceholderView,
} from './ComponentRegistry';
export type { ViewComponentProps, ViewTypeDefinition } from './ComponentRegistry';

// Components
export { ViewGroupPanel } from './components/ViewGroupPanel';
export { SplitContainer } from './components/SplitContainer';
export { DockingLayout } from './DockingLayout';

// Persistence
export {
  saveLayout,
  debouncedSaveLayout,
  loadLayout,
  loadLayoutWithInfo,
  loadLayoutOrDefault,
  clearLayout,
} from './persistence';
export type { LoadLayoutResult } from './persistence';

// Utils
export { generateId, arraysEqual, clamp } from './utils';

// Default Layout
export { createDefaultLayout, isWelcomeLayout } from './defaultLayout';

// View Definitions
export { viewDefinitions } from './views';
