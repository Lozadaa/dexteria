/**
 * Layout Tree Renderer
 * Recursively renders the layout tree with panels and splits
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { DockablePanel } from './DockablePanel';
import { useDocking } from './DockingContext';
import type { LayoutNode, SplitNode, PanelNode } from './types';
import { isSplitNode, isPanelNode } from './types';

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
        group
      `}
    >
      <div
        className={`
          ${direction === 'horizontal' ? 'w-1 h-full' : 'w-full h-1'}
          group-hover:bg-primary/30
          transition-colors
        `}
      />
    </PanelResizeHandle>
  );
};

// ============================================================================
// Panel Content Refs Context
// ============================================================================

interface PanelRefsContextValue {
  refs: Map<string, React.RefObject<HTMLDivElement | null>>;
  getRef: (panelId: string) => React.RefObject<HTMLDivElement | null>;
}

const PanelRefsContext = React.createContext<PanelRefsContextValue | null>(null);

export function usePanelRefs(): PanelRefsContextValue {
  const context = React.useContext(PanelRefsContext);
  if (!context) {
    throw new Error('usePanelRefs must be used within a PanelRefsProvider');
  }
  return context;
}

// ============================================================================
// Split Node Renderer
// ============================================================================

interface SplitNodeRendererProps {
  node: SplitNode;
}

const SplitNodeRenderer: React.FC<SplitNodeRendererProps> = ({ node }) => {
  const { updateSizes } = useDocking();

  const handleResize = useCallback(
    (sizes: number[]) => {
      if (sizes.length === 2) {
        updateSizes(node.id, [sizes[0], sizes[1]]);
      }
    },
    [node.id, updateSizes]
  );

  return (
    <PanelGroup
      direction={node.direction}
      onLayout={handleResize}
      className="h-full w-full"
    >
      <Panel defaultSize={node.sizes[0]} minSize={10}>
        <NodeRenderer node={node.children[0]} />
      </Panel>
      <ResizeHandle direction={node.direction} />
      <Panel defaultSize={node.sizes[1]} minSize={10}>
        <NodeRenderer node={node.children[1]} />
      </Panel>
    </PanelGroup>
  );
};

// ============================================================================
// Panel Node Renderer
// ============================================================================

interface PanelNodeRendererProps {
  node: PanelNode;
}

const PanelNodeRenderer: React.FC<PanelNodeRendererProps> = ({ node }) => {
  const { getRef } = usePanelRefs();
  const contentRef = getRef(node.id);

  return <DockablePanel panel={node} contentRef={contentRef} />;
};

// ============================================================================
// Generic Node Renderer
// ============================================================================

interface NodeRendererProps {
  node: LayoutNode;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ node }) => {
  if (isSplitNode(node)) {
    return <SplitNodeRenderer node={node} />;
  }

  if (isPanelNode(node)) {
    return <PanelNodeRenderer node={node} />;
  }

  return null;
};

// ============================================================================
// Layout Tree Renderer
// ============================================================================

interface LayoutTreeRendererProps {
  children?: React.ReactNode;
}

export const LayoutTreeRenderer: React.FC<LayoutTreeRendererProps> = ({ children }) => {
  const { state } = useDocking();
  const refsMapRef = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  // Create/get refs for panels
  const getRef = useCallback((panelId: string): React.RefObject<HTMLDivElement | null> => {
    let ref = refsMapRef.current.get(panelId);
    if (!ref) {
      ref = React.createRef<HTMLDivElement>();
      refsMapRef.current.set(panelId, ref);
    }
    return ref;
  }, []);

  // Collect all panel IDs to clean up old refs
  const collectPanelIds = useCallback((node: LayoutNode | null): string[] => {
    if (!node) return [];
    if (isPanelNode(node)) return [node.id];
    if (isSplitNode(node)) {
      return [...collectPanelIds(node.children[0]), ...collectPanelIds(node.children[1])];
    }
    return [];
  }, []);

  // Build context value
  const panelRefsValue: PanelRefsContextValue = useMemo(
    () => ({
      refs: refsMapRef.current,
      getRef,
    }),
    [getRef]
  );

  // Empty state
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
      {children}
    </PanelRefsContext.Provider>
  );
};

export default LayoutTreeRenderer;
