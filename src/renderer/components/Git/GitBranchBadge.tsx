/**
 * GitBranchBadge Component
 *
 * Displays a Git branch badge on task cards showing the associated branch name.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface GitBranchBadgeProps {
  branchName: string;
  isCheckedOut?: boolean;
  isMerged?: boolean;
  onClick?: () => void;
  className?: string;
}

export const GitBranchBadge: React.FC<GitBranchBadgeProps> = ({
  branchName,
  isCheckedOut = false,
  isMerged = false,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation();

  // Truncate branch name if too long
  const displayName = branchName.length > 25
    ? `${branchName.substring(0, 22)}...`
    : branchName;

  // Determine badge style based on state
  const getBadgeStyle = () => {
    if (isMerged) {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
    if (isCheckedOut) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (isMerged) {
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (isCheckedOut) {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    }
    return null;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono
        border transition-colors
        ${getBadgeStyle()}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        ${className}
      `}
      title={`${t('git.branchTooltip', { name: branchName })}${isCheckedOut ? ` ${t('git.checkedOut')}` : ''}${isMerged ? ` ${t('git.merged')}` : ''}`}
    >
      {/* Git branch icon */}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
      <span className="truncate max-w-[150px]">{displayName}</span>
      {getStatusIcon()}
    </button>
  );
};
