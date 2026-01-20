/**
 * SettingsPanel
 *
 * Full-page settings panel that opens as a tab.
 * Organizes settings into sections with a sidebar navigation.
 */

import React, { useState, useEffect } from 'react';
import {
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
  Music,
  Palette,
  Edit2,
  Trash2,
  Plus,
  Upload,
  Puzzle,
  Power,
  PowerOff,
  AlertCircle,
  Terminal,
  Clock,
  Settings2,
  Link2,
} from 'lucide-react';
import { JiraPanel } from './JiraPanel';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSettingsTabs, type SettingsTabContribution } from '../contexts/ExtensionPointsContext';
import { PluginComponentLoader } from '../plugins/PluginComponentLoader';
import * as LucideIcons from 'lucide-react';
import type { ProjectSettings, DetectedCommands, NotificationSound, PluginInfo } from '../../shared/types';

// Built-in tabs
type BuiltInSettingsTab = 'notifications' | 'commands' | 'runner' | 'themes' | 'plugins' | 'jira';
// All tabs including plugin tabs (plugin tabs use format: plugin:pluginId:tabId)
type SettingsTab = BuiltInSettingsTab | `plugin:${string}`;

// Helper to get Lucide icon by name
const getLucideIcon = (iconName: string, size: number = 16): React.ReactNode => {
  const Icon = (LucideIcons as Record<string, React.FC<{ size?: number }>>)[iconName];
  if (Icon) {
    return <Icon size={size} />;
  }
  return <LucideIcons.Puzzle size={size} />;
};

interface SettingsPanelProps {
  onOpenThemeEditor?: (themeId: string, themeName?: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onOpenThemeEditor }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
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
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ProjectSettings | null>(null);

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

  // Plugin settings tabs
  const pluginSettingsTabs = useSettingsTabs();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    if (settings && originalSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
    }
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [projectSettings, detected, presets] = await Promise.all([
        window.dexteria.settings.getProject(),
        window.dexteria.settings.detectCommands(),
        window.dexteria.settings.getSoundPresets(),
      ]);
      setSettings(projectSettings as ProjectSettings);
      setOriginalSettings(projectSettings as ProjectSettings);
      setDetectedCommands(detected as DetectedCommands);
      setSoundPresets(presets);
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
      setOriginalSettings(settings);
      setHasChanges(false);
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

  // Build tabs array with built-in tabs and plugin tabs
  const builtInTabs: { id: SettingsTab; label: string; icon: React.ReactNode; isPlugin?: false }[] = [
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'commands', label: 'Commands', icon: <Terminal size={16} /> },
    { id: 'runner', label: 'Runner', icon: <Clock size={16} /> },
    { id: 'themes', label: 'Themes', icon: <Palette size={16} /> },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle size={16} /> },
    { id: 'jira', label: 'Jira', icon: <Link2 size={16} /> },
  ];

  // Convert plugin tabs to tab format
  const pluginTabs: { id: SettingsTab; label: string; icon: React.ReactNode; isPlugin: true; contribution: SettingsTabContribution }[] =
    pluginSettingsTabs.map((contribution) => ({
      id: `plugin:${contribution.pluginId}:${contribution.id}` as SettingsTab,
      label: contribution.title,
      icon: getLucideIcon(contribution.icon, 16),
      isPlugin: true as const,
      contribution,
    }));

  // Merge and sort tabs by order (built-in tabs have implicit order 0-50, plugin tabs start at their declared order)
  const tabs = [...builtInTabs, ...pluginTabs];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" label="Loading settings..." />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No project open. Open a project to configure settings.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-primary" />
          <h2 className="font-semibold">Settings</h2>
          {hasChanges && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              Unsaved
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? <Spinner size="xs" className="mr-1" /> : <Check size={14} className="mr-1" />}
          Save Changes
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-48 border-r border-border bg-muted/20 flex flex-col">
          <nav className="flex-1 p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure how Dexteria notifies you about task completions.
                </p>
              </div>

              <div className="space-y-4">
                {/* Sound notification toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    {settings.notifications.soundOnTaskComplete ? (
                      <Volume2 size={20} className="text-green-400" />
                    ) : (
                      <VolumeX size={20} className="text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">Sound on Task Complete</div>
                      <div className="text-sm text-muted-foreground">Play a sound when Ralph completes a task</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.soundOnTaskComplete}
                    onCheckedChange={(checked) => updateNotifications('soundOnTaskComplete', checked)}
                  />
                </div>

                {/* Sound Preset Selection */}
                {settings.notifications.soundOnTaskComplete && (
                  <div className="p-4 bg-muted/30 rounded-lg ml-6 space-y-3 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Music size={14} className="text-muted-foreground" />
                      <span className="font-medium text-sm">Notification Sound</span>
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
                            "flex items-center justify-between p-3 rounded-md border text-left transition-colors",
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
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    {settings.notifications.badgeOnTaskComplete ? (
                      <Bell size={20} className="text-green-400" />
                    ) : (
                      <BellOff size={20} className="text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">Badge on Task Complete</div>
                      <div className="text-sm text-muted-foreground">Show app badge when Ralph completes a task</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.badgeOnTaskComplete}
                    onCheckedChange={(checked) => updateNotifications('badgeOnTaskComplete', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Commands Tab */}
          {activeTab === 'commands' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Project Commands</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure commands for running and building your project.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDetectCommands}
                  className="text-primary"
                >
                  <RefreshCw size={14} className="mr-1" />
                  Auto-Detect
                </Button>
              </div>

              {detectedCommands.packageManager && (
                <AlertBanner
                  variant="info"
                  description={`Detected package manager: ${detectedCommands.packageManager}`}
                />
              )}

              <div className="space-y-4">
                {/* Run Command */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Play size={16} className="text-green-400" />
                    <span className="font-medium">Run (Dev Server)</span>
                  </div>
                  <Input
                    value={settings.projectCommands.run.cmd}
                    onChange={(e) => updateCommand('run', 'cmd', e.target.value)}
                    placeholder={detectedCommands.run || 'e.g., npm run dev'}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Switch
                        size="sm"
                        checked={settings.projectCommands.run.autoDetect ?? true}
                        onCheckedChange={(checked) => updateCommand('run', 'autoDetect', checked)}
                      />
                      Auto-detect if empty
                    </label>
                    <Button
                      variant="success-soft"
                      size="sm"
                      onClick={() => handleTestCommand('run')}
                      disabled={testing === 'run'}
                    >
                      {testing === 'run' ? <Spinner size="xs" /> : <Play size={12} />}
                      <span className="ml-1">Test</span>
                    </Button>
                  </div>
                </div>

                {/* Build Command */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Hammer size={16} className="text-yellow-400" />
                    <span className="font-medium">Build</span>
                  </div>
                  <Input
                    value={settings.projectCommands.build.cmd}
                    onChange={(e) => updateCommand('build', 'cmd', e.target.value)}
                    placeholder={detectedCommands.build || 'e.g., npm run build'}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Switch
                        size="sm"
                        checked={settings.projectCommands.build.autoDetect ?? true}
                        onCheckedChange={(checked) => updateCommand('build', 'autoDetect', checked)}
                      />
                      Auto-detect if empty
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Switch
                        size="sm"
                        checked={settings.projectCommands.build.includesInstall ?? true}
                        onCheckedChange={(checked) => updateCommand('build', 'includesInstall', checked)}
                      />
                      Includes install
                    </label>
                    <Button
                      variant="warning-soft"
                      size="sm"
                      onClick={() => handleTestCommand('build')}
                      disabled={testing === 'build'}
                    >
                      {testing === 'build' ? <Spinner size="xs" /> : <Hammer size={12} />}
                      <span className="ml-1">Test</span>
                    </Button>
                  </div>
                </div>

                {/* Install Command */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Download size={16} className="text-blue-400" />
                    <span className="font-medium">Install</span>
                  </div>
                  <Input
                    value={settings.projectCommands.install.cmd}
                    onChange={(e) => updateCommand('install', 'cmd', e.target.value)}
                    placeholder={detectedCommands.install || 'e.g., npm install'}
                  />
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <AlertBanner
                  variant={testResult.success ? 'success' : 'error'}
                  icon={testResult.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                  description={testResult.message}
                />
              )}

              {/* Unsafe Commands Toggle */}
              <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-yellow-400" />
                  <div>
                    <div className="font-medium">Allow Unsafe Commands</div>
                    <div className="text-sm text-muted-foreground">Enable commands that might be destructive</div>
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
            </div>
          )}

          {/* Runner Tab */}
          {activeTab === 'runner' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">Runner Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure execution limits and timeouts.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Default Timeout</div>
                    <div className="text-sm text-muted-foreground">Maximum time for command execution</div>
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
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">Themes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize the appearance of Dexteria.
                </p>
              </div>

              <div className="space-y-3">
                {themes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Palette size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No themes loaded. Create one to get started.</p>
                  </div>
                )}
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer",
                      activeThemeId === theme.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/50 hover:border-primary/50"
                    )}
                    onClick={() => setActiveTheme(theme.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Palette size={18} className={activeThemeId === theme.id ? "text-primary" : "text-muted-foreground"} />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {theme.name}
                          {theme.isBuiltIn && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Built-in
                            </span>
                          )}
                          {activeThemeId === theme.id && (
                            <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onOpenThemeEditor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThemeEditor?.(theme.id, theme.name);
                          }}
                          title="Edit theme JSON"
                        >
                          <Edit2 size={14} />
                          <span className="ml-1">Edit</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
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
                        <Download size={14} />
                        <span className="ml-1">Export</span>
                      </Button>
                      {!theme.isBuiltIn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Delete theme "${theme.name}"?`)) {
                              await deleteTheme(theme.id);
                            }
                          }}
                          title="Delete theme"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Create New Theme */}
              {creatingTheme ? (
                <div className="p-4 bg-muted/30 rounded-lg space-y-3 border border-primary/30">
                  <div className="flex items-center gap-2">
                    <Plus size={16} className="text-primary" />
                    <span className="font-medium">New Theme</span>
                  </div>
                  <Input
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="Theme name..."
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newThemeName.trim()) {
                        const themeName = newThemeName.trim();
                        const theme = await createTheme(themeName);
                        setNewThemeName('');
                        setCreatingTheme(false);
                        if (theme && onOpenThemeEditor) {
                          onOpenThemeEditor(theme.id, themeName);
                        }
                      } else if (e.key === 'Escape') {
                        setNewThemeName('');
                        setCreatingTheme(false);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (newThemeName.trim()) {
                          const themeName = newThemeName.trim();
                          const theme = await createTheme(themeName);
                          setNewThemeName('');
                          setCreatingTheme(false);
                          if (theme && onOpenThemeEditor) {
                            onOpenThemeEditor(theme.id, themeName);
                          }
                        }
                      }}
                      disabled={!newThemeName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewThemeName('');
                        setCreatingTheme(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCreatingTheme(true)}
                    className="flex-1"
                  >
                    <Plus size={14} className="mr-1" />
                    New Theme
                  </Button>
                  <Button
                    variant="secondary"
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
                    <Upload size={14} className="mr-1" />
                    Import
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Plugins Tab */}
          {activeTab === 'plugins' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Plugins</h3>
                  <p className="text-sm text-muted-foreground">
                    Extend Dexteria&apos;s functionality with plugins.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadPlugins}
                  disabled={loadingPlugins}
                >
                  <RefreshCw size={14} className={cn("mr-1", loadingPlugins && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                {loadingPlugins ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" label="Loading plugins..." />
                  </div>
                ) : plugins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Puzzle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No plugins loaded</p>
                    <p className="text-sm mt-1">
                      Plugins extend Dexteria&apos;s functionality. Try refreshing or restart the app.
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
                                    Active
                                  </span>
                                )}
                                {isError && (
                                  <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">
                                    Error
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
                                  On
                                </>
                              ) : (
                                <>
                                  <PowerOff size={14} className="mr-1" />
                                  Off
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
          )}

          {/* Jira Tab */}
          {activeTab === 'jira' && (
            <JiraPanel />
          )}

          {/* Plugin Settings Tabs */}
          {activeTab.startsWith('plugin:') && (() => {
            // Find the matching plugin tab
            const pluginTab = pluginTabs.find(t => t.id === activeTab);
            if (!pluginTab) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Plugin tab not found</p>
                </div>
              );
            }

            return (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{pluginTab.contribution.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Settings provided by plugin: {pluginTab.contribution.pluginId}
                  </p>
                </div>

                <div className="rounded-lg border border-border overflow-hidden min-h-[200px]">
                  <PluginComponentLoader
                    pluginId={pluginTab.contribution.pluginId}
                    pluginPath={pluginTab.contribution.pluginPath}
                    slotId="settings:tab"
                    context={{ tabId: pluginTab.contribution.id }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
