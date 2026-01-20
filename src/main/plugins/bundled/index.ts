/**
 * Bundled Plugins Index
 *
 * This module exports information about plugins that are bundled with Dexteria.
 * These plugins are loaded from the source code instead of .local-kanban/plugins/
 */

import * as path from 'path';
import * as fs from 'fs';

export interface BundledPluginInfo {
  id: string;
  path: string;
}

/**
 * Get the list of bundled plugins.
 * Returns the absolute paths to bundled plugin directories.
 */
export function getBundledPlugins(): BundledPluginInfo[] {
  const bundledDir = __dirname;
  const plugins: BundledPluginInfo[] = [];

  // Read all directories in the bundled folder
  const entries = fs.readdirSync(bundledDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginPath = path.join(bundledDir, entry.name);
    const manifestPath = path.join(pluginPath, 'manifest.json');

    // Check if it has a manifest.json
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        plugins.push({
          id: manifest.id || entry.name,
          path: pluginPath,
        });
      } catch (err) {
        console.error(`[BundledPlugins] Failed to parse manifest for ${entry.name}:`, err);
      }
    }
  }

  return plugins;
}

/**
 * Check if a plugin ID is a bundled plugin.
 */
export function isBundledPlugin(pluginId: string): boolean {
  return getBundledPlugins().some((p) => p.id === pluginId);
}

/**
 * Get the path to a bundled plugin.
 */
export function getBundledPluginPath(pluginId: string): string | null {
  const plugin = getBundledPlugins().find((p) => p.id === pluginId);
  return plugin?.path ?? null;
}
