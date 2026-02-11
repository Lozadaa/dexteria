/**
 * GitSettingsPanel Component
 *
 * Settings panel for configuring Git orchestration options.
 */

import React, { useState, useEffect } from 'react';
import { useGitInstalled, useGitConfig, useGitStatus } from '../../hooks/useGit';
import type { GitConfig, GitMode, CodeVisibilityMode, ConflictResolutionMode } from '../../../shared/types';
import { useTranslation } from 'react-i18next';

interface GitSettingsPanelProps {
  onSave?: (config: GitConfig) => Promise<void>;
  className?: string;
}

export const GitSettingsPanel: React.FC<GitSettingsPanelProps> = ({
  onSave,
  className = '',
}) => {
  const { t } = useTranslation();
  const { isInstalled, version, installInstructions, loading: checkingInstall } = useGitInstalled();
  const { config, loading: loadingConfig } = useGitConfig();
  const { status } = useGitStatus();

  // Local state for form
  const [formData, setFormData] = useState<GitConfig>({
    gitEnabled: false,
    gitMode: 'none',
    mainBranch: 'main',
    branchConvention: 'task/{taskId}-{slug}',
    codeVisibilityMode: 'enabled',
    conflictResolutionMode: 'manual',
    protectedBranches: ['main', 'master'],
    maxConflictFileSize: 500,
    lockfilePatterns: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (field: keyof GitConfig, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);

    // Validate conflict resolution mode vs code visibility
    if (field === 'conflictResolutionMode' && value === 'autonomous') {
      setFormData(prev => ({ ...prev, codeVisibilityMode: 'disabled', [field]: value }));
    }
    if (field === 'codeVisibilityMode' && value === 'enabled') {
      setFormData(prev => ({
        ...prev,
        conflictResolutionMode: prev.conflictResolutionMode === 'autonomous' ? 'assisted' : prev.conflictResolutionMode,
        [field]: value,
      }));
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('git.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (checkingInstall || loadingConfig) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4" />
          <div className="h-10 bg-gray-700 rounded" />
          <div className="h-10 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Show installation prompt if Git not installed
  if (!isInstalled) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('git.notInstalled')}
          </h3>
          <p className="text-gray-300 mt-2 text-sm">
            {t('git.required')}
          </p>
          <p className="text-gray-400 mt-2 text-sm font-mono">
            {installInstructions}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{t('git.orchestration')}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {t('git.configureDescription')}
          </p>
        </div>
        {version && (
          <span className="text-xs text-gray-500 font-mono">
            {t('git.version', { version })}
          </span>
        )}
      </div>

      {/* Repository Status */}
      {status && (
        <div className={`p-3 rounded-lg border ${status.isRepo ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className="flex items-center gap-2">
            <span className={status.isRepo ? 'text-green-400' : 'text-gray-400'}>
              {status.isRepo ? t('git.repoDetected') : t('git.notARepo')}
            </span>
            {status.isRepo && status.currentBranch && (
              <span className="text-gray-400 text-sm">
                {t('git.onBranch')} <span className="font-mono text-gray-300">{status.currentBranch}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Enable Git */}
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.gitEnabled}
            onChange={(e) => handleChange('gitEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-white">{t('git.enableOrchestration')}</span>
        </label>

        {formData.gitEnabled && (
          <>
            {/* Git Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('git.operationMode')}
              </label>
              <select
                value={formData.gitMode}
                onChange={(e) => handleChange('gitMode', e.target.value as GitMode)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">{t('git.modeNone')}</option>
                <option value="basic">{t('git.modeBasic')}</option>
                <option value="advanced">{t('git.modeAdvanced')}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.gitMode === 'basic' && t('git.modeBasicDesc')}
                {formData.gitMode === 'advanced' && t('git.modeAdvancedDesc')}
              </p>
            </div>

            {/* Main Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('git.mainBranch')}
              </label>
              <input
                type="text"
                value={formData.mainBranch}
                onChange={(e) => handleChange('mainBranch', e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Review Branch (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('git.reviewBranch')}
              </label>
              <input
                type="text"
                value={formData.reviewBranch || ''}
                onChange={(e) => handleChange('reviewBranch', e.target.value || undefined)}
                placeholder="e.g., develop, staging"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('git.reviewBranchDesc')}
              </p>
            </div>

            {/* Branch Convention */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('git.branchConvention')}
              </label>
              <input
                type="text"
                value={formData.branchConvention}
                onChange={(e) => handleChange('branchConvention', e.target.value)}
                placeholder="task/{taskId}-{slug}"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('git.branchConventionDesc')}
              </p>
            </div>

            {/* Advanced Options */}
            {formData.gitMode === 'advanced' && (
              <>
                <hr className="border-gray-700" />

                {/* Code Visibility Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('git.codeVisibility')}
                  </label>
                  <select
                    value={formData.codeVisibilityMode}
                    onChange={(e) => handleChange('codeVisibilityMode', e.target.value as CodeVisibilityMode)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="enabled">{t('git.codeVisibilityEnabled')}</option>
                    <option value="disabled">{t('git.codeVisibilityDisabled')}</option>
                  </select>
                </div>

                {/* Conflict Resolution Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('git.conflictResolution')}
                  </label>
                  <select
                    value={formData.conflictResolutionMode}
                    onChange={(e) => handleChange('conflictResolutionMode', e.target.value as ConflictResolutionMode)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="manual">{t('git.conflictManual')}</option>
                    <option value="assisted">{t('git.conflictAssisted')}</option>
                    <option value="autonomous" disabled={formData.codeVisibilityMode === 'enabled'}>
                      {t('git.conflictAutonomous')}
                    </option>
                  </select>
                  {formData.conflictResolutionMode === 'autonomous' && (
                    <p className="text-xs text-yellow-400 mt-1">
                      {t('git.autonomousModeWarning')}
                    </p>
                  )}
                </div>

                {/* Protected Branches */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('git.protectedBranches')}
                  </label>
                  <input
                    type="text"
                    value={formData.protectedBranches.join(', ')}
                    onChange={(e) => handleChange('protectedBranches', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="main, master, production"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('git.protectedBranchesDesc')}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          Settings saved successfully
        </div>
      )}

      {/* Save Button */}
      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
};
