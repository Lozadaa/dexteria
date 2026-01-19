/**
 * Docking System - Public API
 * VSCode-style flexible panel system with drag-and-drop tabs
 */

// Types
export type {
  LayoutNode,
  SplitNode,
  PanelNode,
  TabDefinition,
  TabInstance,
  DropZone,
  DragState,
  DockingState,
  SerializedLayout,
  OpenTabOptions,
  DockingContextValue,
  ComponentDefinition,
  ComponentRegistryValue,
} from './types';

export { isSplitNode, isPanelNode } from './types';

// Context and Hooks
export { DockingProvider, useDocking } from './DockingContext';
export {
  ComponentRegistryProvider,
  ComponentInstancesProvider,
  useComponentRegistry,
  useComponentInstances,
  TabContentRenderer,
  AllInstancesRenderer,
  PlaceholderComponent,
} from './ComponentRegistry';
export { DockingDndProvider } from './DockingDndContext';

// Components
export { DockablePanel } from './DockablePanel';
export { LayoutTreeRenderer, usePanelRefs } from './LayoutTreeRenderer';
export { DockingSystemProvider } from './DockingProvider';

// Utilities
export {
  createPanelNode,
  createSplitNode,
  findNode,
  findPanelWithTab,
  findParentSplit,
  getAllPanels,
  getAllTabIds,
  updateNode,
  replaceNode,
  addTabToPanel,
  removeTabFromPanel,
  moveTab,
  splitPanel,
  removeEmptyPanel,
  updateSplitSizes,
  validateLayout,
  getDirectionFromZone,
} from './treeOperations';

export { saveLayout, loadLayout, clearLayout, debouncedSaveLayout } from './persistence';

export { createDefaultLayout, getDefaultPanelIds, getDefaultTabIds, isDefaultTab, COMPONENT_KEYS } from './defaultLayout';

// Layout
export { DockingLayout } from './DockingLayout';
export { dockingComponents, DockingEventsProvider, useDockingEvents, createPluginPanelDefinition } from './DockingComponents';
export { PluginPanelsRegistrar } from './PluginPanelsRegistrar';
