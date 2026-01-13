/**
 * SettingsModal
 *
 * Modal for configuring project settings including notifications and commands.
 */

import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import {
  X,
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
  Loader2,
} from 'lucide-react';
import type { ProjectSettings, DetectedCommands } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [detectedCommands, setDetectedCommands] = useState<DetectedCommands>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'run' | 'build' | null>(null);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [projectSettings, detected] = await Promise.all([
        window.dexteria.settings.getProject(),
        window.dexteria.settings.detectCommands(),
      ]);
      setSettings(projectSettings as ProjectSettings);
      setDetectedCommands(detected as DetectedCommands);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setLoading(false);
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

  const updateSettings = (patch: Partial<ProjectSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Project Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings ? (
            <>
              {/* Notifications Section */}
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Notifications
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      {settings.notifications.soundOnTaskComplete ? (
                        <Volume2 size={18} className="text-green-400" />
                      ) : (
                        <VolumeX size={18} className="text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">Sound on Task Complete</div>
                        <div className="text-xs text-muted-foreground">Play a beep when Ralph completes a task</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.soundOnTaskComplete}
                      onChange={(e) => updateNotifications('soundOnTaskComplete', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      {settings.notifications.badgeOnTaskComplete ? (
                        <Bell size={18} className="text-green-400" />
                      ) : (
                        <BellOff size={18} className="text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">Badge on Task Complete</div>
                        <div className="text-xs text-muted-foreground">Show app badge when Ralph completes a task</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.badgeOnTaskComplete}
                      onChange={(e) => updateNotifications('badgeOnTaskComplete', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>
                </div>
              </section>

              {/* Commands Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Project Commands
                  </h3>
                  <button
                    onClick={handleDetectCommands}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                  >
                    <RefreshCw size={12} />
                    Auto-Detect
                  </button>
                </div>

                {detectedCommands.packageManager && (
                  <div className="mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                    Detected package manager: <strong>{detectedCommands.packageManager}</strong>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Run Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-green-400" />
                      <span className="font-medium text-sm">Run (Dev Server)</span>
                    </div>
                    <input
                      type="text"
                      value={settings.projectCommands.run.cmd}
                      onChange={(e) => updateCommand('run', 'cmd', e.target.value)}
                      placeholder={detectedCommands.run || 'e.g., npm run dev'}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.projectCommands.run.autoDetect ?? true}
                          onChange={(e) => updateCommand('run', 'autoDetect', e.target.checked)}
                          className="w-3 h-3 accent-primary"
                        />
                        Auto-detect if empty
                      </label>
                      <button
                        onClick={() => handleTestCommand('run')}
                        disabled={testing === 'run'}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded disabled:opacity-50"
                      >
                        {testing === 'run' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Build Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Hammer size={14} className="text-yellow-400" />
                      <span className="font-medium text-sm">Build</span>
                    </div>
                    <input
                      type="text"
                      value={settings.projectCommands.build.cmd}
                      onChange={(e) => updateCommand('build', 'cmd', e.target.value)}
                      placeholder={detectedCommands.build || 'e.g., npm run build'}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.projectCommands.build.autoDetect ?? true}
                          onChange={(e) => updateCommand('build', 'autoDetect', e.target.checked)}
                          className="w-3 h-3 accent-primary"
                        />
                        Auto-detect if empty
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.projectCommands.build.includesInstall ?? true}
                          onChange={(e) => updateCommand('build', 'includesInstall', e.target.checked)}
                          className="w-3 h-3 accent-primary"
                        />
                        Includes install
                      </label>
                      <button
                        onClick={() => handleTestCommand('build')}
                        disabled={testing === 'build'}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded disabled:opacity-50"
                      >
                        {testing === 'build' ? <Loader2 size={12} className="animate-spin" /> : <Hammer size={12} />}
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Install Command */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-blue-400" />
                      <span className="font-medium text-sm">Install</span>
                    </div>
                    <input
                      type="text"
                      value={settings.projectCommands.install.cmd}
                      onChange={(e) => updateCommand('install', 'cmd', e.target.value)}
                      placeholder={detectedCommands.install || 'e.g., npm install'}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={cn(
                    "mt-3 p-3 rounded-lg text-sm flex items-center gap-2",
                    testResult.success
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  )}>
                    {testResult.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                    {testResult.message}
                  </div>
                )}

                {/* Unsafe Commands Toggle */}
                <label className="flex items-center justify-between p-3 mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-yellow-400" />
                    <div>
                      <div className="font-medium text-sm">Allow Unsafe Commands</div>
                      <div className="text-xs text-muted-foreground">Enable commands that might be destructive</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.projectCommands.allowUnsafeCommands}
                    onChange={(e) => setSettings({
                      ...settings,
                      projectCommands: {
                        ...settings.projectCommands,
                        allowUnsafeCommands: e.target.checked,
                      },
                    })}
                    className="w-4 h-4 accent-yellow-400"
                  />
                </label>
              </section>

              {/* Runner Section */}
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Runner
                </h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Default Timeout</div>
                      <div className="text-xs text-muted-foreground">Maximum time for command execution</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.runner.defaultTimeoutSec}
                        onChange={(e) => setSettings({
                          ...settings,
                          runner: { ...settings.runner, defaultTimeoutSec: parseInt(e.target.value) || 1800 },
                        })}
                        min={60}
                        max={7200}
                        className="w-20 px-2 py-1 bg-background border border-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-xs text-muted-foreground">seconds</span>
                    </div>
                  </label>
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No project open. Open a project to configure settings.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !settings}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
