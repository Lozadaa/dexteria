/**
 * ViewGroupPanel - Tab group component
 * Optimized for drag performance:
 * - Geometry cached on dragstart
 * - Drop preview state is local (not in global store)
 * - RAF throttling on dragover
 * - Minimal overlay DOM
 */

import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLayoutStore, useLayoutActions, useIsGroupFocused, useDragState } from '../store';
import type { ViewGroup, ViewInstance, DropZone } from '../types';
import { detectDropZone, ZONE_CONFIG } from '../dropZones';

// ============================================================================
// Types
// ============================================================================

interface CachedGeometry {
  containerRect: DOMRect;
  tabBarRect: DOMRect | null;
  tabRects: DOMRect[];
}

interface LocalDropState {
  zone: DropZone | null;
  tabIndex?: number;
}

// ============================================================================
// Geometry Cache (per group)
// ============================================================================

const geometryCache = new Map<string, CachedGeometry>();

function measureGroupGeometry(
  groupId: string,
  containerEl: HTMLElement | null,
  tabBarEl: HTMLElement | null,
  tabRefs: Map<string, HTMLButtonElement>,
  viewIds: string[]
): CachedGeometry | null {
  if (!containerEl) return null;

  const containerRect = containerEl.getBoundingClientRect();
  const tabBarRect = tabBarEl?.getBoundingClientRect() ?? null;

  const tabRects: DOMRect[] = [];
  for (const viewId of viewIds) {
    const tabEl = tabRefs.get(viewId);
    if (tabEl) {
      tabRects.push(tabEl.getBoundingClientRect());
    }
  }

  const geometry: CachedGeometry = { containerRect, tabBarRect, tabRects };
  geometryCache.set(groupId, geometry);
  return geometry;
}

function clearGeometryCache() {
  geometryCache.clear();
}

// ============================================================================
// Props
// ============================================================================

interface ViewGroupPanelProps {
  groupId: string;
  group: ViewGroup;
  renderView: (view: ViewInstance, isActive: boolean) => React.ReactNode;
  getViewTitle: (view: ViewInstance) => string;
  getViewIcon?: (view: ViewInstance) => React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const ViewGroupPanel: React.FC<ViewGroupPanelProps> = ({
  groupId,
  group,
  renderView,
  getViewTitle,
  getViewIcon,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const isFocused = useIsGroupFocused(groupId);
  const allViews = useLayoutStore((state) => state.views);
  const dragState = useDragState();

  // Local drop preview state (not in global store)
  const [localDropState, setLocalDropState] = useState<LocalDropState>({ zone: null });

  const {
    activateView,
    closeView,
    focusGroup,
    startDrag,
    updateDrag,
    endDrag,
    moveView,
  } = useLayoutActions();

  // Check if this group is the current drag target (from global store)
  const isCurrentTarget = dragState?.currentTargetGroupId === groupId;

  // Compute views array from props and state
  const views = useMemo(
    () => group.viewIds.map((id) => allViews[id]).filter(Boolean),
    [group.viewIds, allViews]
  );

  const activeView = useMemo(
    () => views.find((v) => v.id === group.activeViewId) ?? views[0],
    [views, group.activeViewId]
  );

  // Clear local drop state when drag ends OR when this group is no longer the target
  useEffect(() => {
    if (!dragState || !isCurrentTarget) {
      setLocalDropState({ zone: null });
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [dragState, isCurrentTarget]);

  // Handle tab click
  const handleTabClick = useCallback(
    (viewId: string) => {
      activateView(viewId);
      focusGroup(groupId);
    },
    [activateView, focusGroup, groupId]
  );

  // Handle tab close
  const handleTabClose = useCallback(
    (e: React.MouseEvent, viewId: string) => {
      e.stopPropagation();
      closeView(viewId);
    },
    [closeView]
  );

  // Handle middle-click to close tab
  const handleTabMouseDown = useCallback(
    (e: React.MouseEvent, viewId: string) => {
      // Middle mouse button
      if (e.button === 1) {
        e.preventDefault();
        closeView(viewId);
      }
    },
    [closeView]
  );

  // Handle drag start - cache geometry here
  const handleDragStart = useCallback(
    (e: React.DragEvent, viewId: string) => {
      e.dataTransfer.setData('text/plain', viewId);
      e.dataTransfer.effectAllowed = 'move';

      // Cache geometry for this group
      measureGroupGeometry(
        groupId,
        containerRef.current,
        tabBarRef.current,
        tabRefs.current,
        group.viewIds
      );

      startDrag(viewId, groupId);
    },
    [startDrag, groupId, group.viewIds]
  );

  // Handle drag over with RAF throttling
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!dragState) return;

      // Mark this group as the current target (clears overlay on other groups)
      updateDrag(null, groupId);

      // Store mouse position
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      // Schedule RAF if not already scheduled
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;

          if (!lastMousePos.current) return;

          // Get cached geometry or measure if not cached
          let geometry = geometryCache.get(groupId);
          if (!geometry) {
            geometry = measureGroupGeometry(
              groupId,
              containerRef.current,
              tabBarRef.current,
              tabRefs.current,
              group.viewIds
            );
          }

          if (!geometry) return;

          const result = detectDropZone(
            geometry.containerRect,
            geometry.tabBarRect,
            geometry.tabRects,
            lastMousePos.current.x,
            lastMousePos.current.y
          );

          // Only update if changed
          setLocalDropState((prev) => {
            if (result) {
              if (prev.zone !== result.zone || prev.tabIndex !== result.tabIndex) {
                return { zone: result.zone, tabIndex: result.tabIndex };
              }
            } else if (prev.zone !== null) {
              return { zone: null };
            }
            return prev;
          });
        });
      }
    },
    [dragState, groupId, group.viewIds, updateDrag]
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (!dragState) {
        endDrag();
        return;
      }

      // Use local drop state for the drop target
      if (localDropState.zone) {
        moveView(dragState.viewId, {
          groupId,
          zone: localDropState.zone,
          tabIndex: localDropState.tabIndex,
        });
      } else {
        endDrag();
      }

      // Clear geometry cache after drop
      clearGeometryCache();
    },
    [dragState, localDropState, groupId, moveView, endDrag]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Only clear if leaving the container entirely
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setLocalDropState({ zone: null });
      }
    },
    []
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    endDrag();
    clearGeometryCache();
  }, [endDrag]);

  // Only show overlay if this group is the current target AND has a zone
  const showOverlay = isCurrentTarget && localDropState.zone !== null;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-background ${
        isFocused ? 'ring-1 ring-primary/50' : ''
      }`}
      onClick={() => focusGroup(groupId)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* Tab Bar */}
      <div
        ref={tabBarRef}
        role="tablist"
        aria-label="Panel tabs"
        className="flex items-center border-b border-border bg-muted/30 min-h-[36px] overflow-x-auto"
        style={{ height: ZONE_CONFIG.tabBarHeight }}
      >
        {views.map((view) => (
          <button
            key={view.id}
            ref={(el) => {
              if (el) tabRefs.current.set(view.id, el);
              else tabRefs.current.delete(view.id);
            }}
            role="tab"
            aria-selected={view.id === group.activeViewId}
            aria-controls={`tabpanel-${view.id}`}
            id={`tab-${view.id}`}
            draggable
            onDragStart={(e) => handleDragStart(e, view.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleTabClick(view.id)}
            onMouseDown={(e) => handleTabMouseDown(e, view.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
              transition-colors relative whitespace-nowrap
              ${
                view.id === group.activeViewId
                  ? 'text-foreground bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
          >
            {getViewIcon?.(view)}
            <span className="truncate max-w-[120px]">{getViewTitle(view)}</span>
            {view.isDirty && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
            <button
              onClick={(e) => handleTabClose(e, view.id)}
              className="ml-1 p-0.5 hover:bg-muted rounded opacity-60 hover:opacity-100"
              aria-label={`Close ${getViewTitle(view)}`}
            >
              <X size={12} />
            </button>
            {view.id === group.activeViewId && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-hidden relative"
        role="tabpanel"
        id={activeView ? `tabpanel-${activeView.id}` : undefined}
        aria-labelledby={activeView ? `tab-${activeView.id}` : undefined}
      >
        {activeView && renderView(activeView, true)}

        {/* Drop Zone Overlay - Minimal DOM, no transitions during drag */}
        {showOverlay && localDropState.zone && (
          <DropZoneOverlay zone={localDropState.zone} />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Drop Zone Overlay - Ultra minimal for performance
// ============================================================================

interface DropZoneOverlayProps {
  zone: DropZone;
}

const DropZoneOverlay: React.FC<DropZoneOverlayProps> = React.memo(({ zone }) => {
  const style = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '2px solid rgba(59, 130, 246, 0.5)',
      pointerEvents: 'none',
      // No transitions during drag for performance
    };

    switch (zone) {
      case 'top':
        return { ...base, top: 0, left: 0, right: 0, height: '50%' };
      case 'bottom':
        return { ...base, bottom: 0, left: 0, right: 0, height: '50%' };
      case 'left':
        return { ...base, top: 0, bottom: 0, left: 0, width: '50%' };
      case 'right':
        return { ...base, top: 0, bottom: 0, right: 0, width: '50%' };
      case 'center':
        return { ...base, top: 0, bottom: 0, left: 0, right: 0 };
    }
  }, [zone]);

  return <div style={style} />;
});

DropZoneOverlay.displayName = 'DropZoneOverlay';

export default ViewGroupPanel;
