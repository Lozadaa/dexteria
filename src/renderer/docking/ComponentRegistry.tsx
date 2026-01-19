/**
 * Component Registry
 * Maps component keys to React components and manages mounted instances
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentDefinition, ComponentRegistryValue } from './types';
import { COMPONENT_KEYS } from './defaultLayout';

// ============================================================================
// Context
// ============================================================================

const ComponentRegistryContext = createContext<ComponentRegistryValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ComponentRegistryProviderProps {
  children: React.ReactNode;
  defaultComponents?: ComponentDefinition[];
}

export const ComponentRegistryProvider: React.FC<ComponentRegistryProviderProps> = ({
  children,
  defaultComponents = [],
}) => {
  const [components, setComponents] = useState<Map<string, ComponentDefinition>>(() => {
    const map = new Map<string, ComponentDefinition>();
    for (const def of defaultComponents) {
      map.set(def.key, def);
    }
    return map;
  });

  const register = useCallback((definition: ComponentDefinition) => {
    setComponents((prev) => {
      const next = new Map(prev);
      next.set(definition.key, definition);
      return next;
    });
  }, []);

  const unregister = useCallback((key: string) => {
    setComponents((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const get = useCallback(
    (key: string) => components.get(key),
    [components]
  );

  const getAll = useCallback(() => Array.from(components.values()), [components]);

  const value: ComponentRegistryValue = useMemo(
    () => ({
      components,
      register,
      unregister,
      get,
      getAll,
    }),
    [components, register, unregister, get, getAll]
  );

  return (
    <ComponentRegistryContext.Provider value={value}>
      {children}
    </ComponentRegistryContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useComponentRegistry(): ComponentRegistryValue {
  const context = useContext(ComponentRegistryContext);
  if (!context) {
    throw new Error('useComponentRegistry must be used within a ComponentRegistryProvider');
  }
  return context;
}

// ============================================================================
// Component Instances Manager
// Keeps components mounted to preserve their state
// ============================================================================

interface MountedInstance {
  tabId: string;
  componentKey: string;
  props?: Record<string, unknown>;
}

interface ComponentInstancesContextValue {
  instances: Map<string, MountedInstance>;
  mountInstance: (tabId: string, componentKey: string, props?: Record<string, unknown>) => void;
  unmountInstance: (tabId: string) => void;
  updateInstanceProps: (tabId: string, props: Record<string, unknown>) => void;
}

const ComponentInstancesContext = createContext<ComponentInstancesContextValue | null>(null);

interface ComponentInstancesProviderProps {
  children: React.ReactNode;
}

export const ComponentInstancesProvider: React.FC<ComponentInstancesProviderProps> = ({
  children,
}) => {
  const [instances, setInstances] = useState<Map<string, MountedInstance>>(new Map());

  const mountInstance = useCallback(
    (tabId: string, componentKey: string, props?: Record<string, unknown>) => {
      setInstances((prev) => {
        if (prev.has(tabId)) return prev;
        const next = new Map(prev);
        next.set(tabId, { tabId, componentKey, props });
        return next;
      });
    },
    []
  );

  const unmountInstance = useCallback((tabId: string) => {
    setInstances((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const updateInstanceProps = useCallback(
    (tabId: string, props: Record<string, unknown>) => {
      setInstances((prev) => {
        const instance = prev.get(tabId);
        if (!instance) return prev;
        const next = new Map(prev);
        next.set(tabId, { ...instance, props: { ...instance.props, ...props } });
        return next;
      });
    },
    []
  );

  const value: ComponentInstancesContextValue = useMemo(
    () => ({
      instances,
      mountInstance,
      unmountInstance,
      updateInstanceProps,
    }),
    [instances, mountInstance, unmountInstance, updateInstanceProps]
  );

  return (
    <ComponentInstancesContext.Provider value={value}>
      {children}
    </ComponentInstancesContext.Provider>
  );
};

export function useComponentInstances(): ComponentInstancesContextValue {
  const context = useContext(ComponentInstancesContext);
  if (!context) {
    throw new Error('useComponentInstances must be used within a ComponentInstancesProvider');
  }
  return context;
}

// ============================================================================
// Tab Content Renderer
// Renders component for a specific tab, using portal to keep state
// ============================================================================

interface TabContentRendererProps {
  tabId: string;
  componentKey: string;
  props?: Record<string, unknown>;
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  tabId,
  componentKey,
  props,
  isActive,
  containerRef,
}) => {
  const { get } = useComponentRegistry();
  const { mountInstance, instances } = useComponentInstances();

  // Ensure instance is mounted
  React.useEffect(() => {
    mountInstance(tabId, componentKey, props);
  }, [tabId, componentKey, props, mountInstance]);

  const componentDef = get(componentKey);

  if (!componentDef || !containerRef.current) {
    return null;
  }

  const Component = componentDef.component;

  // Render through portal to the container
  return createPortal(
    <div
      data-tab-id={tabId}
      className={`absolute inset-0 ${isActive ? '' : 'invisible pointer-events-none'}`}
    >
      <Component {...(props || {})} tabId={tabId} />
    </div>,
    containerRef.current
  );
};

// ============================================================================
// All Instances Renderer
// Renders all mounted instances (keeps them alive for state preservation)
// ============================================================================

interface AllInstancesRendererProps {
  activeTabIds: Set<string>;
  containerRefs: Map<string, React.RefObject<HTMLDivElement | null>>;
  tabPanelMap: Map<string, string>; // tabId -> panelId
}

export const AllInstancesRenderer: React.FC<AllInstancesRendererProps> = ({
  activeTabIds,
  containerRefs,
  tabPanelMap,
}) => {
  const { instances } = useComponentInstances();
  const { get } = useComponentRegistry();

  return (
    <>
      {Array.from(instances.values()).map((instance) => {
        const panelId = tabPanelMap.get(instance.tabId);
        const containerRef = panelId ? containerRefs.get(panelId) : null;
        const componentDef = get(instance.componentKey);

        if (!componentDef || !containerRef?.current) {
          return null;
        }

        const isActive = activeTabIds.has(instance.tabId);
        const Component = componentDef.component;

        return createPortal(
          <div
            key={instance.tabId}
            data-tab-id={instance.tabId}
            className={`absolute inset-0 ${isActive ? '' : 'invisible pointer-events-none'}`}
          >
            <Component {...(instance.props || {})} tabId={instance.tabId} />
          </div>,
          containerRef.current
        );
      })}
    </>
  );
};

// ============================================================================
// Default Component Placeholder
// ============================================================================

interface PlaceholderComponentProps {
  componentKey: string;
}

export const PlaceholderComponent: React.FC<PlaceholderComponentProps> = ({ componentKey }) => {
  return (
    <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground">
      <div className="text-center">
        <p className="text-lg font-medium">Component not found</p>
        <p className="text-sm mt-1">Key: {componentKey}</p>
      </div>
    </div>
  );
};
