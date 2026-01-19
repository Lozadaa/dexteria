/**
 * Docking Layout
 * Main layout component that integrates the docking system with existing components
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useDocking } from './DockingContext';
import { useComponentInstances, useComponentRegistry } from './ComponentRegistry';
import type { ComponentDefinition, LayoutNode, PanelNode, DropZone, TabDefinition } from './types';
import { isPanelNode, isSplitNode } from './types';
import {
  LayoutGrid,
  MessageSquare,
  Settings,
  Palette,
  FileText,
  Play,
  X,
  Terminal,
  Hammer,
} from 'lucide-react';

// Icon mapping
const ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  LayoutGrid,
  MessageSquare,
  Settings,
  Palette,
  FileText,
  Play,
  Terminal,
  Hammer,
};

// ============================================================================
// Panel Refs Context
// ============================================================================

interface PanelRefsContextValue {
  getRef: (panelId: string) => React.RefObject<HTMLDivElement | null>;
}

const PanelRefsContext = React.createContext<PanelRefsContextValue | null>(null);

function usePanelRefsInternal(): PanelRefsContextValue {
  const context = React.useContext(PanelRefsContext);
  if (!context) {
    throw new Error('usePanelRefs must be used within DockingLayout');
  }
  return context;
}

// ============================================================================
// Tab Button
// ============================================================================

interface TabButtonProps {
  tab: TabDefinition;
  isActive: boolean;
  panelId: string;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, isActive, panelId }) => {
  const { closeTab, focusTab, startDrag, dragState } = useDocking();

  const Icon = tab.icon ? ICONS[tab.icon] : null;
  const isDragging = dragState?.tabId === tab.id;

  const handleClick = () => {
    focusTab(tab.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    startDrag(tab.id, panelId);
    e.dataTransfer.setData('text/plain', tab.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tab.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`
        group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium cursor-pointer
        transition-colors relative select-none
        ${isActive
          ? 'text-foreground bg-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {Icon && <Icon size={14} />}
      <span className="truncate max-w-[120px]">{tab.title}</span>
      {tab.closable && (
        <button
          onClick={handleClose}
          className="ml-1 p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </div>
  );
};

// ============================================================================
// Drop Zone Overlay
// ============================================================================

interface DropZoneOverlayProps {
  activeZone: DropZone | null;
  isOver: boolean;
}

const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({ activeZone, isOver }) => {
  if (!isOver) return null;

  const getZoneStyle = (zone: DropZone): string => {
    switch (zone) {
      case 'left':
        return 'left-0 top-0 w-1/2 h-full';
      case 'right':
        return 'right-0 top-0 w-1/2 h-full';
      case 'top':
        return 'top-0 left-0 w-full h-1/2';
      case 'bottom':
        return 'bottom-0 left-0 w-full h-1/2';
      case 'center':
        return 'inset-4';
      default:
        return '';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {(['left', 'right', 'top', 'bottom', 'center'] as DropZone[]).map((zone) => (
        <div
          key={zone}
          className={`
            absolute transition-all duration-150
            ${getZoneStyle(zone)}
            ${activeZone === zone
              ? 'bg-primary/20 border-2 border-primary border-dashed'
              : ''
            }
          `}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Dockable Panel
// ============================================================================

interface DockablePanelProps {
  panel: PanelNode;
}

const DockablePanel: React.FC<DockablePanelProps> = ({ panel }) => {
  const { state, focusPanel, dragState, updateDropZone, endDrag } = useDocking();
  const { getRef } = usePanelRefsInternal();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = getRef(panel.id);

  const isDraggingFromThis = dragState?.sourcePanelId === panel.id;
  const currentZone = dragState?.currentDropPanelId === panel.id ? dragState.currentDropZone : null;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragState || !panelRef.current) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const rect = panelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      const relX = x / width;
      const relY = y / height;

      let zone: DropZone = 'center';
      const edgeThreshold = 0.25;

      if (relX < edgeThreshold) zone = 'left';
      else if (relX > 1 - edgeThreshold) zone = 'right';
      else if (relY < edgeThreshold) zone = 'top';
      else if (relY > 1 - edgeThreshold) zone = 'bottom';

      updateDropZone(zone, panel.id);
    },
    [dragState, panel.id, updateDropZone]
  );

  const handleDragLeave = useCallback(() => {
    if (dragState?.currentDropPanelId === panel.id) {
      updateDropZone(null, null);
    }
  }, [dragState, panel.id, updateDropZone]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      endDrag();
    },
    [endDrag]
  );

  const handlePanelClick = useCallback(() => {
    focusPanel(panel.id);
  }, [panel.id, focusPanel]);

  return (
    <div
      ref={panelRef}
      className="h-full w-full flex flex-col bg-background overflow-hidden"
      onClick={handlePanelClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab Bar */}
      <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
        {panel.tabs.map((tabId) => {
          const tab = state.tabs[tabId];
          if (!tab) return null;

          return (
            <TabButton
              key={tabId}
              tab={tab}
              isActive={tabId === panel.activeTabId}
              panelId={panel.id}
            />
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={contentRef} className="absolute inset-0 overflow-hidden" />
        <DropZoneOverlay activeZone={currentZone} isOver={!!dragState && !isDraggingFromThis} />
        {panel.tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Drop a tab here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Resize Handle
// ============================================================================

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ direction }) => {
  return (
    <PanelResizeHandle
      className={`
        ${direction === 'horizontal' ? 'w-1' : 'h-1'}
        bg-border hover:bg-primary/50 active:bg-primary
        transition-colors duration-150
      `}
    />
  );
};

// ============================================================================
// Layout Node Renderer
// ============================================================================

interface NodeRendererProps {
  node: LayoutNode;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ node }) => {
  const { updateSizes } = useDocking();

  if (isPanelNode(node)) {
    return <DockablePanel panel={node} />;
  }

  if (isSplitNode(node)) {
    const handleResize = (sizes: number[]) => {
      if (sizes.length === 2) {
        updateSizes(node.id, [sizes[0], sizes[1]]);
      }
    };

    return (
      <PanelGroup direction={node.direction} onLayout={handleResize} className="h-full w-full">
        <Panel defaultSize={node.sizes[0]} minSize={10}>
          <NodeRenderer node={node.children[0]} />
        </Panel>
        <ResizeHandle direction={node.direction} />
        <Panel defaultSize={node.sizes[1]} minSize={10}>
          <NodeRenderer node={node.children[1]} />
        </Panel>
      </PanelGroup>
    );
  }

  return null;
};

// ============================================================================
// Portaled Component Instance
// ============================================================================

interface PortaledInstanceProps {
  tabId: string;
  componentKey: string;
  props?: Record<string, unknown>;
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PortaledInstance: React.FC<PortaledInstanceProps> = ({
  tabId,
  componentKey,
  props,
  isActive,
  containerRef,
}) => {
  const { get } = useComponentRegistry();
  const componentDef = get(componentKey);
  // Force re-render when containerRef gets attached to DOM
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // If containerRef.current is null, schedule a re-render after DOM updates
    if (!containerRef.current) {
      const timer = requestAnimationFrame(() => {
        forceUpdate((n) => n + 1);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [containerRef, containerRef.current]);

  if (!componentDef || !containerRef.current) return null;

  const Component = componentDef.component;

  return createPortal(
    <div
      data-tab-id={tabId}
      className={`absolute inset-0 overflow-hidden ${isActive ? '' : 'invisible pointer-events-none'}`}
    >
      <Component {...(props || {})} tabId={tabId} />
    </div>,
    containerRef.current
  );
};

// ============================================================================
// Component Instances Manager
// ============================================================================

interface InstancesRendererProps {
  getRef: (panelId: string) => React.RefObject<HTMLDivElement | null>;
}

const InstancesRenderer: React.FC<InstancesRendererProps> = ({ getRef }) => {
  const { state } = useDocking();
  const { instances, mountInstance, unmountInstance } = useComponentInstances();

  // Collect all tabs and their panels
  const { tabPanelMap, activeTabs } = useMemo(() => {
    const collectData = (node: LayoutNode | null): { tabs: Map<string, string>; active: Set<string> } => {
      const tabs = new Map<string, string>();
      const active = new Set<string>();

      if (!node) return { tabs, active };

      if (isPanelNode(node)) {
        for (const tabId of node.tabs) {
          tabs.set(tabId, node.id);
        }
        if (node.activeTabId) {
          active.add(node.activeTabId);
        }
        return { tabs, active };
      }

      if (isSplitNode(node)) {
        const left = collectData(node.children[0]);
        const right = collectData(node.children[1]);
        left.tabs.forEach((v, k) => tabs.set(k, v));
        right.tabs.forEach((v, k) => tabs.set(k, v));
        left.active.forEach((v) => active.add(v));
        right.active.forEach((v) => active.add(v));
      }

      return { tabs, active };
    };

    const { tabs, active } = collectData(state.root);
    return { tabPanelMap: tabs, activeTabs: active };
  }, [state.root]);

  // Sync instances with tabs
  useEffect(() => {
    // Mount new tabs
    for (const [tabId] of tabPanelMap) {
      const tab = state.tabs[tabId];
      if (tab && !instances.has(tabId)) {
        mountInstance(tabId, tab.componentKey, tab.props);
      }
    }

    // Unmount removed tabs
    for (const tabId of instances.keys()) {
      if (!tabPanelMap.has(tabId)) {
        unmountInstance(tabId);
      }
    }
  }, [tabPanelMap, state.tabs, instances, mountInstance, unmountInstance]);

  return (
    <>
      {Array.from(instances.values()).map((instance) => {
        const panelId = tabPanelMap.get(instance.tabId);
        if (!panelId) return null;

        const ref = getRef(panelId);
        const isActive = activeTabs.has(instance.tabId);

        return (
          <PortaledInstance
            key={instance.tabId}
            tabId={instance.tabId}
            componentKey={instance.componentKey}
            props={instance.props}
            isActive={isActive}
            containerRef={ref}
          />
        );
      })}
    </>
  );
};

// ============================================================================
// Main Docking Layout
// ============================================================================

interface DockingLayoutProps {
  components: ComponentDefinition[];
  children?: React.ReactNode;
}

export const DockingLayout: React.FC<DockingLayoutProps> = ({ children }) => {
  const { state } = useDocking();
  const refsMapRef = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  // Create/get refs for panels - stable function
  const getRef = useCallback((panelId: string): React.RefObject<HTMLDivElement | null> => {
    let ref = refsMapRef.current.get(panelId);
    if (!ref) {
      ref = React.createRef<HTMLDivElement>();
      refsMapRef.current.set(panelId, ref);
    }
    return ref;
  }, []);

  const panelRefsValue: PanelRefsContextValue = useMemo(
    () => ({ getRef }),
    [getRef]
  );

  if (!state.root) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-4">
          <p className="text-lg">No panels open</p>
          <p className="text-sm">Use the Window menu to open panels</p>
        </div>
      </div>
    );
  }

  return (
    <PanelRefsContext.Provider value={panelRefsValue}>
      <div className="h-full w-full overflow-hidden">
        <NodeRenderer node={state.root} />
      </div>
      <InstancesRenderer getRef={getRef} />
      {children}
    </PanelRefsContext.Provider>
  );
};

export default DockingLayout;
