/**
 * Extension Points Context
 *
 * Provides centralized state for plugin UI contributions.
 * Loads contributions from main process and makes them available to components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  UIContributions,
  ExtensionSlotId,
  PluginSettingsTabContribution,
  PluginDockingPanelContribution,
  PluginSlotContribution,
} from '../../shared/types';

// ============================================
// Types
// ============================================

export interface SettingsTabContribution extends PluginSettingsTabContribution {
  pluginId: string;
  pluginPath: string;
}

export interface DockingPanelContribution extends PluginDockingPanelContribution {
  pluginId: string;
  pluginPath: string;
}

export interface SlotContribution extends PluginSlotContribution {
  pluginId: string;
  pluginPath: string;
}

interface ExtensionPointsContextValue {
  /** All settings tab contributions from plugins */
  settingsTabs: SettingsTabContribution[];

  /** All docking panel contributions from plugins */
  dockingPanels: DockingPanelContribution[];

  /** Get slot contributions for a specific slot ID */
  getSlotContributions: (slotId: ExtensionSlotId) => SlotContribution[];

  /** Whether contributions are still loading */
  loading: boolean;

  /** Refresh contributions from main process */
  refresh: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const ExtensionPointsContext = createContext<ExtensionPointsContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface ExtensionPointsProviderProps {
  children: React.ReactNode;
}

export const ExtensionPointsProvider: React.FC<ExtensionPointsProviderProps> = ({ children }) => {
  const [contributions, setContributions] = useState<UIContributions | null>(null);
  const [loading, setLoading] = useState(true);

  // Load contributions from main process
  const loadContributions = useCallback(async () => {
    try {
      const data = await window.dexteria?.plugin?.getUIContributions?.();
      if (data) {
        setContributions(data as UIContributions);
      }
    } catch (err) {
      console.error('[ExtensionPoints] Failed to load UI contributions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  // Memoized values
  const settingsTabs = useMemo<SettingsTabContribution[]>(() => {
    return contributions?.settingsTabs ?? [];
  }, [contributions]);

  const dockingPanels = useMemo<DockingPanelContribution[]>(() => {
    return contributions?.dockingPanels ?? [];
  }, [contributions]);

  // Get contributions for a specific slot
  const getSlotContributions = useCallback(
    (slotId: ExtensionSlotId): SlotContribution[] => {
      if (!contributions?.slots) return [];
      return (contributions.slots[slotId] ?? []) as SlotContribution[];
    },
    [contributions]
  );

  const value: ExtensionPointsContextValue = useMemo(
    () => ({
      settingsTabs,
      dockingPanels,
      getSlotContributions,
      loading,
      refresh: loadContributions,
    }),
    [settingsTabs, dockingPanels, getSlotContributions, loading, loadContributions]
  );

  return (
    <ExtensionPointsContext.Provider value={value}>
      {children}
    </ExtensionPointsContext.Provider>
  );
};

// ============================================
// Hook
// ============================================

export function useExtensionPoints(): ExtensionPointsContextValue {
  const context = useContext(ExtensionPointsContext);
  if (!context) {
    throw new Error('useExtensionPoints must be used within an ExtensionPointsProvider');
  }
  return context;
}

/**
 * Hook to get contributions for a specific slot
 */
export function useSlotContributions(slotId: ExtensionSlotId): SlotContribution[] {
  const { getSlotContributions } = useExtensionPoints();
  return getSlotContributions(slotId);
}

/**
 * Hook to get settings tab contributions
 */
export function useSettingsTabs(): SettingsTabContribution[] {
  const { settingsTabs } = useExtensionPoints();
  return settingsTabs;
}

/**
 * Hook to get docking panel contributions
 */
export function useDockingPanels(): DockingPanelContribution[] {
  const { dockingPanels } = useExtensionPoints();
  return dockingPanels;
}
