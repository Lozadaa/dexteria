/**
 * Slot Renderer Component
 *
 * Renders a single plugin contribution within a slot.
 * Handles loading the plugin's renderer component and passing context.
 */

import React, { Suspense, useState, useEffect } from 'react';
import type { SlotContribution } from '../../contexts/ExtensionPointsContext';
import { PluginComponentLoader } from '../../plugins/PluginComponentLoader';
import { Loader2, AlertCircle } from 'lucide-react';

interface SlotRendererProps {
  /** The slot contribution to render */
  contribution: SlotContribution;

  /** Context data passed to the plugin component */
  context?: Record<string, unknown>;
}

/**
 * Loading fallback for plugin components
 */
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-2 text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin" />
  </div>
);

/**
 * Error fallback for plugin components
 */
interface ErrorFallbackProps {
  pluginId: string;
  error?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ pluginId, error }) => (
  <div className="flex items-center gap-2 p-2 text-xs text-red-400 bg-red-500/10 rounded border border-red-500/20">
    <AlertCircle className="w-3 h-3 shrink-0" />
    <span className="truncate">
      Plugin error: {pluginId}
      {error && ` - ${error}`}
    </span>
  </div>
);

/**
 * Evaluates a "when" condition string.
 * Currently supports simple property checks like "task.tracked" or "task.status === 'done'"
 */
function evaluateWhenCondition(when: string | undefined, context: Record<string, unknown>): boolean {
  if (!when) return true;

  try {
    // Simple property existence check (e.g., "task.tracked")
    if (!when.includes('===') && !when.includes('!==')) {
      const parts = when.split('.');
      let value: unknown = context;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return false;
        }
      }
      return Boolean(value);
    }

    // Equality check (e.g., "task.status === 'done'")
    const eqMatch = when.match(/^(.+?)\s*(===|!==)\s*['"]?(.+?)['"]?$/);
    if (eqMatch) {
      const [, path, op, expected] = eqMatch;
      const parts = path.trim().split('.');
      let value: unknown = context;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }
      if (op === '===') return String(value) === expected;
      if (op === '!==') return String(value) !== expected;
    }

    return true;
  } catch {
    console.warn(`[SlotRenderer] Failed to evaluate when condition: ${when}`);
    return true;
  }
}

/**
 * Renders a single plugin contribution within a slot.
 */
export const SlotRenderer: React.FC<SlotRendererProps> = ({ contribution, context = {} }) => {
  const [error, setError] = useState<string | null>(null);

  // Evaluate "when" condition
  const shouldRender = evaluateWhenCondition(contribution.when, context);

  if (!shouldRender) {
    return null;
  }

  if (error) {
    return <ErrorFallback pluginId={contribution.pluginId} error={error} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PluginComponentLoader
        pluginId={contribution.pluginId}
        pluginPath={contribution.pluginPath}
        slotId={contribution.slotId}
        context={context}
        onError={setError}
      />
    </Suspense>
  );
};

export default SlotRenderer;
