/**
 * SettingsModal
 *
 * Modal for configuring project settings including notifications and commands.
 * Uses adnia-ui components: Dialog, Switch, Input, Button, Spinner
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  Switch,
  Input,
  Button,
  Spinner,
  AlertBanner,
} from 'adnia-ui';
import { cn } from '../lib/utils';
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Play,
  Hammer,
  Download,
  RefreshCw,
  Check,
  AlertTriangle,
  Settings,
  Music,
  X,
  Palette,
  Edit2,
  Trash2,
  Plus,
  Upload,
  Puzzle,
  Power,
  PowerOff,
  AlertCircle,
} from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import type { ProjectSettings, DetectedCommands, NotificationSound, PluginInfo } from '../../shared/types';

import { useTranslation } from '../i18n/useTranslation';
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenThemeEditor?: (themeId: string, themeName?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenThemeEditor }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [detectedCommands, setDetectedCommands] = useState<DetectedCommands>({});
  const [soundPresets, setSoundPresets] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'run' | 'build' | null>(null);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);
  const [togglingPlugin, setTogglingPlugin] = useState<string | null>(null);

  // Theme context
  const {
    themes,
    activeThemeId,
    setActiveTheme,
    createTheme,
    deleteTheme,
    importTheme,
    exportTheme,
    refreshThemes,
  } = useThemeContext();

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [projectSettings, detected, presets] = await Promise.all([
        window.dexteria.settings.getProject(),
        window.dexteria.settings.detectCommands(),
        window.dexteria.settings.getSoundPresets(),
      ]);
      setSettings(projectSettings as ProjectSettings);
      setDetectedCommands(detected as DetectedCommands);
      setSoundPresets(presets);

      // Load plugins
      await loadPlugins();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setLoading(false);
  };

  const loadPlugins = async () => {
    setLoadingPlugins(true);
    try {
      const pluginList = await window.dexteria?.plugin?.getAll?.();
      setPlugins((pluginList as PluginInfo[]) || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
    setLoadingPlugins(false);
  };

  const togglePlugin = async (pluginId: string, currentState: string) => {
    setTogglingPlugin(pluginId);
    try {
      if (currentState === 'active' || currentState === 'enabled') {
        await window.dexteria?.plugin?.disable?.(pluginId);
      } else {
        await window.dexteria?.plugin?.enable?.(pluginId);
      }
      // Reload plugins to get updated state
      await loadPlugins();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
    setTogglingPlugin(null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await window.dexteria.settings.saveProject(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setSaving(false);
  };

  const updateNotifications = (key: keyof ProjectSettings['notifications'], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    });
  };

  const updateCommand = (type: 'run' | 'build' | 'install', key: string, value: string | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      projectCommands: {
        ...settings.projectCommands,
        [type]: { ...settings.projectCommands[type], [key]: value },
      },
    });
  };

  const handleDetectCommands = async () => {
    const detected = await window.dexteria.settings.detectCommands() as DetectedCommands;
    setDetectedCommands(detected);

    // Auto-fill empty commands
    if (settings) {
      const newSettings = { ...settings };
      if (!newSettings.projectCommands.run.cmd && detected.run) {
        newSettings.projectCommands.run.cmd = detected.run;
      }
      if (!newSettings.projectCommands.build.cmd && detected.build) {
        newSettings.projectCommands.build.cmd = detected.build;
      }
      if (!newSettings.projectCommands.install.cmd && detected.install) {
        newSettings.projectCommands.install.cmd = detected.install;
      }
      setSettings(newSettings);
    }
  };

  const handleTestCommand = async (type: 'run' | 'build') => {
    setTesting(type);
    setTestResult(null);

    try {
      const result = type === 'run'
        ? await window.dexteria.project.startRun()
        : await window.dexteria.project.startBuild();

      if (result.success) {
        setTestResult({ type, success: true, message: `${type} started successfully` });
        // Stop after a brief test
        setTimeout(async () => {
          if (type === 'run') {
            await window.dexteria.project.stopRun();
          } else {
            await window.dexteria.project.stopBuild();
          }
        }, 3000);
      } else {
        setTestResult({ type, success: false, message: result.error || 'Failed to start' });
      }
    } catch (error) {
      setTestResult({
        type,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setTesting(null);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <DialogTitle>Project Settings</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" label={t('common.loadingSettings')} />
            </div>
          ) : settings ? (
            <>
              {/* Notifications Section */}
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  {t('labels.notifications')}
                </h3>
                <div className="space-y-3">
                  {/* Sound notification toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {settings.notifications.soundOnTaskComplete ? (
                        <Volume2 size={18} className="text-green-400" />
                      ) : (
                        <VolumeX size={18} className="text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{t('views.settings.notifications.soundOnTaskComplete')}</div>
                        <div className="text-xs text-muted-foreground">{t('views.settings.notifications.soundOnTaskCompleteDesc')}</div>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.soundOnTaskComplete}
                      onCheckedChange={(checked) => updateNotifications('soundOnTaskComplete', checked)}
                    />
                  </div>

                  {/* Sound Preset Selection */}
                  {settings.notifications.soundOnTaskComplete && (
                    <div className="p-3 bg-muted/30 rounded-lg ml-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <Music size={14} className="text-muted-foreground" />
                        <span className="font-medium text-sm">{t('views.settings.notifications.notificationSound')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {soundPresets.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setSettings({
                                ...settings,
                                notifications: { ...settings.notifications, sound: preset.id as NotificationSound },
                              });
                            }}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md border text-left transition-colors",
                              settings.notifications.sound === preset.id
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{preset.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{preset.description}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dexteria.settings.testSound(preset.id as NotificationSound);
                              }}
                              title="Test sound"
                              className="shrink-0 ml-2"
                            >
                              <Play size={12} />
                            </Button>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Badge notification toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {settings.notifications.badgeOnTaskComplete ? (
                        <Bell size={18} className="text-green-400" />
                      ) : (
                        <BellOff size={18} className="text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{t('views.settings.notifications.badgeOnTaskComplete')}</div>
                        <div className="text-xs text-muted-foreground">{t('views.settings.notifications.badgeOnTaskCompleteDesc')}</div>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.badgeOnTaskComplete}
                      onCheckedChange={(checked) => updateNotifications('badgeOnTaskComplete', checked)}
                    />
                  </div>
                </div>
              </section>

              {/* Commands Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('views.settings.commands.title')}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDetectCommands}
                    className="text-primary"
                  >
                    <RefreshCw size={12} className="mr-1" />
                    {t('actions.autoDetect')}
                  </Button>
                </div>

                {detectedCommands.packageManager && (
                  <AlertBanner
                    variant="info"
                    className="mb-3"
                    description={`Detected package manager: ${detectedCommands.packageManager}`}
                  />
                )}

                <div className="space-y-4">
                  {/* Run Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-green-400" />
                      <span className="font-medium text-sm">{t('views.settings.commands.runDevServer')}</span>
                    </div>
                    <Input
                      value={settings.projectCommands.run.cmd}
                      onChange={(e) => updateCommand('run', 'cmd', e.target.value)}
                      placeholder={detectedCommands.run || 'e.g., npm run dev'}
                      className="h-9"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          size="sm"
                          checked={settings.projectCommands.run.autoDetect ?? true}
                          onCheckedChange={(checked) => updateCommand('run', 'autoDetect', checked)}
                        />
                        {t('views.settings.commands.autoDetectIfEmpty')}
                      </label>
                      <Button
                        variant="success-soft"
                        size="sm"
                        onClick={() => handleTestCommand('run')}
                        disabled={testing === 'run'}
                      >
                        {testing === 'run' ? <Spinner size="xs" /> : <Play size={12} />}
                        <span className="ml-1">{t('actions.test')}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Build Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Hammer size={14} className="text-yellow-400" />
                      <span className="font-medium text-sm">{t('views.settings.commands.build')}</span>
                    </div>
                    <Input
                      value={settings.projectCommands.build.cmd}
                      onChange={(e) => updateCommand('build', 'cmd', e.target.value)}
                      placeholder={detectedCommands.build || 'e.g., npm run build'}
                      className="h-9"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          size="sm"
                          checked={settings.projectCommands.build.autoDetect ?? true}
                          onCheckedChange={(checked) => updateCommand('build', 'autoDetect', checked)}
                        />
                        {t('views.settings.commands.autoDetectIfEmpty')}
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          size="sm"
                          checked={settings.projectCommands.build.includesInstall ?? true}
                          onCheckedChange={(checked) => updateCommand('build', 'includesInstall', checked)}
                        />
                        {t('views.settings.commands.includesInstall')}
                      </label>
                      <Button
                        variant="warning-soft"
                        size="sm"
                        onClick={() => handleTestCommand('build')}
                        disabled={testing === 'build'}
                      >
                        {testing === 'build' ? <Spinner size="xs" /> : <Hammer size={12} />}
                        <span className="ml-1">{t('actions.test')}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Install Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-blue-400" />
                      <span className="font-medium text-sm">{t('views.settings.commands.install')}</span>
                    </div>
                    <Input
                      value={settings.projectCommands.install.cmd}
                      onChange={(e) => updateCommand('install', 'cmd', e.target.value)}
                      placeholder={detectedCommands.install || 'e.g., npm install'}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <AlertBanner
                    variant={testResult.success ? 'success' : 'error'}
                    className="mt-3"
                    icon={testResult.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                    description={testResult.message}
                  />
                )}

                {/* Unsafe Commands Toggle */}
                <div className="flex items-center justify-between p-3 mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-yellow-400" />
                    <div>
                      <div className="font-medium text-sm">{t('views.settings.commands.allowUnsafeCommands')}</div>
                      <div className="text-xs text-muted-foreground">{t('views.settings.commands.allowUnsafeCommandsDesc')}</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.projectCommands.allowUnsafeCommands}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      projectCommands: {
                        ...settings.projectCommands,
                        allowUnsafeCommands: checked,
                      },
                    })}
                  />
                </div>
              </section>

              {/* Runner Section */}
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Runner
                </h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{t('views.settings.runner.defaultTimeout')}</div>
                      <div className="text-xs text-muted-foreground">{t('views.settings.runner.defaultTimeoutDesc')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.runner.defaultTimeoutSec}
                        onChange={(e) => setSettings({
                          ...settings,
                          runner: { ...settings.runner, defaultTimeoutSec: parseInt(e.target.value) || 1800 },
                        })}
                        min={60}
                        max={7200}
                        className="w-20 h-9 text-right"
                      />
                      <span className="text-xs text-muted-foreground">{t('views.settings.runner.seconds')}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Themes Section */}
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  {t('labels.themes')}
                </h3>
                <div className="space-y-3">
                  {/* Theme List */}
                  <div className="space-y-2">
                    {themes.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {t('views.settings.themes.noThemes')}
                      </div>
                    )}
                    {themes.map((theme) => (
                      <div
                        key={theme.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                          activeThemeId === theme.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted/50 hover:border-primary/50"
                        )}
                        onClick={() => setActiveTheme(theme.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Palette size={16} className={activeThemeId === theme.id ? "text-primary" : "text-muted-foreground"} />
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {theme.name}
                              {theme.isBuiltIn && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {t('labels.builtIn')}
                                </span>
                              )}
                              {activeThemeId === theme.id && (
                                <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                                  {t('labels.active')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {onOpenThemeEditor && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenThemeEditor?.(theme.id, theme.name);
                                onClose();
                              }}
                              title="Edit theme JSON"
                            >
                              <Edit2 size={12} />
                              <span className="ml-1">{t('actions.edit')}</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const json = await exportTheme(theme.id);
                              if (json) {
                                const blob = new Blob([json], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${theme.name}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            title="Export theme as JSON file"
                          >
                            <Download size={12} />
                            <span className="ml-1">{t('actions.export')}</span>
                          </Button>
                          {!theme.isBuiltIn && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete theme "${theme.name}"?`)) {
                                  await deleteTheme(theme.id);
                                }
                              }}
                              title="Delete theme"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Create New Theme */}
                  {creatingTheme ? (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-primary/30">
                      <div className="flex items-center gap-2">
                        <Plus size={14} className="text-primary" />
                        <span className="font-medium text-sm">{t('actions.newTheme')}</span>
                      </div>
                      <Input
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Theme name..."
                        className="h-8"
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newThemeName.trim()) {
                            const themeName = newThemeName.trim();
                            const theme = await createTheme(themeName);
                            setNewThemeName('');
                            setCreatingTheme(false);
                            if (theme && onOpenThemeEditor) {
                              onOpenThemeEditor(theme.id, themeName);
                              onClose();
                            }
                          } else if (e.key === 'Escape') {
                            setNewThemeName('');
                            setCreatingTheme(false);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          onClick={async () => {
                            if (newThemeName.trim()) {
                              const themeName = newThemeName.trim();
                              const theme = await createTheme(themeName);
                              setNewThemeName('');
                              setCreatingTheme(false);
                              // If editor available, open it; otherwise theme stays in list
                              if (theme && onOpenThemeEditor) {
                                onOpenThemeEditor(theme.id, themeName);
                                onClose();
                              }
                            }
                          }}
                          disabled={!newThemeName.trim()}
                        >
                          {t('actions.create')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setNewThemeName('');
                            setCreatingTheme(false);
                          }}
                        >
                          {t('actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCreatingTheme(true)}
                        className="flex-1"
                      >
                        <Plus size={12} className="mr-1" />
                        {t('actions.newTheme')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.json';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const text = await file.text();
                              const theme = await importTheme(text);
                              if (theme) {
                                await refreshThemes();
                              }
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload size={12} className="mr-1" />
                        {t('actions.import')}
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Plugins Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('labels.plugins')}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadPlugins}
                    disabled={loadingPlugins}
                    className="text-primary"
                  >
                    <RefreshCw size={12} className={cn("mr-1", loadingPlugins && "animate-spin")} />
                    {t('actions.refresh')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {loadingPlugins ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" label={t('common.loadingPlugins')} />
                    </div>
                  ) : plugins.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Puzzle size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No plugins installed</p>
                      <p className="text-xs mt-1">
                        Add plugins to <code className="bg-muted px-1 rounded">.local-kanban/plugins/</code>
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
                            "p-3 rounded-lg border transition-colors",
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
                                "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                                isActive
                                  ? "bg-green-500/20 text-green-500"
                                  : isError
                                    ? "bg-red-500/20 text-red-500"
                                    : "bg-muted text-muted-foreground"
                              )}>
                                {isError ? <AlertCircle size={16} /> : <Puzzle size={16} />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
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
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {plugin.manifest.description}
                                  </p>
                                )}
                                {plugin.manifest.author && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    by {plugin.manifest.author}
                                  </p>
                                )}
                                {isError && plugin.error && (
                                  <p className="text-xs text-red-400 mt-1">
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
                                className="w-20"
                              >
                                {isToggling ? (
                                  <Spinner size="xs" />
                                ) : isActive || isEnabled ? (
                                  <>
                                    <Power size={12} className="mr-1" />
                                    {t('labels.on')}
                                  </>
                                ) : (
                                  <>
                                    <PowerOff size={12} className="mr-1" />
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
                <p className="text-xs text-muted-foreground mt-3">
                  Plugins extend Dexteria&apos;s functionality. Place plugin folders in the plugins directory to install them.
                </p>
              </section>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.noProjectOpen')}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !settings}>
            {saving && <Spinner size="xs" className="mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};
