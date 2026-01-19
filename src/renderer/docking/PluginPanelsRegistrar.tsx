/**
 * Plugin Panels Registrar
 *
 * Dynamically registers plugin docking panels in the component registry.
 * This component sits inside both ExtensionPointsProvider and ComponentRegistryProvider,
 * bridging the gap between plugin contributions and the docking system.
 */

import { useEffect, useRef } from 'react';
import { useDockingPanels, type DockingPanelContribution } from '../contexts/ExtensionPointsContext';
import { useComponentRegistry } from './ComponentRegistry';
import { createPluginPanelDefinition } from './DockingComponents';

/**
 * Component that registers plugin docking panels in the component registry.
 * Should be rendered inside both ExtensionPointsProvider and ComponentRegistryProvider.
 */
export const PluginPanelsRegistrar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dockingPanels = useDockingPanels();
  const { register, unregister, get } = useComponentRegistry();

  // Track registered panel keys to clean up when plugins are removed
  const registeredKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newKeys = new Set<string>();

    // Register all current plugin panels
    for (const panel of dockingPanels) {
      const componentKey = `plugin:${panel.pluginId}:${panel.id}`;
      newKeys.add(componentKey);

      // Only register if not already registered
      if (!get(componentKey)) {
        const definition = createPluginPanelDefinition(panel);
        register(definition);
        console.log(`[PluginPanelsRegistrar] Registered plugin panel: ${componentKey}`);
      }
    }

    // Unregister panels that are no longer in the list
    for (const oldKey of registeredKeysRef.current) {
      if (!newKeys.has(oldKey)) {
        unregister(oldKey);
        console.log(`[PluginPanelsRegistrar] Unregistered plugin panel: ${oldKey}`);
      }
    }

    // Update tracked keys
    registeredKeysRef.current = newKeys;

    // Cleanup on unmount
    return () => {
      for (const key of registeredKeysRef.current) {
        unregister(key);
      }
      registeredKeysRef.current.clear();
    };
  }, [dockingPanels, register, unregister, get]);

  return <>{children}</>;
};

export default PluginPanelsRegistrar;
