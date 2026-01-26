/**
 * useUpdater Hook
 *
 * Custom hook for managing app updates
 */

import { useState, useEffect, useCallback } from 'react';
import type { AppUpdateInfo, AppUpdateProgress } from '../../shared/types/update';

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<AppUpdateProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [installerPath, setInstallerPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for background update checks
  useEffect(() => {
    const cleanup = window.dexteria.update.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    return cleanup;
  }, []);

  // Listen for download progress
  useEffect(() => {
    const cleanup = window.dexteria.update.onDownloadProgress((progress) => {
      setDownloadProgress(progress);

      if (progress.phase === 'error') {
        setIsDownloading(false);
        setError(progress.message);
      } else if (progress.phase === 'ready') {
        setIsDownloading(false);
      }
    });

    return cleanup;
  }, []);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    try {
      setError(null);
      const info = await window.dexteria.update.check();
      setUpdateInfo(info);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  // Download update
  const downloadUpdate = useCallback(async () => {
    try {
      setError(null);
      setIsDownloading(true);
      setDownloadProgress(null);

      const result = await window.dexteria.update.download();

      if (result.success && result.installerPath) {
        setInstallerPath(result.installerPath);
        return result.installerPath;
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setIsDownloading(false);
      throw err;
    }
  }, []);

  // Install and restart
  const installAndRestart = useCallback(async (path: string) => {
    try {
      setError(null);
      const result = await window.dexteria.update.installAndRestart(path);

      if (!result.success) {
        throw new Error(result.error || 'Installation failed');
      }

      // If we get here, the app should restart
      // In some cases (like macOS/Linux), user needs to manually install
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  // Skip version
  const skipVersion = useCallback(async (version: string) => {
    try {
      setError(null);
      await window.dexteria.update.skipVersion(version);
      setUpdateInfo(null); // Hide the update notification
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  // Dismiss update notification (remind later)
  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  return {
    updateInfo,
    downloadProgress,
    isDownloading,
    installerPath,
    error,
    checkForUpdates,
    downloadUpdate,
    installAndRestart,
    skipVersion,
    dismissUpdate,
  };
}
