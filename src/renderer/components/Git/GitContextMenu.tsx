/**
 * GitContextMenu Component
 *
 * Right-click context menu for Git actions on tasks.
 */

import React, { useRef, useEffect } from 'react';
import type { Task, TaskBranchMapping } from '../../../shared/types';
import { useTranslation } from 'react-i18next';

interface GitContextMenuProps {
  task: Task;
  mapping: TaskBranchMapping | null;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateBranch: () => void;
  onCheckoutBranch: () => void;
  onDetachBranch: () => void;
  onDeleteBranch: () => void;
  onViewDetails: () => void;
}

export const GitContextMenu: React.FC<GitContextMenuProps> = ({
  task,
  mapping,
  position,
  onClose,
  onCreateBranch,
  onCheckoutBranch,
  onDetachBranch,
  onDeleteBranch,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (position.x + rect.width > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - rect.width - 10;
    }
    if (position.y + rect.height > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - rect.height - 10;
    }
  }

  const hasBranch = mapping !== null;
  const isCheckedOut = mapping?.isCheckedOut ?? false;
  const isMerged = mapping?.isMerged ?? false;

  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }> = ({ icon, label, onClick, disabled = false, danger = false }) => (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          onClick();
          onClose();
        }
      }}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm text-left
        ${disabled ? 'text-gray-500 cursor-not-allowed' : danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/5'}
        transition-colors
      `}
    >
      <span className="w-4 h-4">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const Separator = () => <hr className="border-gray-700 my-1" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs text-gray-400">{t('git.gitActions')}</div>
        <div className="text-sm text-white truncate">{task.title}</div>
        {hasBranch && (
          <div className="text-xs text-blue-400 font-mono truncate mt-1">
            {mapping.branchName}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="py-1">
        {!hasBranch ? (
          // No branch - show create option
          <MenuItem
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            label={t('git.createBranch')}
            onClick={onCreateBranch}
          />
        ) : (
          // Has branch - show management options
          <>
            <MenuItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label={isCheckedOut ? t('git.branchActive') : t('git.checkoutBranch')}
              onClick={onCheckoutBranch}
              disabled={isCheckedOut}
            />

            <MenuItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              label={t('git.viewDetails')}
              onClick={onViewDetails}
            />

            <Separator />

            <MenuItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
              label={t('git.detachBranch')}
              onClick={onDetachBranch}
              disabled={isCheckedOut}
            />

            <MenuItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
              label={t('git.deleteBranch')}
              onClick={onDeleteBranch}
              disabled={isCheckedOut || !isMerged}
              danger
            />
          </>
        )}
      </div>

      {/* Status footer */}
      {hasBranch && (
        <div className="px-3 py-2 border-t border-gray-700 text-xs text-gray-500">
          {isMerged && <span className="text-green-400">{t('git.statusMerged')}</span>}
          {isCheckedOut && !isMerged && <span className="text-blue-400">{t('git.statusActive')}</span>}
          {!isCheckedOut && !isMerged && <span>{t('git.statusNotCheckedOut')}</span>}
        </div>
      )}
    </div>
  );
};
