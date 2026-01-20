/**
 * VSCode Service
 *
 * Handles VSCode detection and integration.
 * - Detects if VSCode is installed
 * - Opens folders/files in VSCode
 * - Provides download URLs for installation
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { shell } from 'electron';

/** VSCode status information */
export interface VSCodeStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
}

/** Platform-specific VSCode paths */
const VSCODE_PATHS: Record<string, string[]> = {
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Microsoft VS Code', 'Code.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft VS Code', 'Code.exe'),
    // User install
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
    // System install
    path.join(process.env.PROGRAMFILES || '', 'Microsoft VS Code', 'bin', 'code.cmd'),
  ],
  darwin: [
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    '/usr/local/bin/code',
    path.join(process.env.HOME || '', 'Applications', 'Visual Studio Code.app', 'Contents', 'Resources', 'app', 'bin', 'code'),
  ],
  linux: [
    '/usr/bin/code',
    '/usr/local/bin/code',
    '/snap/bin/code',
    path.join(process.env.HOME || '', '.local', 'bin', 'code'),
  ],
};

/** Platform-specific download URLs */
const DOWNLOAD_URLS: Record<string, string> = {
  win32: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user',
  darwin: 'https://code.visualstudio.com/sha/download?build=stable&os=darwin-universal',
  linux: 'https://code.visualstudio.com/sha/download?build=stable&os=linux-x64',
};

export class VSCodeService {
  private cachedStatus: VSCodeStatus | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Check if VSCode is installed
   */
  async isInstalled(): Promise<boolean> {
    const status = await this.getStatus();
    return status.installed;
  }

  /**
   * Get VSCode installation status with caching
   */
  async getStatus(forceRefresh = false): Promise<VSCodeStatus> {
    const now = Date.now();

    // Return cached result if valid
    if (!forceRefresh && this.cachedStatus && (now - this.lastCheck) < this.CACHE_TTL) {
      return this.cachedStatus;
    }

    const vscodePath = await this.findVSCodePath();
    let version: string | null = null;

    if (vscodePath) {
      version = await this.getVersion(vscodePath);
    }

    this.cachedStatus = {
      installed: !!vscodePath,
      path: vscodePath,
      version,
    };
    this.lastCheck = now;

    return this.cachedStatus;
  }

  /**
   * Clear cached status and re-check
   */
  async refresh(): Promise<VSCodeStatus> {
    this.cachedStatus = null;
    this.lastCheck = 0;
    return this.getStatus(true);
  }

  /**
   * Find VSCode executable path
   */
  async findVSCodePath(): Promise<string | null> {
    const platform = process.platform;
    const paths = VSCODE_PATHS[platform] || [];

    // First, check common paths
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Try to find via command line
    const command = platform === 'win32' ? 'where code' : 'which code';

    return new Promise((resolve) => {
      exec(command, { timeout: 5000 }, (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }

        const foundPath = stdout.trim().split('\n')[0];
        if (foundPath && fs.existsSync(foundPath)) {
          resolve(foundPath);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Get VSCode version
   */
  async getVersion(vscodePath?: string): Promise<string | null> {
    const codePath = vscodePath || await this.findVSCodePath();
    if (!codePath) return null;

    return new Promise((resolve) => {
      exec(`"${codePath}" --version`, { timeout: 10000 }, (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }

        // VSCode --version returns multiple lines, first line is version
        const version = stdout.trim().split('\n')[0];
        resolve(version || null);
      });
    });
  }

  /**
   * Open a folder in VSCode
   */
  async openFolder(folderPath: string): Promise<{ success: boolean; error?: string }> {
    const status = await this.getStatus();

    if (!status.installed || !status.path) {
      return { success: false, error: 'VSCode is not installed' };
    }

    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }

    return new Promise((resolve) => {
      // Use spawn for better cross-platform support
      const args = [folderPath];
      const child = spawn(status.path!, args, {
        detached: true,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });

      child.unref();

      // Give it a moment to start
      setTimeout(() => {
        resolve({ success: true });
      }, 500);

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Open a file in VSCode, optionally at a specific line
   */
  async openFile(filePath: string, line?: number): Promise<{ success: boolean; error?: string }> {
    const status = await this.getStatus();

    if (!status.installed || !status.path) {
      return { success: false, error: 'VSCode is not installed' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    return new Promise((resolve) => {
      // VSCode supports file:line format with -g flag
      const target = line ? `${filePath}:${line}` : filePath;
      const args = line ? ['-g', target] : [target];

      const child = spawn(status.path!, args, {
        detached: true,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });

      child.unref();

      setTimeout(() => {
        resolve({ success: true });
      }, 500);

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Get the download URL for VSCode
   */
  getDownloadUrl(): string {
    return DOWNLOAD_URLS[process.platform] || 'https://code.visualstudio.com/download';
  }

  /**
   * Open the VSCode download page in the default browser
   */
  async openDownloadPage(): Promise<void> {
    await shell.openExternal('https://code.visualstudio.com/download');
  }
}

// Singleton instance
let vscodeServiceInstance: VSCodeService | null = null;

export function initVSCodeService(): VSCodeService {
  if (!vscodeServiceInstance) {
    vscodeServiceInstance = new VSCodeService();
  }
  return vscodeServiceInstance;
}

export function getVSCodeService(): VSCodeService | null {
  return vscodeServiceInstance;
}
