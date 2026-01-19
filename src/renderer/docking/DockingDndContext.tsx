/**
 * Docking DnD Context
 * Provides drag and drop context for the docking system
 * Separate from KanbanBoard's DnD to avoid conflicts
 */

import React, { useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { useDocking } from './DockingContext';
import type { DropZone } from './types';

// ============================================================================
// Types
// ============================================================================

interface DockingDndContextProps {
  children: React.ReactNode;
}

// ============================================================================
// Custom collision detection
// ============================================================================

function customCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  // Try pointer within first
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fall back to rect intersection
  return rectIntersection(args);
}

// ============================================================================
// Dragged Tab Overlay
// ============================================================================

interface DraggedTabOverlayProps {
  tabId: string | null;
}

const DraggedTabOverlay: React.FC<DraggedTabOverlayProps> = ({ tabId }) => {
  const { state } = useDocking();

  if (!tabId) return null;

  const tab = state.tabs[tabId];
  if (!tab) return null;

  return (
    <div className="px-3 py-1.5 bg-background border border-border rounded shadow-lg text-sm font-medium">
      {tab.title}
    </div>
  );
};

// ============================================================================
// Provider Component
// ============================================================================

export const DockingDndProvider: React.FC<DockingDndContextProps> = ({ children }) => {
  const { state, startDrag, updateDropZone, endDrag, dragState } = useDocking();

  // Configure sensors with activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // 10px of movement before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const tabId = active.id as string;

      // Find which panel contains this tab
      const findPanelWithTab = (root: typeof state.root, tid: string): string | null => {
        if (!root) return null;
        if (root.type === 'panel') {
          return root.tabs.includes(tid) ? root.id : null;
        }
        if (root.type === 'split') {
          return (
            findPanelWithTab(root.children[0], tid) ||
            findPanelWithTab(root.children[1], tid)
          );
        }
        return null;
      };

      const panelId = findPanelWithTab(state.root, tabId);
      if (panelId) {
        startDrag(tabId, panelId);
      }
    },
    [state.root, startDrag]
  );

  // Handle drag over (update drop zone indicator)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;

      if (!over) {
        updateDropZone(null, null);
        return;
      }

      // Extract panel ID from droppable ID
      const droppableId = over.id as string;
      if (droppableId.startsWith('panel-')) {
        const panelId = droppableId.replace('panel-', '');
        // Zone is calculated in the panel component based on mouse position
        // For now, default to center
        updateDropZone('center', panelId);
      }
    },
    [updateDropZone]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      endDrag();
    },
    [endDrag]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    endDrag();
  }, [endDrag]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        <DraggedTabOverlay tabId={dragState?.tabId ?? null} />
      </DragOverlay>
    </DndContext>
  );
};

export default DockingDndProvider;
