/**
 * Docking System Types
 * VSCode-style flexible panel system with drag-and-drop tabs
 */

// ============================================================================
// Layout Tree Nodes
// ============================================================================

/**
 * Split node - divides space into two children with a resize handle
 */
export interface SplitNode {
  id: string;
  type: 'split';
  direction: 'horizontal' | 'vertical';
  children: [LayoutNode, LayoutNode];
  sizes: [number, number]; // Percentages (e.g., [60, 40])
}

/**
 * Panel node - contains tabs
 */
export interface PanelNode {
  id: string;
  type: 'panel';
  tabs: string[]; // Tab IDs
  activeTabId: string | null;
}

/**
 * Union type for layout tree nodes
 */
export type LayoutNode = SplitNode | PanelNode;

// ============================================================================
// Tab Definitions
// ============================================================================

/**
 * Tab definition - describes a tab and its content
 */
export interface TabDefinition {
  id: string;
  title: string;
  icon?: string; // Lucide icon name
  componentKey: string; // Key to look up component in registry
  closable: boolean;
  singleton: boolean; // If true, only one instance allowed
  props?: Record<string, unknown>; // Props to pass to component
}

/**
 * Tab instance for rendering
 */
export interface TabInstance {
  id: string;
  definition: TabDefinition;
  panelId: string;
}

// ============================================================================
// Drag and Drop
// ============================================================================

/**
 * Drop zone position
 */
export type DropZone = 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Drag state during tab drag operation
 */
export interface DragState {
  tabId: string;
  sourcePanelId: string;
  currentDropZone: DropZone | null;
  currentDropPanelId: string | null;
}

// ============================================================================
// Docking State
// ============================================================================

/**
 * Complete docking state
 */
export interface DockingState {
  root: LayoutNode | null;
  tabs: Record<string, TabDefinition>;
}

/**
 * Serializable layout for persistence
 */
export interface SerializedLayout {
  version: number;
  root: LayoutNode | null;
  tabs: Record<string, TabDefinition>;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Open tab options
 */
export interface OpenTabOptions {
  /** Panel to open in (optional, will use focused or create new) */
  panelId?: string;
  /** Position relative to target panel */
  position?: DropZone;
  /** Focus the tab after opening */
  focus?: boolean;
  /** Props to pass to the component */
  props?: Record<string, unknown>;
}

/**
 * Docking context value
 */
export interface DockingContextValue {
  // State
  state: DockingState;
  dragState: DragState | null;
  focusedPanelId: string | null;

  // Tab operations
  openTab: (componentKey: string, options?: OpenTabOptions) => string;
  closeTab: (tabId: string) => void;
  focusTab: (tabId: string) => void;
  updateTabProps: (tabId: string, props: Record<string, unknown>) => void;

  // Panel operations
  focusPanel: (panelId: string) => void;
  splitPanel: (panelId: string, direction: 'horizontal' | 'vertical', tabId?: string) => string;
  mergePanel: (panelId: string) => void;

  // Drag operations
  startDrag: (tabId: string, panelId: string) => void;
  updateDropZone: (zone: DropZone | null, panelId: string | null) => void;
  endDrag: () => void;

  // Layout operations
  updateSizes: (splitId: string, sizes: [number, number]) => void;
  resetLayout: () => void;
}

// ============================================================================
// Component Registry Types
// ============================================================================

/**
 * Component definition for registry
 */
export interface ComponentDefinition {
  key: string;
  component: React.ComponentType<Record<string, unknown>>;
  defaultTitle: string;
  icon?: string;
  closable?: boolean;
  singleton?: boolean;
}

/**
 * Component registry value
 */
export interface ComponentRegistryValue {
  components: Map<string, ComponentDefinition>;
  register: (definition: ComponentDefinition) => void;
  unregister: (key: string) => void;
  get: (key: string) => ComponentDefinition | undefined;
  getAll: () => ComponentDefinition[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSplitNode(node: LayoutNode): node is SplitNode {
  return node.type === 'split';
}

export function isPanelNode(node: LayoutNode): node is PanelNode {
  return node.type === 'panel';
}
