/**
 * Docking Provider
 * Combines all docking-related providers into a single wrapper
 */

import React, { useMemo, useEffect } from 'react';
import { DockingProvider as DockingStateProvider, useDocking } from './DockingContext';
import {
  ComponentRegistryProvider,
  ComponentInstancesProvider,
  useComponentInstances,
  useComponentRegistry,
} from './ComponentRegistry';
import { DockingDndProvider } from './DockingDndContext';
import { LayoutTreeRenderer, usePanelRefs } from './LayoutTreeRenderer';
import type { ComponentDefinition, PanelNode } from './types';
import { isPanelNode } from './types';
import { COMPONENT_KEYS } from './defaultLayout';

// ============================================================================
// Component Renderer - Renders all tab instances
// ============================================================================

const ComponentRenderer: React.FC = () => {
  const { state } = useDocking();
  const { instances, mountInstance, unmountInstance } = useComponentInstances();
  const { get } = useComponentRegistry();

  // Collect all active tabs
  const activeTabs = useMemo(() => {
    const collectActiveTabs = (node: typeof state.root): Map<string, string> => {
      const result = new Map<string, string>();
      if (!node) return result;

      if (isPanelNode(node)) {
        if (node.activeTabId) {
          result.set(node.activeTabId, node.id);
        }
        return result;
      }

      if (node.type === 'split') {
        const left = collectActiveTabs(node.children[0]);
        const right = collectActiveTabs(node.children[1]);
        left.forEach((v, k) => result.set(k, v));
        right.forEach((v, k) => result.set(k, v));
      }

      return result;
    };

    return collectActiveTabs(state.root);
  }, [state.root]);

  // Collect all tabs
  const allTabs = useMemo(() => {
    const collectAllTabs = (node: typeof state.root): Map<string, string> => {
      const result = new Map<string, string>();
      if (!node) return result;

      if (isPanelNode(node)) {
        for (const tabId of node.tabs) {
          result.set(tabId, node.id);
        }
        return result;
      }

      if (node.type === 'split') {
        const left = collectAllTabs(node.children[0]);
        const right = collectAllTabs(node.children[1]);
        left.forEach((v, k) => result.set(k, v));
        right.forEach((v, k) => result.set(k, v));
      }

      return result;
    };

    return collectAllTabs(state.root);
  }, [state.root]);

  // Mount/unmount instances as tabs change
  useEffect(() => {
    // Mount new tabs
    for (const [tabId, panelId] of allTabs) {
      const tab = state.tabs[tabId];
      if (tab && !instances.has(tabId)) {
        mountInstance(tabId, tab.componentKey, tab.props);
      }
    }

    // Unmount removed tabs
    for (const tabId of instances.keys()) {
      if (!allTabs.has(tabId)) {
        unmountInstance(tabId);
      }
    }
  }, [allTabs, state.tabs, instances, mountInstance, unmountInstance]);

  // Render all instances
  let panelRefs: ReturnType<typeof usePanelRefs> | null = null;
  try {
    panelRefs = usePanelRefs();
  } catch {
    // Not in PanelRefsContext yet, will be rendered by LayoutTreeRenderer
    return null;
  }

  if (!panelRefs) return null;

  return (
    <>
      {Array.from(instances.values()).map((instance) => {
        const panelId = allTabs.get(instance.tabId);
        if (!panelId) return null;

        const ref = panelRefs!.getRef(panelId);
        if (!ref.current) return null;

        const componentDef = get(instance.componentKey);
        if (!componentDef) return null;

        const Component = componentDef.component;
        const isActive = activeTabs.has(instance.tabId);

        return React.createElement(
          'div',
          {
            key: instance.tabId,
            'data-tab-id': instance.tabId,
            className: `absolute inset-0 ${isActive ? '' : 'invisible pointer-events-none'}`,
            ref: (el: HTMLDivElement | null) => {
              // Portal the component content
              if (el && ref.current && !ref.current.contains(el)) {
                ref.current.appendChild(el);
              }
            },
          },
          React.createElement(Component as React.ComponentType, {
            ...instance.props,
            tabId: instance.tabId,
          })
        );
      })}
    </>
  );
};

// ============================================================================
// Inner Provider (after DockingStateProvider)
// ============================================================================

interface DockingInnerProviderProps {
  children: React.ReactNode;
}

const DockingInnerProvider: React.FC<DockingInnerProviderProps> = ({ children }) => {
  return (
    <ComponentInstancesProvider>
      <DockingDndProvider>
        <LayoutTreeRenderer>
          <ComponentRenderer />
        </LayoutTreeRenderer>
        {children}
      </DockingDndProvider>
    </ComponentInstancesProvider>
  );
};

// ============================================================================
// Main Provider
// ============================================================================

interface DockingSystemProviderProps {
  children: React.ReactNode;
  components: ComponentDefinition[];
}

export const DockingSystemProvider: React.FC<DockingSystemProviderProps> = ({
  children,
  components,
}) => {
  return (
    <ComponentRegistryProvider defaultComponents={components}>
      <DockingStateProvider>
        <DockingInnerProvider>{children}</DockingInnerProvider>
      </DockingStateProvider>
    </ComponentRegistryProvider>
  );
};

export default DockingSystemProvider;
