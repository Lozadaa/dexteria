/**
 * AppUpdaterService
 *
 * Manages checking for updates, downloading, and installing new versions of Dexteria.
 * Downloads from GitHub releases based on platform/architecture.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import * as semver from 'semver';
import type {
  AppUpdateInfo,
  AppUpdateProgress,
  UpdatePreferences,
  GlobalAppConfig,
} from '../../shared/types/update';

// GitHub release configuration
const GITHUB_REPO = 'Lozadaa/dexteria'; // Update with actual repo owner/name
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Asset name mapping for different platforms
// Based on electron-builder configuration
const ASSET_PATTERNS: Record<string, RegExp> = {
  'win32-x64': /Dexteria-Setup\.exe$/,
  'darwin-x64': /Dexteria-macOS\.dmg$/,
  'darwin-arm64': /Dexteria-macOS\.dmg$/, // Same DMG for both architectures
  'linux-x64': /Dexteria-Linux\.AppImage$/,
  'linux-arm64': /Dexteria-Linux\.AppImage$/, // Same AppImage for both
};

export type ProgressCallback = (progress: AppUpdateProgress) => void;

/**
 * App Updater Service
 */
export class AppUpdaterService {
  /**
   * Get the path to global config file
   */
  private static getConfigPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'dexteria-config.json');
  }

  /**
   * Load global config
   */
  private static loadConfig(): GlobalAppConfig {
    const configPath = this.getConfigPath();

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as GlobalAppConfig;
      }
    } catch (error) {
      console.error('[AppUpdater] Failed to load config:', error);
    }

    return {};
  }

  /**
   * Save global config
   */
  private static saveConfig(config: GlobalAppConfig): void {
    const configPath = this.getConfigPath();

    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('[AppUpdater] Failed to save config:', error);
    }
  }

  /**
   * Get default update preferences
   */
  private static getDefaultPreferences(): UpdatePreferences {
    return {
      autoCheckOnStartup: true,
      autoDownload: false,
      channel: 'stable',
      lastCheckTime: null,
      skipVersion: null,
      checkIntervalHours: 24,
    };
  }

  /**
   * Get update preferences
   */
  static getUpdatePreferences(): UpdatePreferences {
    const config = this.loadConfig();
    return {
      ...this.getDefaultPreferences(),
      ...config.updatePreferences,
    };
  }

  /**
   * Set update preferences
   */
  static setUpdatePreferences(prefs: Partial<UpdatePreferences>): void {
    const config = this.loadConfig();
    config.updatePreferences = {
      ...this.getUpdatePreferences(),
      ...prefs,
    };
    this.saveConfig(config);
  }

  /**
   * Get the asset pattern for the current platform
   */
  private static getAssetPattern(): RegExp {
    const key = `${process.platform}-${process.arch}`;
    const pattern = ASSET_PATTERNS[key];

    if (!pattern) {
      throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`);
    }

    return pattern;
  }

  /**
   * Fetch the latest release info from GitHub
   */
  static async getLatestReleaseInfo(): Promise<{
    version: string;
    assetUrl: string;
    assetName: string;
    assetSize: number;
    releaseNotes: string;
    publishedAt: string;
  }> {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Dexteria-App',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch release info: ${response.statusText}`);
    }

    interface GitHubRelease {
      tag_name?: string;
      name?: string;
      body?: string;
      published_at?: string;
      assets: Array<{
        name: string;
        size: number;
        browser_download_url: string;
      }>;
    }

    const release = await response.json() as GitHubRelease;
    const version = release.tag_name?.replace(/^v/, '') || release.name || 'unknown';
    const assetPattern = this.getAssetPattern();

    const asset = release.assets.find((a) => assetPattern.test(a.name));

    if (!asset) {
      throw new Error(`Asset not found for platform: ${process.platform}-${process.arch}`);
    }

    return {
      version,
      assetUrl: asset.browser_download_url,
      assetName: asset.name,
      assetSize: asset.size,
      releaseNotes: release.body || 'No release notes available',
      publishedAt: release.published_at || new Date().toISOString(),
    };
  }

  /**
   * Check if an update is available
   */
  static async checkForUpdates(): Promise<AppUpdateInfo> {
    const currentVersion = app.getVersion();

    try {
      const releaseInfo = await this.getLatestReleaseInfo();

      // Update last check time
      this.setUpdatePreferences({
        lastCheckTime: new Date().toISOString(),
      });

      // Compare versions using semver
      const updateAvailable = semver.gt(releaseInfo.version, currentVersion);

      return {
        currentVersion,
        latestVersion: releaseInfo.version,
        updateAvailable,
        releaseNotes: releaseInfo.releaseNotes,
        downloadUrl: releaseInfo.assetUrl,
        assetName: releaseInfo.assetName,
        assetSize: releaseInfo.assetSize,
        publishedAt: releaseInfo.publishedAt,
      };
    } catch (error) {
      console.error('[AppUpdater] Failed to check for updates:', error);
      throw error;
    }
  }

  /**
   * Download update with progress tracking
   */
  static async downloadUpdate(onProgress?: ProgressCallback): Promise<string> {
    try {
      // Phase: Checking
      onProgress?.({
        phase: 'checking',
        percent: 0,
        message: 'Checking for latest release...',
      });

      const releaseInfo = await this.getLatestReleaseInfo();
      console.log(`[AppUpdater] Found release: ${releaseInfo.version}`);

      // Create temp directory for download
      const tempDir = path.join(app.getPath('temp'), 'dexteria-update');
      await fs.promises.mkdir(tempDir, { recursive: true });

      const installerPath = path.join(tempDir, releaseInfo.assetName);

      // Phase: Downloading
      onProgress?.({
        phase: 'downloading',
        percent: 10,
        message: `Downloading Dexteria ${releaseInfo.version}...`,
      });

      await this.downloadFile(releaseInfo.assetUrl, installerPath, (percent) => {
        onProgress?.({
          phase: 'downloading',
          percent: 10 + percent * 0.9, // 10-100%
          message: `Downloading Dexteria ${releaseInfo.version}... ${Math.round(percent)}%`,
        });
      });

      // Phase: Ready
      onProgress?.({
        phase: 'ready',
        percent: 100,
        message: 'Download complete. Ready to install.',
      });

      console.log(`[AppUpdater] Download complete: ${installerPath}`);
      return installerPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({
        phase: 'error',
        percent: 0,
        message: `Download failed: ${message}`,
      });
      throw error;
    }
  }

  /**
   * Install update and restart app
   */
  static async installUpdate(installerPath: string): Promise<void> {
    console.log(`[AppUpdater] Installing update from: ${installerPath}`);

    if (!fs.existsSync(installerPath)) {
      throw new Error('Installer file not found');
    }

    // Platform-specific installation
    switch (process.platform) {
      case 'win32':
        // Launch NSIS installer with silent flag
        spawn(installerPath, ['/SILENT'], {
          detached: true,
          stdio: 'ignore',
        }).unref();
        break;

      case 'darwin':
        // For macOS, we'll need to mount the DMG and copy the app
        // For now, open the DMG and show instructions
        const { shell } = require('electron');
        shell.openPath(installerPath);
        throw new Error('Please manually install the update by dragging Dexteria to Applications');

      case 'linux':
        // For AppImage, replace the current executable
        // This is complex and depends on how the app was launched
        // For now, open the file location
        const { shell: linuxShell } = require('electron');
        linuxShell.showItemInFolder(installerPath);
        throw new Error('Please manually replace the AppImage and restart');

      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * Download a file with progress tracking
   */
  private static async downloadFile(
    url: string,
    destPath: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Dexteria-App',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedSize = 0;

    if (!response.body) {
      throw new Error('No response body');
    }

    return new Promise((resolve, reject) => {
      const fileStream = createWriteStream(destPath);

      fileStream.on('error', (err) => {
        reject(err);
      });

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      const reader = response.body!.getReader();

      const pump = async (): Promise<void> => {
        try {
          const { done, value } = await reader.read();

          if (done) {
            fileStream.end();
            return;
          }

          downloadedSize += value.length;
          fileStream.write(value);

          if (totalSize > 0 && onProgress) {
            const percent = (downloadedSize / totalSize) * 100;
            onProgress(percent);
          }

          pump();
        } catch (error) {
          fileStream.destroy();
          reject(error);
        }
      };

      pump();
    });
  }
}
