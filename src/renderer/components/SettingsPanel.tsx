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
  Copy,
  X,
  Code2,
  ExternalLink,
  Globe,
  GitBranch,
} from 'lucide-react';
import { GitSettingsPanel } from './Git/GitSettingsPanel';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSettingsTabs, type SettingsTabContribution } from '../contexts/ExtensionPointsContext';
import { PluginComponentLoader } from '../plugins/PluginComponentLoader';
import * as LucideIcons from 'lucide-react';
import type { ProjectSettings, DetectedCommands, NotificationSound, PluginInfo } from '../../shared/types';
import { useTranslation } from '../i18n/useTranslation';
import type { Locale } from '../i18n';

// Built-in tabs
type BuiltInSettingsTab = 'notifications' | 'commands' | 'runner' | 'integrations' | 'git' | 'language' | 'themes' | 'plugins' | 'other';
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
  const { t, locale, setLocale } = useTranslation();
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
  const [pluginError, setPluginError] = useState<{ pluginId: string; error: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ProjectSettings | null>(null);

  // VSCode integration state
  const [vscodeEnabled, setVscodeEnabled] = useState(false);
  const [vscodeInstalled, setVscodeInstalled] = useState(false);
  const [vscodeVersion, setVscodeVersion] = useState<string | null>(null);
  const [checkingVscode, setCheckingVscode] = useState(true);

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
    loadVSCodeStatus();
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
      console.log('[SettingsPanel] Loaded plugins:', pluginList?.map((p: PluginInfo) => ({
        id: p.manifest?.id,
        state: p.state,
        error: p.error,
      })));
      setPlugins((pluginList as PluginInfo[]) || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
    setLoadingPlugins(false);
  };

  const loadVSCodeStatus = async () => {
    setCheckingVscode(true);
    try {
      // Check user preference
      const pref = await window.dexteria?.settings?.getVSCodePreference?.();
      setVscodeEnabled(pref?.wantsCodeViewing ?? false);

      // Check if installed
      const status = await window.dexteria?.vscode?.getStatus?.();
      setVscodeInstalled(status?.installed ?? false);
      setVscodeVersion(status?.version ?? null);
    } catch (error) {
      console.error('Failed to load VSCode status:', error);
    }
    setCheckingVscode(false);
  };

  const toggleVscodeIntegration = async (enabled: boolean) => {
    try {
      await window.dexteria?.settings?.setVSCodePreference?.(enabled);
      setVscodeEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle VSCode integration:', error);
    }
  };

  const handleOpenDownloadPage = async () => {
    try {
      await window.dexteria?.vscode?.openDownloadPage?.();
    } catch (error) {
      console.error('Failed to open download page:', error);
    }
  };

  const handleRefreshVSCode = async () => {
    setCheckingVscode(true);
    try {
      const status = await window.dexteria?.vscode?.refresh?.();
      setVscodeInstalled(status?.installed ?? false);
      setVscodeVersion(status?.version ?? null);
    } catch (error) {
      console.error('Failed to refresh VSCode status:', error);
    }
    setCheckingVscode(false);
  };

  const togglePlugin = async (pluginId: string, currentState: string) => {
    setTogglingPlugin(pluginId);
    setPluginError(null);
    console.log(`[SettingsPanel] Toggling plugin ${pluginId}, current state: ${currentState}`);

    try {
      let result: { success: boolean; error?: string } | undefined;

      if (currentState === 'active' || currentState === 'enabled') {
        console.log(`[SettingsPanel] Disabling plugin ${pluginId}...`);
        result = await window.dexteria?.plugin?.disable?.(pluginId);
      } else {
        console.log(`[SettingsPanel] Enabling plugin ${pluginId}...`);
        result = await window.dexteria?.plugin?.enable?.(pluginId);
      }

      console.log(`[SettingsPanel] Plugin toggle result:`, result);

      await loadPlugins();

      // Show error if activation failed
      if (result && !result.success) {
        const errorMsg = result.error || 'Unknown error (no message returned)';
        console.error(`[SettingsPanel] Plugin activation failed:`, errorMsg);
        setPluginError({ pluginId, error: errorMsg });
      }
    } catch (error) {
      console.error('[SettingsPanel] Failed to toggle plugin:', error);
      setPluginError({
        pluginId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setTogglingPlugin(null);
  };

  const copyErrorToClipboard = async (error: string) => {
    try {
      await navigator.clipboard.writeText(error);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
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
    { id: 'notifications', label: t('labels.notifications'), icon: <Bell size={16} /> },
    { id: 'commands', label: t('labels.commands'), icon: <Terminal size={16} /> },
    { id: 'runner', label: t('labels.runner'), icon: <Clock size={16} /> },
    { id: 'integrations', label: t('labels.integrations'), icon: <Code2 size={16} /> },
    { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
    { id: 'language', label: t('labels.language'), icon: <Globe size={16} /> },
    { id: 'themes', label: t('labels.themes'), icon: <Palette size={16} /> },
    { id: 'plugins', label: t('labels.plugins'), icon: <Puzzle size={16} /> },
    { id: 'other', label: t('labels.other'), icon: <Settings2 size={16} /> },
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
        <Spinner size="md" label={t('common.loadingSettings')} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        {t('common.noProjectOpen')}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-primary" />
          <h2 className="font-semibold">{t('labels.settings')}</h2>
          {hasChanges && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              {t('labels.unsaved')}
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
                <h3 className="text-lg font-semibold mb-1">{t('labels.notifications')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.notifications.description')}
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
                      <div className="font-medium">{t('views.settings.notifications.soundOnTaskComplete')}</div>
                      <div className="text-sm text-muted-foreground">{t('views.settings.notifications.soundOnTaskCompleteDesc')}</div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.soundOnTaskComplete}
                    onCheckedChange={(checked) => updateNotifications('soundOnTaskComplete', checked)}
                  />
                </div>

                {/* Sound Preset Selection */}
                {settings.notifications.soundOnTaskComplete && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3 border border-border/50">
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
                      <div className="font-medium">{t('views.settings.notifications.badgeOnTaskComplete')}</div>
                      <div className="text-sm text-muted-foreground">{t('views.settings.notifications.badgeOnTaskCompleteDesc')}</div>
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
                  <h3 className="text-lg font-semibold mb-1">{t('views.settings.commands.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('views.settings.commands.description')}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDetectCommands}
                  className="text-primary"
                >
                  <RefreshCw size={14} className="mr-1" />
                  {t('actions.autoDetect')}
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
                    <span className="font-medium">{t('views.settings.commands.runDevServer')}</span>
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
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Hammer size={16} className="text-yellow-400" />
                    <span className="font-medium">{t('views.settings.commands.build')}</span>
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
                      {t('views.settings.commands.autoDetectIfEmpty')}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
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
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Download size={16} className="text-blue-400" />
                    <span className="font-medium">{t('views.settings.commands.install')}</span>
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
                    <div className="font-medium">{t('views.settings.commands.allowUnsafeCommands')}</div>
                    <div className="text-sm text-muted-foreground">{t('views.settings.commands.allowUnsafeCommandsDesc')}</div>
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
                <h3 className="text-lg font-semibold mb-1">{t('views.settings.runner.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.runner.description')}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t('views.settings.runner.defaultTimeout')}</div>
                    <div className="text-sm text-muted-foreground">{t('views.settings.runner.defaultTimeoutDesc')}</div>
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
                    <span className="text-sm text-muted-foreground">{t('views.settings.runner.seconds')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('labels.integrations')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.integrations.description')}
                </p>
              </div>

              {/* VSCode Integration */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      vscodeEnabled && vscodeInstalled
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Code2 size={20} />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        VSCode Integration
                        {vscodeInstalled && (
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                            {t('labels.installed')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('views.settings.integrations.vscodeDesc')}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={vscodeEnabled}
                    onCheckedChange={toggleVscodeIntegration}
                    disabled={checkingVscode}
                  />
                </div>

                {/* VSCode status details */}
                {vscodeEnabled && (
                  <div className="pl-13 space-y-3">
                    {checkingVscode ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner size="xs" />
                        {t('views.settings.integrations.checkingVscode')}
                      </div>
                    ) : vscodeInstalled ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <Check size={14} />
                            VSCode detected
                            {vscodeVersion && (
                              <span className="text-xs text-green-500/70">
                                (v{vscodeVersion})
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={handleRefreshVSCode}
                            disabled={checkingVscode}
                          >
                            <RefreshCw size={12} className={cn(checkingVscode && "animate-spin")} />
                          </Button>
                        </div>
                        <p className="text-xs text-green-500/70 mt-1">
                          {t('views.settings.integrations.vscodeAvailable')}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-500">
                              {t('views.settings.integrations.vscodeNotDetected')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('views.settings.integrations.vscodeNotDetectedDesc')}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={handleOpenDownloadPage}
                              >
                                <Download size={12} className="mr-1" />
                                {t('views.settings.integrations.downloadVscode')}
                                <ExternalLink size={10} className="ml-1" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={handleRefreshVSCode}
                                disabled={checkingVscode}
                              >
                                <RefreshCw size={12} className={cn("mr-1", checkingVscode && "animate-spin")} />
                                {t('actions.checkAgain')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {t('views.settings.integrations.moreIntegrations')}
              </p>
            </div>
          )}

          {/* Git Tab */}
          {activeTab === 'git' && (
            <GitSettingsPanel />
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('views.settings.language.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.language.description')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'en' as Locale, name: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
                  { id: 'es' as Locale, name: 'Espa\u00f1ol', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLocale(lang.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                      locale === lang.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {locale === lang.id && <Check size={16} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('labels.themes')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.themes.description')}
                </p>
              </div>

              <div className="space-y-3">
                {themes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Palette size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t('views.settings.themes.noThemes')}</p>
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
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThemeEditor?.(theme.id, theme.name);
                          }}
                          title="Edit theme JSON"
                        >
                          <Edit2 size={14} />
                          <span className="ml-1">{t('actions.edit')}</span>
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
                        <span className="ml-1">{t('actions.export')}</span>
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
                    <span className="font-medium">{t('actions.newTheme')}</span>
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
                      {t('actions.create')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
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
                    onClick={() => setCreatingTheme(true)}
                    className="flex-1"
                  >
                    <Plus size={14} className="mr-1" />
                    {t('actions.newTheme')}
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
                    {t('actions.import')}
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
                  <h3 className="text-lg font-semibold mb-1">{t('labels.plugins')}</h3>
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
                  {t('actions.refresh')}
                </Button>
              </div>

              <div className="space-y-3">
                {loadingPlugins ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" label={t('common.loadingPlugins')} />
                  </div>
                ) : plugins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Puzzle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t('views.settings.plugins.noPlugins')}</p>
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
                              {(isError && plugin.error) || (pluginError?.pluginId === plugin.manifest.id) ? (
                                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm text-red-400 font-medium">
                                      Error: {plugin.error || pluginError?.error}
                                    </p>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => copyErrorToClipboard(plugin.error || pluginError?.error || '')}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                        title="Copy error"
                                      >
                                        <Copy size={14} />
                                      </button>
                                      {pluginError?.pluginId === plugin.manifest.id && (
                                        <button
                                          onClick={() => setPluginError(null)}
                                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                          title="Dismiss"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-red-400/70 mt-1">
                                    {t('views.settings.plugins.checkDevTools')}
                                  </p>
                                </div>
                              ) : null}
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
          )}

          {/* Other Tab */}
          {activeTab === 'other' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('views.settings.other.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('views.settings.other.description')}
                </p>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  <h4 className="font-semibold text-red-500">{t('views.settings.other.dangerZone')}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('views.settings.other.dangerZoneDesc')}
                </p>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (confirm(t('views.settings.other.clearSettingsConfirm'))) {
                      await window.dexteria.settings.clearAllData();
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-2" />
                  {t('views.settings.other.clearSettings')}
                </Button>
              </div>
            </div>
          )}

          {/* Plugin Settings Tabs */}
          {activeTab.startsWith('plugin:') && (() => {
            // Find the matching plugin tab
            const pluginTab = pluginTabs.find(t => t.id === activeTab);
            if (!pluginTab) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>{t('views.settings.plugins.pluginTabNotFound')}</p>
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
