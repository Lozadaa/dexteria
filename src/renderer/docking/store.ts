/**
 * Dexteria Layout & View System
 * Zustand Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  LayoutState,
  ViewType,
  DropTarget,
  OpenTarget,
  TreePath,
  DragState,
} from './types';
import {
  createWelcomeState,
  computeCloseView,
  computeMoveView,
  computeOpenView,
  computeResizeSplit,
  computeFocusGroup,
  activateView,
  computeSetViewDirty,
  computeUpdateViewParams,
} from './reducers';
import { assertInvariants } from './normalize';

// ============================================================================
// Store Interface
// ============================================================================

interface LayoutStore extends LayoutState {
  // Drag state
  dragState: DragState | null;

  // View operations
  openView: (
    viewType: ViewType,
    params?: Record<string, unknown>,
    target?: OpenTarget
  ) => void;
  closeView: (viewId: string) => void;
  activateView: (viewId: string) => void;
  moveView: (viewId: string, target: DropTarget) => void;
  setViewDirty: (viewId: string, isDirty: boolean) => void;
  updateViewParams: (viewId: string, params: Record<string, unknown>) => void;

  // Split operations
  resizeSplit: (path: TreePath, ratio: number) => void;

  // Group operations
  focusGroup: (groupId: string) => void;

  // Drag operations
  startDrag: (viewId: string, sourceGroupId: string) => void;
  updateDrag: (
    zone: DragState['currentDropZone'],
    targetGroupId: string | null
  ) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // Layout operations
  setState: (state: LayoutState) => void;
  resetLayout: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useLayoutStore = create<LayoutStore>()(
  devtools(
    (set) => ({
      // Initial state
      ...createWelcomeState(),
      dragState: null,

      // View operations
      openView: (viewType, params = {}, target) => {
        set((state) => {
          const newState = computeOpenView(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewType,
            params,
            target
          );
          assertInvariants(newState, 'openView');
          return newState;
        });
      },

      closeView: (viewId) => {
        set((state) => {
          const newState = computeCloseView(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewId
          );
          assertInvariants(newState, 'closeView');
          return newState;
        });
      },

      activateView: (viewId) => {
        set((state) => {
          const newState = activateView(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewId
          );
          return newState;
        });
      },

      moveView: (viewId, target) => {
        set((state) => {
          const newState = computeMoveView(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewId,
            target
          );
          assertInvariants(newState, 'moveView');
          return { ...newState, dragState: null };
        });
      },

      setViewDirty: (viewId, isDirty) => {
        set((state) => {
          const newState = computeSetViewDirty(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewId,
            isDirty
          );
          return newState;
        });
      },

      updateViewParams: (viewId, params) => {
        set((state) => {
          const newState = computeUpdateViewParams(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            viewId,
            params
          );
          return newState;
        });
      },

      // Split operations
      resizeSplit: (path, ratio) => {
        set((state) => {
          const newState = computeResizeSplit(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            path,
            ratio
          );
          return newState;
        });
      },

      // Group operations
      focusGroup: (groupId) => {
        set((state) => {
          const newState = computeFocusGroup(
            {
              tree: state.tree,
              groups: state.groups,
              views: state.views,
              activeGroupId: state.activeGroupId,
            },
            groupId
          );
          return newState;
        });
      },

      // Drag operations - minimal global state, zone preview is local to components
      startDrag: (viewId, sourceGroupId) => {
        set({
          dragState: {
            viewId,
            sourceGroupId,
            currentDropZone: null,
            currentTargetGroupId: null,
          },
        });
      },

      updateDrag: (_zone, targetGroupId) => {
        // Only update targetGroupId (cheap), zone is local to component
        set((state) => {
          if (!state.dragState) return state;
          if (state.dragState.currentTargetGroupId === targetGroupId) return state;
          return {
            dragState: {
              ...state.dragState,
              currentTargetGroupId: targetGroupId,
            },
          };
        });
      },

      endDrag: () => {
        set({ dragState: null });
      },

      cancelDrag: () => {
        set({ dragState: null });
      },

      // Layout operations
      setState: (newState) => {
        assertInvariants(newState, 'setState');
        set(newState);
      },

      resetLayout: () => {
        set(createWelcomeState());
      },
    }),
    { name: 'layout-store' }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get a specific view by ID
 */
export function useView(viewId: string) {
  return useLayoutStore((state) => state.views[viewId] ?? null);
}

/**
 * Get a specific group by ID
 */
export function useGroup(groupId: string) {
  return useLayoutStore((state) => state.groups[groupId] ?? null);
}

/**
 * Check if a group is focused
 */
export function useIsGroupFocused(groupId: string) {
  return useLayoutStore((state) => state.activeGroupId === groupId);
}

/**
 * Get the active group ID
 */
export function useActiveGroupId() {
  return useLayoutStore((state) => state.activeGroupId);
}

/**
 * Get all views in a group
 * Uses shallow comparison to prevent infinite re-renders from array creation
 */
export function useGroupViews(groupId: string) {
  return useLayoutStore(
    useShallow((state) => {
      const group = state.groups[groupId];
      if (!group) return [];
      return group.viewIds.map((id) => state.views[id]).filter(Boolean);
    })
  );
}

/**
 * Get the drag state
 */
export function useDragState() {
  return useLayoutStore((state) => state.dragState);
}

/**
 * Check if currently dragging
 */
export function useIsDragging() {
  return useLayoutStore((state) => state.dragState !== null);
}

/**
 * Get store actions without triggering re-renders on unrelated state changes
 * Uses shallow comparison to prevent unnecessary re-renders
 */
export function useLayoutActions() {
  return useLayoutStore(
    useShallow((state) => ({
      openView: state.openView,
      closeView: state.closeView,
      activateView: state.activateView,
      moveView: state.moveView,
      setViewDirty: state.setViewDirty,
      updateViewParams: state.updateViewParams,
      resizeSplit: state.resizeSplit,
      focusGroup: state.focusGroup,
      startDrag: state.startDrag,
      updateDrag: state.updateDrag,
      endDrag: state.endDrag,
      cancelDrag: state.cancelDrag,
      setState: state.setState,
      resetLayout: state.resetLayout,
    }))
  );
}

/**
 * Find which group contains a view
 */
export function findGroupContainingView(
  groups: Record<string, { viewIds: string[] }>,
  viewId: string
): string | null {
  for (const [groupId, group] of Object.entries(groups)) {
    if (group.viewIds.includes(viewId)) return groupId;
  }
  return null;
}
