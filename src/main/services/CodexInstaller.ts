/**
 * CodexInstaller Service
 *
 * Manages installing and verifying OpenAI's Codex CLI.
 * Installs via npm: npm i -g @openai/codex
 *
 * @see https://developers.openai.com/codex/cli/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, spawnSync } from 'child_process';

// npm package name
const NPM_PACKAGE = '@openai/codex';

export interface CodexInstallProgress {
  phase: 'checking' | 'installing' | 'verifying' | 'complete' | 'error';
  percent: number;
  message: string;
}

export type ProgressCallback = (progress: CodexInstallProgress) => void;

/**
 * Codex CLI Installer Service
 */
export class CodexInstaller {
  private static _installedVersion: string | null = null;

  /**
   * Get the path where npm global packages are installed.
   */
  static getNpmGlobalPrefix(): string {
    try {
      const result = spawnSync('npm', ['config', 'get', 'prefix'], {
        shell: true,
        timeout: 10000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status === 0 && result.stdout) {
        return result.stdout.trim();
      }
    } catch {
      // Fallback to default locations
    }

    // Default fallback paths
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || os.homedir(), 'npm');
    }
    return '/usr/local';
  }

  /**
   * Get the full path to the Codex binary.
   */
  static getBinaryPath(): string {
    const prefix = this.getNpmGlobalPrefix();

    if (process.platform === 'win32') {
      return path.join(prefix, 'codex.cmd');
    }
    return path.join(prefix, 'bin', 'codex');
  }

  /**
   * Check if Codex CLI is installed and working.
   */
  static isInstalled(): boolean {
    // First try to find it in PATH
    try {
      const result = spawnSync('codex', ['--version'], {
        shell: true,
        timeout: 15000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status === 0 || (result.stdout && result.stdout.length > 0)) {
        return true;
      }
    } catch {
      // Try the explicit path
    }

    // Try explicit binary path
    const binaryPath = this.getBinaryPath();
    if (!fs.existsSync(binaryPath)) {
      return false;
    }

    try {
      const result = spawnSync(binaryPath, ['--version'], {
        timeout: 15000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      return result.status === 0 || Boolean(result.stdout && result.stdout.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Get the currently installed version of Codex CLI.
   */
  static getInstalledVersion(): string | null {
    if (this._installedVersion) {
      return this._installedVersion;
    }

    try {
      const result = spawnSync('codex', ['--version'], {
        shell: true,
        timeout: 15000,
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status === 0 && result.stdout) {
        // Parse version from output
        const match = result.stdout.match(/(\d+\.\d+\.\d+)/);
        if (match) {
          this._installedVersion = match[1];
          return this._installedVersion;
        }
        // If no semver found, return the trimmed output
        const trimmed = result.stdout.trim();
        if (trimmed) {
          this._installedVersion = trimmed;
          return this._installedVersion;
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Check if npm is available.
   */
  static isNpmAvailable(): boolean {
    try {
      const result = spawnSync('npm', ['--version'], {
        shell: true,
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
   * Install Codex CLI using npm.
   */
  static async install(onProgress?: ProgressCallback): Promise<void> {
    try {
      // Phase: Checking
      onProgress?.({
        phase: 'checking',
        percent: 0,
        message: 'Checking npm availability...',
      });

      if (!this.isNpmAvailable()) {
        throw new Error('npm is not available. Please install Node.js first.');
      }

      // Check if already installed
      if (this.isInstalled()) {
        const version = this.getInstalledVersion();
        onProgress?.({
          phase: 'complete',
          percent: 100,
          message: `Codex CLI ${version || ''} is already installed!`,
        });
        return;
      }

      // Phase: Installing
      onProgress?.({
        phase: 'installing',
        percent: 10,
        message: 'Installing Codex CLI via npm...',
      });

      await this.runNpmInstall(onProgress);

      // Phase: Verifying
      onProgress?.({
        phase: 'verifying',
        percent: 90,
        message: 'Verifying installation...',
      });

      // Clear cached version
      this._installedVersion = null;

      // Give npm a moment to finalize
      await new Promise(resolve => setTimeout(resolve, 1000));

      const isWorking = this.isInstalled();
      if (!isWorking) {
        throw new Error('Codex CLI installation verification failed. You may need to restart your terminal or add npm global bin to PATH.');
      }

      // Phase: Complete
      const version = this.getInstalledVersion();
      onProgress?.({
        phase: 'complete',
        percent: 100,
        message: `Codex CLI ${version || ''} installed successfully!`,
      });

      console.log(`[CodexInstaller] Successfully installed Codex CLI ${version}`);
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
   * Run npm install -g @openai/codex
   */
  private static runNpmInstall(onProgress?: ProgressCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[CodexInstaller] Running: npm install -g ${NPM_PACKAGE}`);

      const proc = spawn('npm', ['install', '-g', NPM_PACKAGE], {
        shell: true,
        windowsHide: true,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';
      let progressPercent = 10;

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('[CodexInstaller] npm:', chunk.trim());

        // Update progress based on npm output
        if (chunk.includes('added') || chunk.includes('packages')) {
          progressPercent = Math.min(80, progressPercent + 20);
          onProgress?.({
            phase: 'installing',
            percent: progressPercent,
            message: 'Installing dependencies...',
          });
        }
      });

      proc.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // npm often writes progress to stderr
        if (!chunk.includes('WARN') && !chunk.includes('npm')) {
          console.log('[CodexInstaller] npm stderr:', chunk.trim());
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to run npm: ${err.message}`));
      });
    });
  }

  /**
   * Update Codex CLI to the latest version.
   */
  static async update(onProgress?: ProgressCallback): Promise<void> {
    // Update is just a re-install with @latest
    try {
      onProgress?.({
        phase: 'checking',
        percent: 0,
        message: 'Checking for updates...',
      });

      if (!this.isNpmAvailable()) {
        throw new Error('npm is not available.');
      }

      onProgress?.({
        phase: 'installing',
        percent: 10,
        message: 'Updating Codex CLI...',
      });

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('npm', ['install', '-g', `${NPM_PACKAGE}@latest`], {
          shell: true,
          windowsHide: true,
          env: { ...process.env },
        });

        let stderr = '';

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`npm update failed: ${stderr}`));
          }
        });

        proc.on('error', reject);
      });

      // Clear cached version
      this._installedVersion = null;

      const version = this.getInstalledVersion();
      onProgress?.({
        phase: 'complete',
        percent: 100,
        message: `Codex CLI updated to ${version || 'latest'}!`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress?.({
        phase: 'error',
        percent: 0,
        message: `Update failed: ${message}`,
      });
      throw error;
    }
  }

  /**
   * Uninstall Codex CLI.
   */
  static async uninstall(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npm', ['uninstall', '-g', NPM_PACKAGE], {
        shell: true,
        windowsHide: true,
      });

      proc.on('close', (code) => {
        this._installedVersion = null;
        if (code === 0) {
          console.log('[CodexInstaller] Codex CLI uninstalled');
          resolve();
        } else {
          reject(new Error(`npm uninstall failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }
}

// Export singleton instance methods
export const isCodexInstalled = () => CodexInstaller.isInstalled();
export const installCodex = (onProgress?: ProgressCallback) => CodexInstaller.install(onProgress);
export const getCodexVersion = () => CodexInstaller.getInstalledVersion();
export const isNpmAvailable = () => CodexInstaller.isNpmAvailable();
