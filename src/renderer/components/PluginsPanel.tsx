/**
 * PluginsPanel
 *
 * Dedicated panel for managing plugins.
 * Provides a standalone view of plugin management.
 */

import React, { useState, useEffect } from 'react';
import { Button, Spinner } from 'adnia-ui';
import { cn } from '../lib/utils';
import {
  Puzzle,
  RefreshCw,
  Power,
  PowerOff,
  AlertCircle,
} from 'lucide-react';
import type { PluginInfo } from '../../shared/types';

import { t } from '../i18n/t';
export const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingPlugin, setTogglingPlugin] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const pluginList = await window.dexteria?.plugin?.getAll?.();
      setPlugins((pluginList as PluginInfo[]) || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
    setLoading(false);
  };

  const togglePlugin = async (pluginId: string, currentState: string) => {
    setTogglingPlugin(pluginId);
    try {
      if (currentState === 'active' || currentState === 'enabled') {
        await window.dexteria?.plugin?.disable?.(pluginId);
      } else {
        await window.dexteria?.plugin?.enable?.(pluginId);
      }
      await loadPlugins();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
    setTogglingPlugin(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" label={t('common.loadingPlugins')} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Puzzle size={18} className="text-primary" />
          <h2 className="font-semibold">{t('labels.plugins')}</h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadPlugins}
          disabled={loading}
        >
          <RefreshCw size={14} className={cn("mr-1", loading && "animate-spin")} />
          {t('actions.refresh')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-2xl">
          {plugins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Puzzle size={32} className="mx-auto mb-2 opacity-50" />
              <p>{t('views.settings.plugins.noPlugins')}</p>
              <p className="text-sm mt-1">
                Plugins extend Dexteria&apos;s functionality.
              </p>
            </div>
          ) : (
            plugins.map((plugin) => {
              const isActive = plugin.state === 'active';
              const isEnabled = plugin.state === 'enabled';
              const isError = plugin.state === 'error';
              const isToggling = togglingPlugin === plugin.manifest.id;

              return (
                <div
                  key={plugin.manifest.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    isActive
                      ? "border-green-500/30 bg-green-500/5"
                      : isError
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-border bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-green-500/20 text-green-500"
                          : isError
                            ? "bg-red-500/20 text-red-500"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {isError ? <AlertCircle size={20} /> : <Puzzle size={20} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <span className="truncate">{plugin.manifest.name}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            v{plugin.manifest.version}
                          </span>
                          {isActive && (
                            <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded shrink-0">
                              {t('labels.active')}
                            </span>
                          )}
                          {isError && (
                            <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">
                              {t('labels.error')}
                            </span>
                          )}
                        </div>
                        {plugin.manifest.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {plugin.manifest.description}
                          </p>
                        )}
                        {plugin.manifest.author && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {plugin.manifest.author}
                          </p>
                        )}
                        {isError && plugin.error && (
                          <p className="text-sm text-red-400 mt-2">
                            Error: {plugin.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant={isActive || isEnabled ? "success-soft" : "secondary"}
                        size="sm"
                        onClick={() => togglePlugin(plugin.manifest.id, plugin.state)}
                        disabled={isToggling}
                        className="w-24"
                      >
                        {isToggling ? (
                          <Spinner size="xs" />
                        ) : isActive || isEnabled ? (
                          <>
                            <Power size={14} className="mr-1" />
                            {t('labels.on')}
                          </>
                        ) : (
                          <>
                            <PowerOff size={14} className="mr-1" />
                            {t('labels.off')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginsPanel;
