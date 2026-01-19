/**
 * Dockable Panel
 * Panel component with tab bar and content area
 */

import React, { useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDocking } from './DockingContext';
import { useComponentRegistry } from './ComponentRegistry';
import type { PanelNode, DropZone, TabDefinition } from './types';
import {
  LayoutGrid,
  MessageSquare,
  Settings,
  Palette,
  FileText,
  Play,
  X,
} from 'lucide-react';

// Icon mapping
const ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  LayoutGrid,
  MessageSquare,
  Settings,
  Palette,
  FileText,
  Play,
};

// ============================================================================
// Tab Button
// ============================================================================

interface TabButtonProps {
  tab: TabDefinition;
  isActive: boolean;
  onActivate: () => void;
  onClose?: () => void;
  isDragging: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  onActivate,
  onClose,
  isDragging,
}) => {
  const { startDrag } = useDocking();
  const panel = useDocking().state.root;

  const Icon = tab.icon ? ICONS[tab.icon] : null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Only activate, don't start drag yet
      onActivate();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Find the panel that contains this tab
    const findPanelId = (node: typeof panel, tabId: string): string | null => {
      if (!node) return null;
      if (node.type === 'panel') {
        return node.tabs.includes(tabId) ? node.id : null;
      }
      if (node.type === 'split') {
        return findPanelId(node.children[0], tabId) || findPanelId(node.children[1], tabId);
      }
      return null;
    };

    const panelId = findPanelId(panel, tab.id);
    if (panelId) {
      startDrag(tab.id, panelId);
      e.dataTransfer.setData('text/plain', tab.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
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
      {tab.closable && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
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
      {/* Zone indicators */}
      {(['left', 'right', 'top', 'bottom', 'center'] as DropZone[]).map((zone) => (
        <div
          key={zone}
          className={`
            absolute transition-all duration-150
            ${getZoneStyle(zone)}
            ${activeZone === zone
              ? 'bg-primary/20 border-2 border-primary border-dashed'
              : 'border border-transparent'
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
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export const DockablePanel: React.FC<DockablePanelProps> = ({ panel, contentRef }) => {
  const { state, closeTab, focusTab, focusPanel, dragState, updateDropZone, endDrag } = useDocking();
  const panelRef = useRef<HTMLDivElement>(null);

  const { isOver, setNodeRef } = useDroppable({
    id: `panel-${panel.id}`,
    data: { panelId: panel.id },
  });

  // Calculate drop zone based on mouse position
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

      // Calculate relative position
      const relX = x / width;
      const relY = y / height;

      // Determine zone
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

  const activeTab = panel.activeTabId ? state.tabs[panel.activeTabId] : null;
  const isDraggingFromThis = dragState?.sourcePanelId === panel.id;
  const currentZone =
    dragState?.currentDropPanelId === panel.id ? dragState.currentDropZone : null;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // @ts-expect-error - ref assignment
        panelRef.current = node;
      }}
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
              onActivate={() => focusTab(tabId)}
              onClose={tab.closable ? () => closeTab(tabId) : undefined}
              isDragging={dragState?.tabId === tabId}
            />
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={contentRef} className="absolute inset-0 overflow-hidden">
          {/* Content is rendered via portal from ComponentRegistry */}
        </div>

        {/* Drop zone overlay */}
        <DropZoneOverlay activeZone={currentZone} isOver={!!dragState && !isDraggingFromThis} />

        {/* Empty state */}
        {panel.tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Drop a tab here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DockablePanel;
