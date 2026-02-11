/**
 * UpdateNotificationToast
 *
 * Specialized toast notification for app updates.
 * Shows when a new version is available with action buttons.
 */

import React from 'react';
import { Download, X, ArrowUpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import type { AppUpdateInfo } from '../../shared/types/update';

interface UpdateNotificationToastProps {
  updateInfo: AppUpdateInfo;
  onDownload: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({
  updateInfo,
  onDownload,
  onSkip,
  onDismiss,
}) => {
  const { t } = useTranslation();

  // Format file size
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Truncate release notes if too long
  const truncateNotes = (notes: string, maxLength: number = 150): string => {
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'w-96 bg-background border-2 border-primary rounded-lg shadow-2xl',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <ArrowUpCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('views.settings.updates.updateAvailable')}</h3>
            <p className="text-sm text-muted-foreground">
              Dexteria {updateInfo.latestVersion}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('tooltips.dismiss')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Release notes preview */}
        {updateInfo.releaseNotes && (
          <div className="text-sm text-muted-foreground">
            <p className="line-clamp-3">
              {truncateNotes(updateInfo.releaseNotes)}
            </p>
          </div>
        )}

        {/* Download size */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('views.settings.updates.downloadSize')}</span>
          <span className="font-medium">{formatSize(updateInfo.assetSize)}</span>
        </div>

        {/* Version comparison */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('views.settings.updates.currentVersion')}</span>
          <span className="font-medium">{updateInfo.currentVersion}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-3 border-t border-border">
        <button
          onClick={onDownload}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-4 py-2 rounded-md',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'font-medium text-sm'
          )}
        >
          <Download className="w-4 h-4" />
          {t('views.settings.updates.download')}
        </button>
        <button
          onClick={onSkip}
          className={cn(
            'px-4 py-2 rounded-md',
            'border border-border',
            'hover:bg-accent transition-colors',
            'text-sm text-muted-foreground hover:text-foreground'
          )}
        >
          {t('views.settings.updates.skip')}
        </button>
      </div>
    </div>
  );
};
