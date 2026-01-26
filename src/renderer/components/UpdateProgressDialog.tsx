/**
 * UpdateProgressDialog
 *
 * Modal dialog showing download and installation progress for app updates.
 */

import React from 'react';
import { Download, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppUpdateProgress } from '../../shared/types/update';

interface UpdateProgressDialogProps {
  progress: AppUpdateProgress | null;
  isDownloading: boolean;
  installerPath: string | null;
  error: string | null;
  onInstallAndRestart: () => void;
  onCancel: () => void;
}

export const UpdateProgressDialog: React.FC<UpdateProgressDialogProps> = ({
  progress,
  isDownloading,
  installerPath,
  error,
  onInstallAndRestart,
  onCancel,
}) => {
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'downloading':
        return <Download className="w-5 h-5 text-primary animate-pulse" />;
      case 'installing':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'checking':
        return 'Checking for updates...';
      case 'downloading':
        return 'Downloading update...';
      case 'installing':
        return 'Installing...';
      case 'ready':
        return 'Ready to install';
      case 'error':
        return 'Error';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-md bg-background border border-border rounded-lg shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold">Updating Dexteria</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {progress ? getPhaseLabel(progress.phase) : 'Preparing...'}
          </p>
        </div>

        {/* Progress Content */}
        <div className="px-6 pb-4">
          {/* Phase indicator */}
          {progress && (
            <div className="flex items-center gap-3 mb-4">
              {getPhaseIcon(progress.phase)}
              <span className="text-sm text-foreground">
                {progress.message}
              </span>
            </div>
          )}

          {/* Progress bar */}
          {progress && progress.phase !== 'error' && progress.phase !== 'ready' && (
            <div className="space-y-2">
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress.percent)}%</span>
                <span>{progress.phase === 'downloading' ? 'Downloading...' : 'Processing...'}</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Ready message */}
          {progress?.phase === 'ready' && installerPath && (
            <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Update downloaded successfully. Click "Install and Restart" to complete the update.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border">
          {progress?.phase === 'ready' && installerPath ? (
            <>
              <button
                onClick={onCancel}
                className={cn(
                  'px-4 py-2 rounded-md',
                  'border border-border',
                  'hover:bg-accent transition-colors',
                  'text-sm text-muted-foreground hover:text-foreground'
                )}
              >
                Later
              </button>
              <button
                onClick={onInstallAndRestart}
                className={cn(
                  'flex items-center gap-2',
                  'px-4 py-2 rounded-md',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors',
                  'font-medium text-sm'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Install and Restart
              </button>
            </>
          ) : error ? (
            <button
              onClick={onCancel}
              className={cn(
                'px-4 py-2 rounded-md',
                'border border-border',
                'hover:bg-accent transition-colors',
                'text-sm'
              )}
            >
              Close
            </button>
          ) : isDownloading ? (
            <button
              onClick={onCancel}
              className={cn(
                'px-4 py-2 rounded-md',
                'border border-border',
                'hover:bg-accent transition-colors',
                'text-sm text-muted-foreground hover:text-foreground'
              )}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
