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
import * as os from 'os';
import { exec, execSync } from 'child_process';
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
   * Check if VSCode is installed using platform-specific methods
   * - macOS: Check .app bundle exists
   * - Windows: Query registry (doesn't execute anything)
   * - Linux: Use 'which code'
   */
  isInstalledSync(): boolean {
    const platform = os.platform();

    try {
      if (platform === 'darwin') {
        // macOS: Check if VSCode app bundle exists
        return fs.existsSync('/Applications/Visual Studio Code.app') ||
               fs.existsSync(path.join(os.homedir(), 'Applications', 'Visual Studio Code.app'));
      }

      if (platform === 'win32') {
        // Windows: Query registry for VSCode installation (safe, doesn't open VSCode)
        try {
          execSync(
            'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Visual Studio Code"',
            { stdio: 'ignore' }
          );
          return true;
        } catch {
          // Try HKLM as well for system-wide installation
          try {
            execSync(
              'reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Visual Studio Code"',
              { stdio: 'ignore' }
            );
            return true;
          } catch {
            return false;
          }
        }
      }

      if (platform === 'linux') {
        // Linux: Use 'which code' - just locates the path
        execSync('which code', { stdio: 'ignore' });
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  /**
   * Check if VSCode is installed (async wrapper)
   */
  async isInstalled(): Promise<boolean> {
    return this.isInstalledSync();
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

    const installed = this.isInstalledSync();
    const vscodePath = installed ? await this.findVSCodePath() : null;

    this.cachedStatus = {
      installed,
      path: vscodePath,
      version: null, // Skip version check to avoid opening VSCode
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
   * Find VSCode executable path (for opening files/folders)
   */
  async findVSCodePath(): Promise<string | null> {
    const platform = os.platform();
    const paths = VSCODE_PATHS[platform] || [];

    // Check known paths first
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Fallback: try to find 'code' command
    if (platform === 'win32') {
      // On Windows, try 'where code' to find the CLI
      try {
        const result = execSync('where code', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const foundPath = result.trim().split('\n')[0];
        if (foundPath && fs.existsSync(foundPath)) {
          return foundPath;
        }
      } catch {
        // Not found via where
      }
    } else {
      // On Unix, try 'which code'
      try {
        const result = execSync('which code', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const foundPath = result.trim();
        if (foundPath && fs.existsSync(foundPath)) {
          return foundPath;
        }
      } catch {
        // Not found via which
      }
    }

    // If installed but path not found, return 'code' to use shell command
    if (this.isInstalledSync()) {
      return 'code';
    }

    return null;
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

    if (!status.installed) {
      return { success: false, error: 'VSCode is not installed' };
    }

    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }

    // Try using VSCode's URL scheme first (most reliable method)
    // Format: vscode://file/path/to/folder
    const normalizedPath = folderPath.replace(/\\/g, '/');
    const vscodeUrl = `vscode://file/${normalizedPath}`;

    console.log('[VSCode] Trying URL scheme:', vscodeUrl);

    try {
      await shell.openExternal(vscodeUrl);
      console.log('[VSCode] URL scheme succeeded');
      return { success: true };
    } catch (urlError) {
      console.log('[VSCode] URL scheme failed, trying command:', urlError);
    }

    // Fallback to command line
    return new Promise((resolve) => {
      const command = `code "${folderPath}"`;
      console.log('[VSCode] Executing command:', command);

      exec(command, { windowsHide: true }, (error, _stdout, stderr) => {
        if (error) {
          console.log('[VSCode] Primary command failed:', error.message);
          console.log('[VSCode] stderr:', stderr);

          // If 'code' command fails, try opening the folder with the detected path
          const codePath = status.path;
          if (codePath && codePath !== 'code') {
            const fallbackCmd = `"${codePath}" "${folderPath}"`;
            console.log('[VSCode] Trying fallback command:', fallbackCmd);

            exec(fallbackCmd, { windowsHide: true }, (err2, _stdout2, stderr2) => {
              if (err2) {
                console.log('[VSCode] Fallback command failed:', err2.message);
                console.log('[VSCode] stderr:', stderr2);
                resolve({ success: false, error: err2.message });
              } else {
                console.log('[VSCode] Fallback command succeeded');
                resolve({ success: true });
              }
            });
          } else {
            resolve({ success: false, error: error.message });
          }
        } else {
          console.log('[VSCode] Command succeeded');
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Open a file in VSCode, optionally at a specific line
   */
  async openFile(filePath: string, line?: number): Promise<{ success: boolean; error?: string }> {
    const status = await this.getStatus();

    if (!status.installed) {
      return { success: false, error: 'VSCode is not installed' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    return new Promise((resolve) => {
      // VSCode supports file:line format with -g flag
      const command = line
        ? `code -g "${filePath}:${line}"`
        : `code "${filePath}"`;

      exec(command, { windowsHide: true }, (error) => {
        if (error) {
          // If 'code' command fails, try with detected path
          const codePath = status.path;
          if (codePath && codePath !== 'code') {
            const fallbackCommand = line
              ? `"${codePath}" -g "${filePath}:${line}"`
              : `"${codePath}" "${filePath}"`;

            exec(fallbackCommand, { windowsHide: true }, (err2) => {
              if (err2) {
                resolve({ success: false, error: err2.message });
              } else {
                resolve({ success: true });
              }
            });
          } else {
            resolve({ success: false, error: error.message });
          }
        } else {
          resolve({ success: true });
        }
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
