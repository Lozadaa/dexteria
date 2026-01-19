/**
 * Plugin Component Loader
 *
 * Loads and renders plugin components from their renderer entry points.
 * Supports two strategies:
 * 1. Built-in components: First-party plugins bundled with Dexteria
 * 2. Iframe sandbox: Third-party plugins loaded in isolated iframes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ExtensionSlotId } from '../../shared/types';
import { PluginBridge } from './PluginBridge';
import { hasBuiltInComponent, BuiltInPluginRenderer } from './BuiltInPluginComponents';

interface PluginComponentLoaderProps {
  /** Plugin ID */
  pluginId: string;

  /** Path to the plugin directory */
  pluginPath: string;

  /** The slot this component is being rendered in */
  slotId: ExtensionSlotId;

  /** Context data passed to the plugin */
  context?: Record<string, unknown>;

  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Loads and renders a plugin component.
 *
 * First checks if there's a built-in component (for first-party plugins),
 * otherwise uses an iframe sandbox approach for third-party plugins.
 */
export const PluginComponentLoader: React.FC<PluginComponentLoaderProps> = ({
  pluginId,
  pluginPath,
  slotId,
  context = {},
  onError,
}) => {
  // Check if this plugin has a built-in component for this slot
  if (hasBuiltInComponent(pluginId, slotId)) {
    return (
      <BuiltInPluginRenderer
        pluginId={pluginId}
        slotId={slotId}
        context={context}
      />
    );
  }

  // Otherwise, use iframe sandbox for third-party plugins
  return (
    <IframeSandboxLoader
      pluginId={pluginId}
      pluginPath={pluginPath}
      slotId={slotId}
      context={context}
      onError={onError}
    />
  );
};

/**
 * Iframe-based sandbox loader for third-party plugins.
 */
const IframeSandboxLoader: React.FC<PluginComponentLoaderProps> = ({
  pluginId,
  pluginPath,
  slotId,
  context = {},
  onError,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<PluginBridge | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate iframe source URL
  // Plugins should have a renderer/index.html or renderer/[slotId].html
  const getIframeSrc = useCallback(() => {
    // Normalize the path for file:// protocol
    const normalizedPath = pluginPath.replace(/\\/g, '/');

    // Try slot-specific entry first, then fall back to generic
    // Plugins can provide: renderer/task-card-badge.html, renderer/settings-tab.html, etc.
    const slotFileName = slotId.replace(':', '-').replace(/_/g, '-');

    // For local file access in Electron
    return `file://${normalizedPath}/renderer/index.html?slot=${encodeURIComponent(slotId)}`;
  }, [pluginPath, slotId]);

  // Initialize plugin bridge for communication
  useEffect(() => {
    if (!iframeRef.current) return;

    const bridge = new PluginBridge(pluginId, iframeRef.current);
    bridgeRef.current = bridge;

    // Send initial context
    bridge.sendContext(context);

    return () => {
      bridge.destroy();
      bridgeRef.current = null;
    };
  }, [pluginId, loaded]);

  // Update context when it changes
  useEffect(() => {
    if (bridgeRef.current && loaded) {
      bridgeRef.current.sendContext(context);
    }
  }, [context, loaded]);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(null);
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    const errorMsg = 'Failed to load plugin component';
    setError(errorMsg);
    onError?.(errorMsg);
  }, [onError]);

  if (error) {
    return null; // Error is handled by parent SlotRenderer
  }

  return (
    <div
      className="plugin-component-container"
      data-plugin-id={pluginId}
      data-slot-id={slotId}
    >
      <iframe
        ref={iframeRef}
        src={getIframeSrc()}
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin"
        style={{
          border: 'none',
          width: '100%',
          minHeight: '32px',
          height: 'auto',
          display: loaded ? 'block' : 'none',
        }}
        title={`Plugin: ${pluginId} - ${slotId}`}
      />
      {!loaded && !error && (
        <div className="h-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default PluginComponentLoader;
