/**
 * Git Hooks
 *
 * React hooks for Git status, branches, and task-branch mappings.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  GitStatus,
  BranchInfo,
  TaskBranchMapping,
  GitConfig,
  ConflictInfo,
  GitOperationLog,
} from '../../shared/types';

const POLL_INTERVAL = 5000; // Poll every 5 seconds

// ============================================
// useGitInstalled - Check if Git is available
// ============================================

export interface GitInstalledState {
  isInstalled: boolean | null;
  version: string | null;
  installInstructions: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGitInstalled(): GitInstalledState {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [installInstructions, setInstallInstructions] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const installed = await window.dexteria.git.isInstalled();
      setIsInstalled(installed);

      if (installed) {
        const ver = await window.dexteria.git.getVersion();
        setVersion(ver);
      } else {
        const instructions = await window.dexteria.git.getInstallInstructions();
        setInstallInstructions(instructions);
      }
    } catch (err) {
      console.error('Failed to check Git installation:', err);
      setIsInstalled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isInstalled,
    version,
    installInstructions,
    loading,
    refresh,
  };
}

// ============================================
// useGitStatus - Repository status
// ============================================

export interface GitStatusState {
  status: GitStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGitStatus(pollInterval = POLL_INTERVAL): GitStatusState {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const gitStatus = await window.dexteria.git.getStatus();
      setStatus(gitStatus);
      setError(null);
    } catch (err) {
      console.error('Failed to get Git status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get Git status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollInterval > 0) {
      const interval = setInterval(refresh, pollInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, pollInterval]);

  return {
    status,
    loading,
    error,
    refresh,
  };
}

// ============================================
// useGitBranches - Branch management
// ============================================

export interface GitBranchesState {
  branches: BranchInfo[];
  currentBranch: BranchInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBranch: (name: string, base?: string) => Promise<boolean>;
  checkoutBranch: (name: string) => Promise<boolean>;
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>;
}

export function useGitBranches(): GitBranchesState {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const branchList = await window.dexteria.git.listBranches(true);
      setBranches(branchList);
      setError(null);
    } catch (err) {
      console.error('Failed to list branches:', err);
      setError(err instanceof Error ? err.message : 'Failed to list branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentBranch = branches.find((b) => b.isCurrent) || null;

  const createBranch = useCallback(async (name: string, base?: string): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.createBranch(name, base);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to create branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to create branch');
      return false;
    }
  }, [refresh]);

  const checkoutBranch = useCallback(async (name: string): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.checkoutBranch(name);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to checkout branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to checkout branch');
      return false;
    }
  }, [refresh]);

  const deleteBranch = useCallback(async (name: string, force = false): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.deleteBranch(name, force);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
      return false;
    }
  }, [refresh]);

  return {
    branches,
    currentBranch,
    loading,
    error,
    refresh,
    createBranch,
    checkoutBranch,
    deleteBranch,
  };
}

// ============================================
// useTaskBranches - Task-branch mappings
// ============================================

export interface TaskBranchesState {
  mappings: TaskBranchMapping[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTaskBranch: (taskId: string) => TaskBranchMapping | undefined;
  createTaskBranch: (taskId: string, taskTitle: string) => Promise<{ success: boolean; branchName?: string; error?: string }>;
  checkoutTaskBranch: (taskId: string) => Promise<boolean>;
  deleteTaskBranch: (taskId: string, force?: boolean) => Promise<boolean>;
}

export function useTaskBranches(): TaskBranchesState {
  const [mappings, setMappings] = useState<TaskBranchMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const allMappings = await window.dexteria.git.getAllTaskBranches();
      setMappings(allMappings);
      setError(null);
    } catch (err) {
      console.error('Failed to get task branches:', err);
      setError(err instanceof Error ? err.message : 'Failed to get task branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTaskBranch = useCallback((taskId: string) => {
    return mappings.find((m) => m.taskId === taskId);
  }, [mappings]);

  const createTaskBranch = useCallback(async (taskId: string, taskTitle: string) => {
    try {
      const result = await window.dexteria.git.createTaskBranch({
        taskId,
        taskTitle,
        checkout: true,
      });
      if (result.success) {
        await refresh();
      }
      return result;
    } catch (err) {
      console.error('Failed to create task branch:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create task branch',
      };
    }
  }, [refresh]);

  const checkoutTaskBranch = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.checkoutTaskBranch(taskId);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to checkout task branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to checkout task branch');
      return false;
    }
  }, [refresh]);

  const deleteTaskBranch = useCallback(async (taskId: string, force = false): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.deleteTaskBranch(taskId, force);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to delete task branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task branch');
      return false;
    }
  }, [refresh]);

  return {
    mappings,
    loading,
    error,
    refresh,
    getTaskBranch,
    createTaskBranch,
    checkoutTaskBranch,
    deleteTaskBranch,
  };
}

// ============================================
// useGitConfig - Git configuration
// ============================================

export interface GitConfigState {
  config: GitConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGitConfig(): GitConfigState {
  const [config, setConfig] = useState<GitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const gitConfig = await window.dexteria.git.getConfig();
      setConfig(gitConfig);
      setError(null);
    } catch (err) {
      console.error('Failed to get Git config:', err);
      setError(err instanceof Error ? err.message : 'Failed to get Git config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    config,
    loading,
    error,
    refresh,
  };
}

// ============================================
// useGitConflicts - Merge conflicts
// ============================================

export interface GitConflictsState {
  conflicts: ConflictInfo[];
  hasConflicts: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resolveConflict: (filePath: string, resolution: 'ours' | 'theirs' | 'manual', content?: string) => Promise<boolean>;
  abortMerge: () => Promise<boolean>;
}

export function useGitConflicts(): GitConflictsState {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const conflictList = await window.dexteria.git.getConflicts();
      setConflicts(conflictList);
      setError(null);
    } catch (err) {
      console.error('Failed to get conflicts:', err);
      setError(err instanceof Error ? err.message : 'Failed to get conflicts');
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveConflict = useCallback(async (
    filePath: string,
    resolution: 'ours' | 'theirs' | 'manual',
    content?: string
  ): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.resolveConflict({
        filePath,
        resolution,
        manualContent: content,
      });
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
      return false;
    }
  }, [refresh]);

  const abortMerge = useCallback(async (): Promise<boolean> => {
    try {
      const result = await window.dexteria.git.abortMerge();
      if (result.success) {
        setConflicts([]);
      }
      return result.success;
    } catch (err) {
      console.error('Failed to abort merge:', err);
      setError(err instanceof Error ? err.message : 'Failed to abort merge');
      return false;
    }
  }, []);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    loading,
    error,
    refresh,
    resolveConflict,
    abortMerge,
  };
}

// ============================================
// useGitLogs - Operation history
// ============================================

export interface GitLogsState {
  logs: GitOperationLog[];
  loading: boolean;
  error: string | null;
  refresh: (limit?: number, taskId?: string) => Promise<void>;
}

export function useGitLogs(initialLimit = 50, taskId?: string): GitLogsState {
  const [logs, setLogs] = useState<GitOperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (limit = initialLimit, filterTaskId = taskId) => {
    try {
      setLoading(true);
      const logList = await window.dexteria.git.getOperationLogs(limit, filterTaskId);
      setLogs(logList);
      setError(null);
    } catch (err) {
      console.error('Failed to get Git logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to get Git logs');
    } finally {
      setLoading(false);
    }
  }, [initialLimit, taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    logs,
    loading,
    error,
    refresh,
  };
}
