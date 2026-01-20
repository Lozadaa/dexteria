/**
 * ComponentRegistry - Maps view types to React components
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ViewType, ViewInstance } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ViewComponentProps {
  viewId: string;
  viewKey: string;
  params: Record<string, unknown>;
  isActive: boolean;
}

export interface ViewTypeDefinition {
  viewType: ViewType;
  component: React.ComponentType<ViewComponentProps>;
  title: string | ((params: Record<string, unknown>) => string);
  icon?: React.ComponentType<{ size?: number }>;
  closable?: boolean;
}

// ============================================================================
// Context
// ============================================================================

interface ComponentRegistryContextValue {
  definitions: Map<ViewType, ViewTypeDefinition>;
  register: (definition: ViewTypeDefinition) => void;
  unregister: (viewType: ViewType) => void;
  get: (viewType: ViewType) => ViewTypeDefinition | undefined;
  getTitle: (view: ViewInstance) => string;
  getIcon: (view: ViewInstance) => React.ReactNode;
  renderView: (view: ViewInstance, isActive: boolean) => React.ReactNode;
}

const ComponentRegistryContext = createContext<ComponentRegistryContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ComponentRegistryProviderProps {
  children: React.ReactNode;
  definitions?: ViewTypeDefinition[];
}

export const ComponentRegistryProvider: React.FC<ComponentRegistryProviderProps> = ({
  children,
  definitions: initialDefinitions = [],
}) => {
  const [definitions, setDefinitions] = React.useState<Map<ViewType, ViewTypeDefinition>>(() => {
    const map = new Map<ViewType, ViewTypeDefinition>();
    for (const def of initialDefinitions) {
      map.set(def.viewType, def);
    }
    return map;
  });

  const register = React.useCallback((definition: ViewTypeDefinition) => {
    setDefinitions((prev) => {
      const next = new Map(prev);
      next.set(definition.viewType, definition);
      return next;
    });
  }, []);

  const unregister = React.useCallback((viewType: ViewType) => {
    setDefinitions((prev) => {
      const next = new Map(prev);
      next.delete(viewType);
      return next;
    });
  }, []);

  const get = React.useCallback(
    (viewType: ViewType) => definitions.get(viewType),
    [definitions]
  );

  const getTitle = React.useCallback(
    (view: ViewInstance): string => {
      const def = definitions.get(view.viewType);
      if (!def) return view.viewType;
      if (typeof def.title === 'function') {
        return def.title(view.params);
      }
      return def.title;
    },
    [definitions]
  );

  const getIcon = React.useCallback(
    (view: ViewInstance): React.ReactNode => {
      const def = definitions.get(view.viewType);
      if (!def?.icon) return null;
      const IconComponent = def.icon;
      return <IconComponent size={14} />;
    },
    [definitions]
  );

  const renderView = React.useCallback(
    (view: ViewInstance, isActive: boolean): React.ReactNode => {
      const def = definitions.get(view.viewType);
      if (!def) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unknown view type: {view.viewType}
          </div>
        );
      }

      const Component = def.component;
      return (
        <Component
          key={view.id}
          viewId={view.id}
          viewKey={view.viewKey}
          params={view.params}
          isActive={isActive}
        />
      );
    },
    [definitions]
  );

  const value = useMemo<ComponentRegistryContextValue>(
    () => ({
      definitions,
      register,
      unregister,
      get,
      getTitle,
      getIcon,
      renderView,
    }),
    [definitions, register, unregister, get, getTitle, getIcon, renderView]
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

export function useComponentRegistry(): ComponentRegistryContextValue {
  const context = useContext(ComponentRegistryContext);
  if (!context) {
    throw new Error('useComponentRegistry must be used within a ComponentRegistryProvider');
  }
  return context;
}

// ============================================================================
// Placeholder Component
// ============================================================================

export const PlaceholderView: React.FC<ViewComponentProps> = ({ viewKey }) => {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p>View: {viewKey}</p>
    </div>
  );
};
