/**
 * Docking Context
 * Core state management for the docking system
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  DockingState,
  DockingContextValue,
  DragState,
  DropZone,
  OpenTabOptions,
  TabDefinition,
  PanelNode,
} from './types';
import { isPanelNode } from './types';
import {
  findNode,
  findPanelWithTab,
  getAllPanels,
  addTabToPanel,
  removeTabFromPanel,
  moveTab as moveTabInTree,
  splitPanel as splitPanelInTree,
  removeEmptyPanel,
  updateSplitSizes,
  getDirectionFromZone,
  createPanelNode,
} from './treeOperations';
import { loadLayout, debouncedSaveLayout, clearLayout } from './persistence';
import { createDefaultLayout, COMPONENT_KEYS } from './defaultLayout';

// ============================================================================
// State Types
// ============================================================================

interface InternalState {
  docking: DockingState;
  dragState: DragState | null;
  focusedPanelId: string | null;
}

// ============================================================================
// Actions
// ============================================================================

type DockingAction =
  | { type: 'SET_STATE'; payload: DockingState }
  | { type: 'OPEN_TAB'; payload: { tab: TabDefinition; panelId: string; position?: number } }
  | { type: 'CLOSE_TAB'; payload: { tabId: string } }
  | { type: 'FOCUS_TAB'; payload: { tabId: string } }
  | { type: 'UPDATE_TAB_PROPS'; payload: { tabId: string; props: Record<string, unknown> } }
  | { type: 'FOCUS_PANEL'; payload: { panelId: string } }
  | { type: 'MOVE_TAB'; payload: { tabId: string; sourcePanelId: string; targetPanelId: string; position?: number } }
  | { type: 'SPLIT_PANEL'; payload: { panelId: string; direction: 'horizontal' | 'vertical'; dropZone: DropZone; tabId?: string; sourcePanelId?: string } }
  | { type: 'UPDATE_SIZES'; payload: { splitId: string; sizes: [number, number] } }
  | { type: 'START_DRAG'; payload: { tabId: string; panelId: string } }
  | { type: 'UPDATE_DROP_ZONE'; payload: { zone: DropZone | null; panelId: string | null } }
  | { type: 'END_DRAG' }
  | { type: 'RESET_LAYOUT' };

// ============================================================================
// Reducer
// ============================================================================

function dockingReducer(state: InternalState, action: DockingAction): InternalState {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        docking: action.payload,
      };

    case 'OPEN_TAB': {
      const { tab, panelId, position } = action.payload;
      const newRoot = addTabToPanel(state.docking.root, panelId, tab.id, position);
      return {
        ...state,
        docking: {
          root: newRoot,
          tabs: { ...state.docking.tabs, [tab.id]: tab },
        },
        focusedPanelId: panelId,
      };
    }

    case 'CLOSE_TAB': {
      const { tabId } = action.payload;
      const panel = findPanelWithTab(state.docking.root, tabId);
      if (!panel) return state;

      let newRoot = removeTabFromPanel(state.docking.root, panel.id, tabId);

      // Check if panel is now empty and should be removed
      const updatedPanel = newRoot ? findNode(newRoot, panel.id) : null;
      if (updatedPanel && isPanelNode(updatedPanel) && updatedPanel.tabs.length === 0) {
        newRoot = removeEmptyPanel(newRoot, panel.id);
      }

      // Remove tab definition
      const { [tabId]: removed, ...remainingTabs } = state.docking.tabs;

      return {
        ...state,
        docking: {
          root: newRoot,
          tabs: remainingTabs,
        },
      };
    }

    case 'FOCUS_TAB': {
      const { tabId } = action.payload;
      const panel = findPanelWithTab(state.docking.root, tabId);
      if (!panel) return state;

      const newRoot = state.docking.root
        ? {
            ...state.docking.root,
          }
        : null;

      // Update the panel's activeTabId
      const updateActiveTab = (node: typeof newRoot): typeof newRoot => {
        if (!node) return null;
        if (node.id === panel.id && isPanelNode(node)) {
          return { ...node, activeTabId: tabId };
        }
        if (node.type === 'split') {
          return {
            ...node,
            children: [
              updateActiveTab(node.children[0])!,
              updateActiveTab(node.children[1])!,
            ],
          };
        }
        return node;
      };

      return {
        ...state,
        docking: {
          ...state.docking,
          root: updateActiveTab(newRoot),
        },
        focusedPanelId: panel.id,
      };
    }

    case 'UPDATE_TAB_PROPS': {
      const { tabId, props } = action.payload;
      const tab = state.docking.tabs[tabId];
      if (!tab) return state;

      return {
        ...state,
        docking: {
          ...state.docking,
          tabs: {
            ...state.docking.tabs,
            [tabId]: {
              ...tab,
              props: { ...tab.props, ...props },
            },
          },
        },
      };
    }

    case 'FOCUS_PANEL': {
      return {
        ...state,
        focusedPanelId: action.payload.panelId,
      };
    }

    case 'MOVE_TAB': {
      const { tabId, sourcePanelId, targetPanelId, position } = action.payload;

      let newRoot = moveTabInTree(state.docking.root, tabId, sourcePanelId, targetPanelId, position);

      // Clean up empty source panel if needed
      const sourcePanel = newRoot ? findNode(newRoot, sourcePanelId) : null;
      if (sourcePanel && isPanelNode(sourcePanel) && sourcePanel.tabs.length === 0) {
        newRoot = removeEmptyPanel(newRoot, sourcePanelId);
      }

      return {
        ...state,
        docking: {
          ...state.docking,
          root: newRoot,
        },
        focusedPanelId: targetPanelId,
      };
    }

    case 'SPLIT_PANEL': {
      const { panelId, direction, dropZone, tabId, sourcePanelId } = action.payload;

      const { root: newRoot, newPanelId } = splitPanelInTree(
        state.docking.root,
        panelId,
        direction,
        dropZone
      );

      let finalRoot = newRoot;

      // If a tabId was provided, move that tab to the new panel
      if (tabId && finalRoot) {
        // Use sourcePanelId if provided (for drag from different panel), otherwise use panelId
        const actualSourcePanelId = sourcePanelId ?? panelId;
        finalRoot = moveTabInTree(finalRoot, tabId, actualSourcePanelId, newPanelId);

        // Clean up source panel if empty after move
        const sourcePanel = findNode(finalRoot, actualSourcePanelId);
        if (sourcePanel && isPanelNode(sourcePanel) && sourcePanel.tabs.length === 0) {
          finalRoot = removeEmptyPanel(finalRoot, actualSourcePanelId);
        }
      }

      return {
        ...state,
        docking: {
          ...state.docking,
          root: finalRoot,
        },
        focusedPanelId: newPanelId,
      };
    }

    case 'UPDATE_SIZES': {
      const { splitId, sizes } = action.payload;
      const newRoot = updateSplitSizes(state.docking.root, splitId, sizes);
      return {
        ...state,
        docking: {
          ...state.docking,
          root: newRoot,
        },
      };
    }

    case 'START_DRAG': {
      const { tabId, panelId } = action.payload;
      return {
        ...state,
        dragState: {
          tabId,
          sourcePanelId: panelId,
          currentDropZone: null,
          currentDropPanelId: null,
        },
      };
    }

    case 'UPDATE_DROP_ZONE': {
      if (!state.dragState) return state;
      return {
        ...state,
        dragState: {
          ...state.dragState,
          currentDropZone: action.payload.zone,
          currentDropPanelId: action.payload.panelId,
        },
      };
    }

    case 'END_DRAG': {
      return {
        ...state,
        dragState: null,
      };
    }

    case 'RESET_LAYOUT': {
      clearLayout();
      return {
        ...state,
        docking: createDefaultLayout(),
        focusedPanelId: null,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const DockingContext = createContext<DockingContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface DockingProviderProps {
  children: React.ReactNode;
}

export const DockingProvider: React.FC<DockingProviderProps> = ({ children }) => {
  // Initialize state
  const initialState: InternalState = useMemo(() => {
    const saved = loadLayout();
    return {
      docking: saved ?? createDefaultLayout(),
      dragState: null,
      focusedPanelId: null,
    };
  }, []);

  const [state, dispatch] = useReducer(dockingReducer, initialState);

  // Persist layout changes
  useEffect(() => {
    debouncedSaveLayout(state.docking);
  }, [state.docking]);

  // ============================================================================
  // Tab Operations
  // ============================================================================

  const openTab = useCallback(
    (componentKey: string, options: OpenTabOptions = {}): string => {
      const { panelId, position, focus = true, props } = options;

      // Check for singleton
      const existingTab = Object.values(state.docking.tabs).find(
        (t) => t.componentKey === componentKey && t.singleton
      );

      if (existingTab) {
        // Focus existing singleton
        if (focus) {
          dispatch({ type: 'FOCUS_TAB', payload: { tabId: existingTab.id } });
        }
        return existingTab.id;
      }

      // Create new tab
      const tabId = `tab-${uuidv4()}`;
      const tab: TabDefinition = {
        id: tabId,
        title: getTitleForComponent(componentKey),
        icon: getIconForComponent(componentKey),
        componentKey,
        closable: componentKey !== COMPONENT_KEYS.BOARD,
        singleton: componentKey === COMPONENT_KEYS.BOARD || componentKey === COMPONENT_KEYS.TASK_RUNNER,
        props,
      };

      // Determine target panel
      let targetPanelId = panelId;
      if (!targetPanelId) {
        // Use focused panel or first panel
        targetPanelId = state.focusedPanelId;
        if (!targetPanelId) {
          const panels = getAllPanels(state.docking.root);
          if (panels.length > 0) {
            targetPanelId = panels[0].id;
          }
        }
      }

      // If still no panel, create one
      if (!targetPanelId) {
        const newPanel = createPanelNode([tabId], tabId);
        dispatch({
          type: 'SET_STATE',
          payload: {
            root: newPanel,
            tabs: { ...state.docking.tabs, [tabId]: tab },
          },
        });
        return tabId;
      }

      // Handle split if position is a border
      if (options.position && options.position !== 'center') {
        const direction = getDirectionFromZone(options.position);
        dispatch({
          type: 'SPLIT_PANEL',
          payload: {
            panelId: targetPanelId,
            direction,
            dropZone: options.position,
          },
        });

        // The split created a new panel, find it
        const panels = getAllPanels(state.docking.root);
        const newestPanel = panels[panels.length - 1];
        targetPanelId = newestPanel?.id ?? targetPanelId;
      }

      dispatch({
        type: 'OPEN_TAB',
        payload: { tab, panelId: targetPanelId, position },
      });

      return tabId;
    },
    [state.docking, state.focusedPanelId]
  );

  const closeTab = useCallback((tabId: string) => {
    const tab = state.docking.tabs[tabId];
    if (!tab || !tab.closable) return;

    dispatch({ type: 'CLOSE_TAB', payload: { tabId } });
  }, [state.docking.tabs]);

  const focusTab = useCallback((tabId: string) => {
    dispatch({ type: 'FOCUS_TAB', payload: { tabId } });
  }, []);

  const updateTabProps = useCallback((tabId: string, props: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_TAB_PROPS', payload: { tabId, props } });
  }, []);

  // ============================================================================
  // Panel Operations
  // ============================================================================

  const focusPanel = useCallback((panelId: string) => {
    dispatch({ type: 'FOCUS_PANEL', payload: { panelId } });
  }, []);

  const splitPanel = useCallback(
    (panelId: string, direction: 'horizontal' | 'vertical', tabId?: string): string => {
      const dropZone: DropZone = direction === 'horizontal' ? 'right' : 'bottom';
      dispatch({
        type: 'SPLIT_PANEL',
        payload: { panelId, direction, dropZone, tabId },
      });

      // Find the new panel ID
      const panels = getAllPanels(state.docking.root);
      const newestPanel = panels[panels.length - 1];
      return newestPanel?.id ?? '';
    },
    [state.docking.root]
  );

  const mergePanel = useCallback((panelId: string) => {
    const panel = findNode(state.docking.root, panelId);
    if (!panel || !isPanelNode(panel)) return;

    // Move all tabs to sibling panel before removing
    const panels = getAllPanels(state.docking.root);
    const siblingPanel = panels.find((p) => p.id !== panelId);

    if (siblingPanel && panel.tabs.length > 0) {
      // Move each tab
      for (const tabId of panel.tabs) {
        dispatch({
          type: 'MOVE_TAB',
          payload: {
            tabId,
            sourcePanelId: panelId,
            targetPanelId: siblingPanel.id,
          },
        });
      }
    }
  }, [state.docking.root]);

  // ============================================================================
  // Drag Operations
  // ============================================================================

  const startDrag = useCallback((tabId: string, panelId: string) => {
    dispatch({ type: 'START_DRAG', payload: { tabId, panelId } });
  }, []);

  const updateDropZone = useCallback((zone: DropZone | null, panelId: string | null) => {
    dispatch({ type: 'UPDATE_DROP_ZONE', payload: { zone, panelId } });
  }, []);

  const endDrag = useCallback(() => {
    const { dragState, docking } = state;

    if (dragState && dragState.currentDropZone && dragState.currentDropPanelId) {
      const { tabId, sourcePanelId, currentDropZone, currentDropPanelId } = dragState;

      // Get source panel info to check if it's a single-tab panel
      const sourcePanel = findNode(docking.root, sourcePanelId);
      const isSingleTabPanel = sourcePanel && isPanelNode(sourcePanel) && sourcePanel.tabs.length === 1;

      if (currentDropZone === 'center') {
        // Move to existing panel
        if (sourcePanelId !== currentDropPanelId) {
          dispatch({
            type: 'MOVE_TAB',
            payload: {
              tabId,
              sourcePanelId,
              targetPanelId: currentDropPanelId,
            },
          });
        }
      } else {
        // Split the target panel and move tab from source panel
        // Skip if dropping on edge of same panel with single tab (no-op)
        if (sourcePanelId === currentDropPanelId && isSingleTabPanel) {
          dispatch({ type: 'END_DRAG' });
          return;
        }

        const direction = getDirectionFromZone(currentDropZone);
        dispatch({
          type: 'SPLIT_PANEL',
          payload: {
            panelId: currentDropPanelId,
            direction,
            dropZone: currentDropZone,
            tabId,
            sourcePanelId, // Pass the actual source panel for correct tab movement
          },
        });
      }
    }

    dispatch({ type: 'END_DRAG' });
  }, [state]);

  // ============================================================================
  // Layout Operations
  // ============================================================================

  const updateSizes = useCallback((splitId: string, sizes: [number, number]) => {
    dispatch({ type: 'UPDATE_SIZES', payload: { splitId, sizes } });
  }, []);

  const resetLayout = useCallback(() => {
    dispatch({ type: 'RESET_LAYOUT' });
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: DockingContextValue = useMemo(
    () => ({
      state: state.docking,
      dragState: state.dragState,
      focusedPanelId: state.focusedPanelId,
      openTab,
      closeTab,
      focusTab,
      updateTabProps,
      focusPanel,
      splitPanel,
      mergePanel,
      startDrag,
      updateDropZone,
      endDrag,
      updateSizes,
      resetLayout,
    }),
    [
      state.docking,
      state.dragState,
      state.focusedPanelId,
      openTab,
      closeTab,
      focusTab,
      updateTabProps,
      focusPanel,
      splitPanel,
      mergePanel,
      startDrag,
      updateDropZone,
      endDrag,
      updateSizes,
      resetLayout,
    ]
  );

  return <DockingContext.Provider value={contextValue}>{children}</DockingContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export function useDocking(): DockingContextValue {
  const context = useContext(DockingContext);
  if (!context) {
    throw new Error('useDocking must be used within a DockingProvider');
  }
  return context;
}

// ============================================================================
// Helpers
// ============================================================================

function getTitleForComponent(componentKey: string): string {
  switch (componentKey) {
    case COMPONENT_KEYS.BOARD:
      return 'Board';
    case COMPONENT_KEYS.CHAT:
      return 'Chat';
    case COMPONENT_KEYS.SETTINGS:
      return 'Settings';
    case COMPONENT_KEYS.THEME_EDITOR:
      return 'Theme Editor';
    case COMPONENT_KEYS.TASK_DETAIL:
      return 'Task';
    case COMPONENT_KEYS.TASK_RUNNER:
      return 'Task Runner';
    default:
      return componentKey;
  }
}

function getIconForComponent(componentKey: string): string | undefined {
  switch (componentKey) {
    case COMPONENT_KEYS.BOARD:
      return 'LayoutGrid';
    case COMPONENT_KEYS.CHAT:
      return 'MessageSquare';
    case COMPONENT_KEYS.SETTINGS:
      return 'Settings';
    case COMPONENT_KEYS.THEME_EDITOR:
      return 'Palette';
    case COMPONENT_KEYS.TASK_DETAIL:
      return 'FileText';
    case COMPONENT_KEYS.TASK_RUNNER:
      return 'Play';
    default:
      return undefined;
  }
}
