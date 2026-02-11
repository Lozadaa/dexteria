/**
 * PolicyEditorPanel
 *
 * Visual editor for security policy configuration.
 * Allows editing allowed/blocked paths, command restrictions, and execution limits.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Save,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  Folder,
  Terminal,
  Clock,
  FileText,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button, IconButton, Input, Spinner } from 'adnia-ui';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../i18n/useTranslation';
import type { Policy, PolicyLimits, ShellCommandPolicy } from '../../shared/types';

type PolicySection = 'paths' | 'commands' | 'limits' | 'patterns';

export const PolicyEditorPanel: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<PolicySection>('paths');

  // Load policy on mount
  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.dexteria.policy.get();
      setPolicy(data);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load policy:', err);
      showToast(t('views.policyEditor.loadError'), 'error');
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  // Save policy
  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const result = await window.dexteria.policy.update(policy);
      if (result.success) {
        showToast(t('views.policyEditor.saveSuccess'), 'success');
        setHasChanges(false);
      } else {
        showToast(result.error || t('views.policyEditor.saveError'), 'error');
      }
    } catch (err) {
      showToast(t('views.policyEditor.saveError'), 'error');
    }
    setSaving(false);
  };

  // Update policy helper
  const updatePolicy = (updates: Partial<Policy>) => {
    if (!policy) return;
    setPolicy({ ...policy, ...updates });
    setHasChanges(true);
  };

  // Update limits helper
  const updateLimits = (updates: Partial<PolicyLimits>) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      limits: { ...policy.limits, ...updates },
    });
    setHasChanges(true);
  };

  // Update shell commands helper
  const updateShellCommands = (updates: Partial<ShellCommandPolicy>) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      shellCommands: { ...policy.shellCommands, ...updates },
    });
    setHasChanges(true);
  };

  // Array field helpers
  const addToArray = (field: keyof Policy, value: string) => {
    if (!policy || !value.trim()) return;
    const current = policy[field] as string[];
    if (!current.includes(value.trim())) {
      updatePolicy({ [field]: [...current, value.trim()] });
    }
  };

  const removeFromArray = (field: keyof Policy, index: number) => {
    if (!policy) return;
    const current = policy[field] as string[];
    updatePolicy({ [field]: current.filter((_, i) => i !== index) });
  };

  // Limits array helpers
  const addToLimitsArray = (field: keyof PolicyLimits, value: string) => {
    if (!policy || !value.trim()) return;
    const current = policy.limits[field] as string[];
    if (!current.includes(value.trim())) {
      updateLimits({ [field]: [...current, value.trim()] });
    }
  };

  const removeFromLimitsArray = (field: keyof PolicyLimits, index: number) => {
    if (!policy) return;
    const current = policy.limits[field] as string[];
    updateLimits({ [field]: current.filter((_, i) => i !== index) });
  };

  // Shell commands array helpers
  const addToShellArray = (field: keyof ShellCommandPolicy, value: string) => {
    if (!policy || !value.trim()) return;
    const current = policy.shellCommands[field] as string[];
    if (!current.includes(value.trim())) {
      updateShellCommands({ [field]: [...current, value.trim()] });
    }
  };

  const removeFromShellArray = (field: keyof ShellCommandPolicy, index: number) => {
    if (!policy) return;
    const current = policy.shellCommands[field] as string[];
    updateShellCommands({ [field]: current.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertTriangle size={40} className="mx-auto mb-2 opacity-50" />
          <p>{t('views.policyEditor.noPolicy')}</p>
        </div>
      </div>
    );
  }

  const sections: { id: PolicySection; label: string; icon: React.ReactNode }[] = [
    { id: 'paths', label: t('views.policyEditor.sections.paths'), icon: <Folder size={16} /> },
    { id: 'commands', label: t('views.policyEditor.sections.commands'), icon: <Terminal size={16} /> },
    { id: 'limits', label: t('views.policyEditor.sections.limits'), icon: <Clock size={16} /> },
    { id: 'patterns', label: t('views.policyEditor.sections.patterns'), icon: <FileText size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col bg-background/40">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          <span className="font-medium text-sm">{t('views.policyEditor.title')}</span>
          {hasChanges && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertTriangle size={12} />
              {t('views.policyEditor.unsavedChanges')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={loadPolicy}
            disabled={loading}
            aria-label={t('tooltips.refresh')}
          >
            <RefreshCw size={14} />
          </IconButton>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? <Spinner size="sm" /> : <Save size={14} />}
            {t('actions.save')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-border p-2 space-y-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          {activeSection === 'paths' && (
            <PathsSection
              policy={policy}
              onAddAllowed={(v) => addToArray('allowedPaths', v)}
              onRemoveAllowed={(i) => removeFromArray('allowedPaths', i)}
              onAddBlocked={(v) => addToArray('blockedPaths', v)}
              onRemoveBlocked={(i) => removeFromArray('blockedPaths', i)}
              onAddAllowedGlob={(v) => addToLimitsArray('allowedGlobs', v)}
              onRemoveAllowedGlob={(i) => removeFromLimitsArray('allowedGlobs', i)}
              onAddBlockedGlob={(v) => addToLimitsArray('blockedGlobs', v)}
              onRemoveBlockedGlob={(i) => removeFromLimitsArray('blockedGlobs', i)}
              t={t}
            />
          )}

          {activeSection === 'commands' && (
            <CommandsSection
              policy={policy}
              onAddAllowed={(v) => addToShellArray('allowed', v)}
              onRemoveAllowed={(i) => removeFromShellArray('allowed', i)}
              onAddBlocked={(v) => addToShellArray('blocked', v)}
              onRemoveBlocked={(i) => removeFromShellArray('blocked', i)}
              onAddConfirm={(v) => addToShellArray('requireConfirmation', v)}
              onRemoveConfirm={(i) => removeFromShellArray('requireConfirmation', i)}
              t={t}
            />
          )}

          {activeSection === 'limits' && (
            <LimitsSection
              limits={policy.limits}
              maxFileSize={policy.maxFileSize}
              onUpdateLimits={updateLimits}
              onUpdateMaxFileSize={(size) => updatePolicy({ maxFileSize: size })}
              t={t}
            />
          )}

          {activeSection === 'patterns' && (
            <PatternsSection
              policy={policy}
              onAddPattern={(v) => addToArray('blockedPatterns', v)}
              onRemovePattern={(i) => removeFromArray('blockedPatterns', i)}
              onAddOperation={(v) => addToArray('allowedOperations', v)}
              onRemoveOperation={(i) => removeFromArray('allowedOperations', i)}
              onAddConfirm={(v) => addToArray('requireConfirmation', v)}
              onRemoveConfirm={(i) => removeFromArray('requireConfirmation', i)}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Section Components
// ============================================

interface ArrayEditorProps {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  variant?: 'allowed' | 'blocked' | 'neutral';
}

const ArrayEditor: React.FC<ArrayEditorProps> = ({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  icon,
  variant = 'neutral',
}) => {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue.trim());
      setNewValue('');
    }
  };

  const variantStyles = {
    allowed: 'border-green-500/30 bg-green-500/5',
    blocked: 'border-red-500/30 bg-red-500/5',
    neutral: 'border-border bg-muted/20',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <IconButton variant="ghost" onClick={handleAdd} aria-label={t('actions.add')}>
          <Plus size={16} />
        </IconButton>
      </div>

      {items.length > 0 && (
        <div className={cn('rounded-lg border p-2 space-y-1', variantStyles[variant])}>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/50 text-sm"
            >
              <code className="font-mono text-xs truncate flex-1">{item}</code>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => onRemove(i)}
                aria-label={t('actions.remove')}
              >
                <X size={12} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Paths Section
interface PathsSectionProps {
  policy: Policy;
  onAddAllowed: (v: string) => void;
  onRemoveAllowed: (i: number) => void;
  onAddBlocked: (v: string) => void;
  onRemoveBlocked: (i: number) => void;
  onAddAllowedGlob: (v: string) => void;
  onRemoveAllowedGlob: (i: number) => void;
  onAddBlockedGlob: (v: string) => void;
  onRemoveBlockedGlob: (i: number) => void;
  t: (key: string) => string;
}

const PathsSection: React.FC<PathsSectionProps> = ({
  policy,
  onAddAllowed,
  onRemoveAllowed,
  onAddBlocked,
  onRemoveBlocked,
  onAddAllowedGlob,
  onRemoveAllowedGlob,
  onAddBlockedGlob,
  onRemoveBlockedGlob,
  t,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-1">{t('views.policyEditor.paths.title')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('views.policyEditor.paths.description')}
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <ArrayEditor
        label={t('views.policyEditor.paths.allowed')}
        items={policy.allowedPaths}
        onAdd={onAddAllowed}
        onRemove={onRemoveAllowed}
        placeholder="src/**"
        icon={<Unlock size={14} className="text-green-500" />}
        variant="allowed"
      />

      <ArrayEditor
        label={t('views.policyEditor.paths.blocked')}
        items={policy.blockedPaths}
        onAdd={onAddBlocked}
        onRemove={onRemoveBlocked}
        placeholder=".env"
        icon={<Lock size={14} className="text-red-500" />}
        variant="blocked"
      />
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <ArrayEditor
        label={t('views.policyEditor.paths.allowedGlobs')}
        items={policy.limits.allowedGlobs}
        onAdd={onAddAllowedGlob}
        onRemove={onRemoveAllowedGlob}
        placeholder="**/*.ts"
        icon={<Unlock size={14} className="text-green-500" />}
        variant="allowed"
      />

      <ArrayEditor
        label={t('views.policyEditor.paths.blockedGlobs')}
        items={policy.limits.blockedGlobs}
        onAdd={onAddBlockedGlob}
        onRemove={onRemoveBlockedGlob}
        placeholder="**/*.pem"
        icon={<Lock size={14} className="text-red-500" />}
        variant="blocked"
      />
    </div>
  </div>
);

// Commands Section
interface CommandsSectionProps {
  policy: Policy;
  onAddAllowed: (v: string) => void;
  onRemoveAllowed: (i: number) => void;
  onAddBlocked: (v: string) => void;
  onRemoveBlocked: (i: number) => void;
  onAddConfirm: (v: string) => void;
  onRemoveConfirm: (i: number) => void;
  t: (key: string) => string;
}

const CommandsSection: React.FC<CommandsSectionProps> = ({
  policy,
  onAddAllowed,
  onRemoveAllowed,
  onAddBlocked,
  onRemoveBlocked,
  onAddConfirm,
  onRemoveConfirm,
  t,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-1">{t('views.policyEditor.commands.title')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('views.policyEditor.commands.description')}
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <ArrayEditor
        label={t('views.policyEditor.commands.allowed')}
        items={policy.shellCommands.allowed}
        onAdd={onAddAllowed}
        onRemove={onRemoveAllowed}
        placeholder="npm"
        icon={<CheckCircle size={14} className="text-green-500" />}
        variant="allowed"
      />

      <ArrayEditor
        label={t('views.policyEditor.commands.blocked')}
        items={policy.shellCommands.blocked}
        onAdd={onAddBlocked}
        onRemove={onRemoveBlocked}
        placeholder="rm -rf"
        icon={<AlertTriangle size={14} className="text-red-500" />}
        variant="blocked"
      />
    </div>

    <ArrayEditor
      label={t('views.policyEditor.commands.requireConfirm')}
      items={policy.shellCommands.requireConfirmation}
      onAdd={onAddConfirm}
      onRemove={onRemoveConfirm}
      placeholder="git push"
      icon={<AlertTriangle size={14} className="text-yellow-500" />}
    />
  </div>
);

// Limits Section
interface LimitsSectionProps {
  limits: PolicyLimits;
  maxFileSize: number;
  onUpdateLimits: (updates: Partial<PolicyLimits>) => void;
  onUpdateMaxFileSize: (size: number) => void;
  t: (key: string) => string;
}

const LimitsSection: React.FC<LimitsSectionProps> = ({
  limits,
  maxFileSize,
  onUpdateLimits,
  onUpdateMaxFileSize,
  t,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-1">{t('views.policyEditor.limits.title')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('views.policyEditor.limits.description')}
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('views.policyEditor.limits.maxSteps')}</label>
        <Input
          type="number"
          value={limits.maxStepsPerRun}
          onChange={(e) => onUpdateLimits({ maxStepsPerRun: parseInt(e.target.value) || 0 })}
          min={1}
          max={1000}
        />
        <p className="text-xs text-muted-foreground">{t('views.policyEditor.limits.maxStepsDesc')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('views.policyEditor.limits.maxFiles')}</label>
        <Input
          type="number"
          value={limits.maxFilesPerRun}
          onChange={(e) => onUpdateLimits({ maxFilesPerRun: parseInt(e.target.value) || 0 })}
          min={1}
          max={500}
        />
        <p className="text-xs text-muted-foreground">{t('views.policyEditor.limits.maxFilesDesc')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('views.policyEditor.limits.maxDiffLines')}</label>
        <Input
          type="number"
          value={limits.maxDiffLinesPerRun}
          onChange={(e) => onUpdateLimits({ maxDiffLinesPerRun: parseInt(e.target.value) || 0 })}
          min={1}
          max={100000}
        />
        <p className="text-xs text-muted-foreground">{t('views.policyEditor.limits.maxDiffLinesDesc')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('views.policyEditor.limits.maxRuntime')}</label>
        <Input
          type="number"
          value={limits.maxRuntimeMinutes}
          onChange={(e) => onUpdateLimits({ maxRuntimeMinutes: parseInt(e.target.value) || 0 })}
          min={1}
          max={120}
        />
        <p className="text-xs text-muted-foreground">{t('views.policyEditor.limits.maxRuntimeDesc')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('views.policyEditor.limits.maxFileSize')}</label>
        <Input
          type="number"
          value={Math.round(maxFileSize / 1024)}
          onChange={(e) => onUpdateMaxFileSize((parseInt(e.target.value) || 0) * 1024)}
          min={1}
        />
        <p className="text-xs text-muted-foreground">{t('views.policyEditor.limits.maxFileSizeDesc')}</p>
      </div>
    </div>
  </div>
);

// Patterns Section
interface PatternsSectionProps {
  policy: Policy;
  onAddPattern: (v: string) => void;
  onRemovePattern: (i: number) => void;
  onAddOperation: (v: string) => void;
  onRemoveOperation: (i: number) => void;
  onAddConfirm: (v: string) => void;
  onRemoveConfirm: (i: number) => void;
  t: (key: string) => string;
}

const PatternsSection: React.FC<PatternsSectionProps> = ({
  policy,
  onAddPattern,
  onRemovePattern,
  onAddOperation,
  onRemoveOperation,
  onAddConfirm,
  onRemoveConfirm,
  t,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-1">{t('views.policyEditor.patterns.title')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('views.policyEditor.patterns.description')}
      </p>
    </div>

    <ArrayEditor
      label={t('views.policyEditor.patterns.blocked')}
      items={policy.blockedPatterns}
      onAdd={onAddPattern}
      onRemove={onRemovePattern}
      placeholder="password|secret|api_key"
      icon={<Lock size={14} className="text-red-500" />}
      variant="blocked"
    />

    <ArrayEditor
      label={t('views.policyEditor.patterns.allowedOps')}
      items={policy.allowedOperations}
      onAdd={onAddOperation}
      onRemove={onRemoveOperation}
      placeholder="read_file"
      icon={<CheckCircle size={14} className="text-green-500" />}
      variant="allowed"
    />

    <ArrayEditor
      label={t('views.policyEditor.patterns.requireConfirm')}
      items={policy.requireConfirmation}
      onAdd={onAddConfirm}
      onRemove={onRemoveConfirm}
      placeholder="delete_file"
      icon={<AlertTriangle size={14} className="text-yellow-500" />}
    />
  </div>
);

export default PolicyEditorPanel;
