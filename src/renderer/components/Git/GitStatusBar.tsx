/**
 * GitStatusBar Component
 *
 * Displays the current Git status in the top bar.
 */

import React from 'react';
import { useGitStatus, useGitConfig } from '../../hooks/useGit';

interface GitStatusBarProps {
  className?: string;
  onBranchClick?: () => void;
}

export const GitStatusBar: React.FC<GitStatusBarProps> = ({
  className = '',
  onBranchClick,
}) => {
  const { status, loading } = useGitStatus();
  const { config } = useGitConfig();

  // Don't render if Git is not enabled or not a repo
  if (!config?.gitEnabled || !status?.isRepo) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Determine status indicators
  const hasChanges = status.isDirty;
  const isConflicting = status.isMerging || status.isRebasing;
  const hasRemoteStatus = status.ahead > 0 || status.behind > 0;

  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      {/* Branch indicator */}
      <button
        type="button"
        onClick={onBranchClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors"
        title={`Current branch: ${status.currentBranch || 'unknown'}`}
      >
        {/* Git branch icon */}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <span className="text-gray-300 font-medium">
          {status.currentBranch || 'detached'}
        </span>
      </button>

      {/* Dirty indicator */}
      {hasChanges && (
        <span
          className="flex items-center gap-1 text-yellow-400"
          title={`${status.stagedCount} staged, ${status.modifiedCount} modified, ${status.untrackedCount} untracked`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" />
          </svg>
          <span className="font-mono">
            {status.stagedCount > 0 && `+${status.stagedCount}`}
            {status.modifiedCount > 0 && `~${status.modifiedCount}`}
            {status.untrackedCount > 0 && `?${status.untrackedCount}`}
          </span>
        </span>
      )}

      {/* Ahead/Behind indicator */}
      {hasRemoteStatus && (
        <span
          className="flex items-center gap-1 text-gray-400"
          title={`${status.ahead} ahead, ${status.behind} behind`}
        >
          {status.ahead > 0 && (
            <span className="flex items-center text-green-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {status.ahead}
            </span>
          )}
          {status.behind > 0 && (
            <span className="flex items-center text-red-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {status.behind}
            </span>
          )}
        </span>
      )}

      {/* Merge/Rebase indicator */}
      {isConflicting && (
        <span className="flex items-center gap-1 text-red-400" title={status.isMerging ? 'Merge in progress' : 'Rebase in progress'}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">
            {status.isMerging ? 'MERGING' : 'REBASING'}
          </span>
        </span>
      )}
    </div>
  );
};
