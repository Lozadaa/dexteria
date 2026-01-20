/**
 * OpenCodeInstaller Service
 *
 * Manages downloading, installing, and updating the OpenCode binary.
 * Downloads from GitHub releases based on platform/architecture.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { createWriteStream } from 'fs';

// GitHub release configuration
const GITHUB_REPO = 'sst/opencode';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Asset name mapping for different platforms
// Based on actual GitHub release asset names from sst/opencode
const ASSET_NAMES: Record<string, string> = {
  'win32-x64': 'opencode-windows-x64.zip',
  'darwin-x64': 'opencode-darwin-x64.zip',
  'darwin-arm64': 'opencode-darwin-arm64.zip',
  'linux-x64': 'opencode-linux-x64.tar.gz',
  'linux-arm64': 'opencode-linux-arm64.tar.gz',
};

export interface OpenCodeInstallProgress {
  phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
  percent: number;
  message: string;
}

export type ProgressCallback = (progress: OpenCodeInstallProgress) => void;

/**
 * OpenCode Installer Service
 */
export class OpenCodeInstaller {
  private static _installedVersion: string | null = null;

  /**
   * Get the base directory for Dexteria tools.
   */
  static getToolsDirectory(): string {
    const appName = 'Dexteria';

    let basePath: string;

    switch (process.platform) {
      case 'win32':
        basePath = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        break;
      case 'darwin':
        basePath = path.join(os.homedir(), 'Library', 'Application Support');
        break;
      default: // linux
        basePath = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
        break;
    }

    return path.join(basePath, appName, 'tools', 'opencode');
  }

  /**
   * Get the full path to the OpenCode binary.
   */
  static getBinaryPath(): string {
    const exeName = process.platform === 'win32' ? 'opencode.exe' : 'opencode';
    return path.join(this.getToolsDirectory(), exeName);
  }

  /**
   * Check if OpenCode is installed and working.
   */
  static isInstalled(): boolean {
    const binaryPath = this.getBinaryPath();

    if (!fs.existsSync(binaryPath)) {
      return false;
    }

    // Verify it actually works
    try {
      const result = spawnSync(binaryPath, ['--version'], {
        timeout: 10000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      return result.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the currently installed version of OpenCode.
   */
  static getInstalledVersion(): string | null {
    if (this._installedVersion) {
      return this._installedVersion;
    }

    const binaryPath = this.getBinaryPath();

    if (!fs.existsSync(binaryPath)) {
      return null;
    }

    try {
      const result = spawnSync(binaryPath, ['--version'], {
        timeout: 10000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status === 0 && result.stdout) {
        // Parse version from output (e.g., "opencode version 0.1.0")
        const match = result.stdout.match(/(\d+\.\d+\.\d+)/);
        if (match) {
          this._installedVersion = match[1];
          return this._installedVersion;
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Get the asset name for the current platform.
   */
  private static getAssetName(): string {
    const key = `${process.platform}-${process.arch}`;
    const assetName = ASSET_NAMES[key];

    if (!assetName) {
      throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`);
    }

    return assetName;
  }

  /**
   * Fetch the latest release info from GitHub.
   */
  static async getLatestReleaseInfo(): Promise<{
    version: string;
    assetUrl: string;
    assetName: string;
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
      assets: Array<{
        name: string;
        browser_download_url: string;
      }>;
    }

    const release = await response.json() as GitHubRelease;
    const version = release.tag_name?.replace(/^v/, '') || release.name || 'unknown';
    const targetAssetName = this.getAssetName();

    const asset = release.assets.find((a) => a.name === targetAssetName);

    if (!asset) {
      throw new Error(`Asset not found for platform: ${targetAssetName}`);
    }

    return {
      version,
      assetUrl: asset.browser_download_url,
      assetName: targetAssetName,
    };
  }

  /**
   * Check if an update is available.
   */
  static async checkForUpdates(): Promise<{
    updateAvailable: boolean;
    currentVersion: string | null;
    latestVersion: string;
  }> {
    const currentVersion = this.getInstalledVersion();
    const releaseInfo = await this.getLatestReleaseInfo();

    return {
      updateAvailable: currentVersion !== releaseInfo.version,
      currentVersion,
      latestVersion: releaseInfo.version,
    };
  }

  /**
   * Download and install OpenCode.
   */
  static async install(onProgress?: ProgressCallback): Promise<void> {
    const toolsDir = this.getToolsDirectory();
    const binaryPath = this.getBinaryPath();

    try {
      // Phase: Checking
      onProgress?.({
        phase: 'checking',
        percent: 0,
        message: 'Checking latest OpenCode release...',
      });

      const releaseInfo = await this.getLatestReleaseInfo();
      console.log(`[OpenCodeInstaller] Found release: ${releaseInfo.version}`);

      // Create tools directory
      await fs.promises.mkdir(toolsDir, { recursive: true });

      // Phase: Downloading
      onProgress?.({
        phase: 'downloading',
        percent: 10,
        message: `Downloading OpenCode ${releaseInfo.version}...`,
      });

      const archivePath = path.join(toolsDir, releaseInfo.assetName);
      await this.downloadFile(releaseInfo.assetUrl, archivePath, (percent) => {
        onProgress?.({
          phase: 'downloading',
          percent: 10 + percent * 0.6, // 10-70%
          message: `Downloading OpenCode ${releaseInfo.version}... ${Math.round(percent)}%`,
        });
      });

      // Phase: Extracting
      onProgress?.({
        phase: 'extracting',
        percent: 70,
        message: 'Extracting OpenCode...',
      });

      await this.extractArchive(archivePath, toolsDir);

      // Find and move binary if it was extracted to a subdirectory
      await this.findAndMoveBinary(toolsDir);

      // Clean up archive
      try {
        await fs.promises.unlink(archivePath);
      } catch {
        // Ignore cleanup errors
      }

      // Set executable permissions on Unix
      if (process.platform !== 'win32') {
        await fs.promises.chmod(binaryPath, 0o755);
      }

      // Phase: Verifying
      onProgress?.({
        phase: 'verifying',
        percent: 90,
        message: 'Verifying installation...',
      });

      // Clear cached version
      this._installedVersion = null;

      const isWorking = this.isInstalled();
      if (!isWorking) {
        throw new Error('OpenCode installation verification failed');
      }

      // Phase: Complete
      const version = this.getInstalledVersion();
      onProgress?.({
        phase: 'complete',
        percent: 100,
        message: `OpenCode ${version} installed successfully!`,
      });

      console.log(`[OpenCodeInstaller] Successfully installed OpenCode ${version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({
        phase: 'error',
        percent: 0,
        message: `Installation failed: ${message}`,
      });
      throw error;
    }
  }

  /**
   * Update OpenCode to the latest version.
   */
  static async update(onProgress?: ProgressCallback): Promise<void> {
    // Update is just a re-install
    await this.install(onProgress);
  }

  /**
   * Download a file with progress tracking.
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

    // Use a Promise to handle stream errors properly
    return new Promise((resolve, reject) => {
      const fileStream = createWriteStream(destPath);

      // Handle write stream errors
      fileStream.on('error', (err) => {
        reject(new Error(`Write stream error: ${err.message}`));
      });

      fileStream.on('finish', () => {
        resolve();
      });

      const reader = response.body!.getReader();

      const processChunk = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              fileStream.end();
              break;
            }

            fileStream.write(Buffer.from(value));
            downloadedSize += value.length;

            if (totalSize > 0 && onProgress) {
              onProgress((downloadedSize / totalSize) * 100);
            }
          }
        } catch (err) {
          fileStream.destroy();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };

      processChunk();
    });
  }

  /**
   * Find and move the binary from subdirectory to the target location.
   * GitHub releases often extract to a subdirectory like "opencode_Windows_x86_64/"
   */
  private static async findAndMoveBinary(extractDir: string): Promise<void> {
    const exeName = process.platform === 'win32' ? 'opencode.exe' : 'opencode';
    const targetPath = path.join(extractDir, exeName);

    // If already in the correct location, nothing to do
    if (fs.existsSync(targetPath)) {
      console.log('[OpenCodeInstaller] Binary already at target location:', targetPath);
      return;
    }

    // Search for the binary in subdirectories
    const entries = await fs.promises.readdir(extractDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(extractDir, entry.name, exeName);

        if (fs.existsSync(subPath)) {
          console.log('[OpenCodeInstaller] Found binary at:', subPath);

          // Move binary to the target location
          await fs.promises.rename(subPath, targetPath);
          console.log('[OpenCodeInstaller] Moved binary to:', targetPath);

          // Clean up the now-empty subdirectory
          try {
            await fs.promises.rmdir(path.join(extractDir, entry.name));
            console.log('[OpenCodeInstaller] Cleaned up subdirectory:', entry.name);
          } catch {
            // Ignore if directory is not empty or other errors
          }

          return;
        }
      }
    }

    throw new Error(`Binary not found after extraction: ${exeName}`);
  }

  /**
   * Extract an archive (zip or tar.gz) to a directory.
   */
  private static async extractArchive(archivePath: string, destDir: string): Promise<void> {
    const isZip = archivePath.endsWith('.zip');
    const isTarGz = archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz');

    if (isZip) {
      await this.extractZip(archivePath, destDir);
    } else if (isTarGz) {
      await this.extractTarGz(archivePath, destDir);
    } else {
      throw new Error(`Unsupported archive format: ${archivePath}`);
    }
  }

  /**
   * Extract a zip file using PowerShell on Windows or unzip on Unix.
   */
  private static async extractZip(zipPath: string, destDir: string): Promise<void> {
    if (process.platform === 'win32') {
      // Escape single quotes for PowerShell to prevent command injection
      // In PowerShell, single quotes are escaped by doubling them
      const safeZipPath = zipPath.replace(/'/g, "''");
      const safeDestDir = destDir.replace(/'/g, "''");

      // Use PowerShell to extract on Windows
      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Expand-Archive -Path '${safeZipPath}' -DestinationPath '${safeDestDir}' -Force`,
        ],
        {
          timeout: 60000,
          encoding: 'utf-8',
          windowsHide: true,
        }
      );

      if (result.status !== 0) {
        throw new Error(`Failed to extract zip: ${result.stderr || result.error}`);
      }
    } else {
      // Use unzip on Unix
      const result = spawnSync('unzip', ['-o', zipPath, '-d', destDir], {
        timeout: 60000,
        encoding: 'utf-8',
      });

      if (result.status !== 0) {
        throw new Error(`Failed to extract zip: ${result.stderr || result.error}`);
      }
    }
  }

  /**
   * Extract a tar.gz file using tar.
   */
  private static async extractTarGz(tarPath: string, destDir: string): Promise<void> {
    const result = spawnSync('tar', ['-xzf', tarPath, '-C', destDir], {
      timeout: 60000,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      throw new Error(`Failed to extract tar.gz: ${result.stderr || result.error}`);
    }
  }

  /**
   * Uninstall OpenCode by removing the binary and tools directory.
   */
  static async uninstall(): Promise<void> {
    const toolsDir = this.getToolsDirectory();

    if (fs.existsSync(toolsDir)) {
      await fs.promises.rm(toolsDir, { recursive: true, force: true });
    }

    this._installedVersion = null;
    console.log('[OpenCodeInstaller] OpenCode uninstalled');
  }
}

// Export singleton instance methods
export const isOpenCodeInstalled = () => OpenCodeInstaller.isInstalled();
export const getOpenCodeBinaryPath = () => OpenCodeInstaller.getBinaryPath();
export const installOpenCode = (onProgress?: ProgressCallback) => OpenCodeInstaller.install(onProgress);
export const getOpenCodeVersion = () => OpenCodeInstaller.getInstalledVersion();
export const checkOpenCodeUpdates = () => OpenCodeInstaller.checkForUpdates();
