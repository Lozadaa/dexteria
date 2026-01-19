/**
 * Built-In Plugin Components
 *
 * Registry of first-party plugin components that are bundled with Dexteria.
 * These don't need to be loaded via iframe since they're part of the app.
 */

import React from 'react';
import type { ExtensionSlotId } from '../../shared/types';

// Lazy load built-in components
const JiraPanel = React.lazy(() =>
  import('../components/JiraPanel').then((m) => ({ default: m.JiraPanel }))
);
const JiraTaskCardBadge = React.lazy(() =>
  import('../components/JiraTaskCardBadge').then((m) => ({ default: m.JiraTaskCardBadge }))
);
const JiraTaskDetailSidebar = React.lazy(() =>
  import('../components/JiraTaskDetailSidebar').then((m) => ({ default: m.JiraTaskDetailSidebar }))
);

/**
 * Built-in plugin component registry.
 * Maps pluginId -> slotId -> React component
 */
export const BUILT_IN_PLUGIN_COMPONENTS: Record<
  string,
  Partial<Record<ExtensionSlotId, React.ComponentType<BuiltInPluginComponentProps>>>
> = {
  'com.dexteria.jira': {
    'settings:tab': JiraPanel,
    'docking:panel': JiraPanel,
    'task-card:badge': JiraTaskCardBadge,
    'task-detail:sidebar': JiraTaskDetailSidebar,
  },
};

/**
 * Props passed to built-in plugin components
 */
export interface BuiltInPluginComponentProps {
  pluginId: string;
  slotId: ExtensionSlotId;
  context?: Record<string, unknown>;
}

/**
 * Check if a plugin has a built-in component for a slot
 */
export function hasBuiltInComponent(pluginId: string, slotId: ExtensionSlotId): boolean {
  return !!BUILT_IN_PLUGIN_COMPONENTS[pluginId]?.[slotId];
}

/**
 * Get the built-in component for a plugin slot
 */
export function getBuiltInComponent(
  pluginId: string,
  slotId: ExtensionSlotId
): React.ComponentType<BuiltInPluginComponentProps> | null {
  return BUILT_IN_PLUGIN_COMPONENTS[pluginId]?.[slotId] ?? null;
}

/**
 * Wrapper component that renders built-in plugin components with Suspense
 */
interface BuiltInPluginRendererProps {
  pluginId: string;
  slotId: ExtensionSlotId;
  context?: Record<string, unknown>;
}

export const BuiltInPluginRenderer: React.FC<BuiltInPluginRendererProps> = ({
  pluginId,
  slotId,
  context = {},
}) => {
  const Component = getBuiltInComponent(pluginId, slotId);

  if (!Component) {
    return null;
  }

  return (
    <React.Suspense
      fallback={
        <div className="h-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Component pluginId={pluginId} slotId={slotId} context={context} />
    </React.Suspense>
  );
};

export default BuiltInPluginRenderer;
