/**
 * Types for the auto-update system
 */

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string;
  downloadUrl: string;
  assetName: string;
  assetSize: number;
  publishedAt: string;
}

export interface AppUpdateProgress {
  phase: 'checking' | 'downloading' | 'installing' | 'ready' | 'error';
  percent: number;
  message: string;
}

export type UpdateChannel = 'stable' | 'beta';

export interface UpdatePreferences {
  autoCheckOnStartup: boolean;
  autoDownload: boolean;
  channel: UpdateChannel;
  lastCheckTime: string | null;
  skipVersion: string | null;
  checkIntervalHours: number;
}

export interface GlobalAppConfig {
  updatePreferences?: UpdatePreferences;
}
