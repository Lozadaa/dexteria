/**
 * RepoTools
 *
 * Stack-agnostic file system tools for the agent.
 * All operations pass through PolicyGuard for security.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as diff from 'diff';
import { PolicyGuard } from '../../services/PolicyGuard';
import type { Policy, RepoIndex } from '../../../shared/types';

export interface ListFilesOptions {
  glob: string;
  maxResults?: number;
}

export interface ReadFileOptions {
  path: string;
  encoding?: BufferEncoding;
}

export interface SearchOptions {
  query: string;
  glob?: string;
  maxResults?: number;
  caseSensitive?: boolean;
}

export interface SearchResult {
  path: string;
  line: number;
  content: string;
  match: string;
}

export interface ApplyPatchOptions {
  path: string;
  unifiedDiff: string;
}

export interface WriteFileOptions {
  path: string;
  content: string;
  createBackup?: boolean;
}

export interface StatResult {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class RepoTools {
  private projectRoot: string;
  private policyGuard: PolicyGuard;
  private touchedFiles: Set<string> = new Set();

  constructor(projectRoot: string, policy: Policy) {
    this.projectRoot = path.resolve(projectRoot);
    this.policyGuard = new PolicyGuard(projectRoot, policy);
  }

  /**
   * Get list of files touched during this session.
   */
  getTouchedFiles(): string[] {
    return Array.from(this.touchedFiles);
  }

  /**
   * Clear the touched files list.
   */
  clearTouchedFiles(): void {
    this.touchedFiles.clear();
  }

  /**
   * List files matching a glob pattern.
   */
  listFiles(options: ListFilesOptions): ToolResult<string[]> {
    try {
      const maxResults = options.maxResults || 100;

      // Use a simple recursive directory walk with pattern matching
      const results: string[] = [];
      const pattern = options.glob;

      const walkDir = (dir: string, relativePath: string = ''): void => {
        if (results.length >= maxResults) return;

        const validation = this.policyGuard.validateRead(dir);
        if (!validation.allowed) return;

        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (results.length >= maxResults) break;

          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            // Skip node_modules, .git, etc.
            if (['node_modules', '.git', 'dist', 'release'].includes(entry.name)) {
              continue;
            }
            walkDir(fullPath, relPath);
          } else if (entry.isFile()) {
            // Simple glob matching
            if (this.matchGlob(relPath, pattern)) {
              const readValidation = this.policyGuard.validateRead(fullPath);
              if (readValidation.allowed) {
                results.push(relPath);
              }
            }
          }
        }
      };

      walkDir(this.projectRoot);

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Simple glob matching (supports * and **)
   */
  private matchGlob(filepath: string, pattern: string): boolean {
    // Convert glob to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filepath);
  }

  /**
   * Read a file's contents.
   */
  readFile(options: ReadFileOptions): ToolResult<string> {
    try {
      const fullPath = path.isAbsolute(options.path)
        ? options.path
        : path.join(this.projectRoot, options.path);

      const validation = this.policyGuard.validateRead(fullPath);
      if (!validation.allowed) {
        return { success: false, error: validation.reason };
      }

      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${options.path}` };
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        return { success: false, error: `Path is a directory: ${options.path}` };
      }

      const content = fs.readFileSync(fullPath, options.encoding || 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Search for content in files using regex.
   */
  search(options: SearchOptions): ToolResult<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      const maxResults = options.maxResults || 50;

      // Get files to search
      const filePattern = options.glob || '**/*';
      const filesResult = this.listFiles({ glob: filePattern, maxResults: 500 });

      if (!filesResult.success || !filesResult.data) {
        return { success: false, error: filesResult.error || 'Failed to list files' };
      }

      const regex = new RegExp(options.query, options.caseSensitive ? 'g' : 'gi');

      for (const relPath of filesResult.data) {
        if (results.length >= maxResults) break;

        const readResult = this.readFile({ path: relPath });

        if (!readResult.success || !readResult.data) continue;

        const lines = readResult.data.split('\n');
        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
          const line = lines[i];
          const matches = line.match(regex);
          if (matches) {
            results.push({
              path: relPath,
              line: i + 1,
              content: line.trim().substring(0, 200),
              match: matches[0],
            });
          }
        }
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Apply a unified diff patch to a file.
   */
  applyPatch(options: ApplyPatchOptions): ToolResult<{ linesAdded: number; linesRemoved: number }> {
    try {
      const fullPath = path.isAbsolute(options.path)
        ? options.path
        : path.join(this.projectRoot, options.path);

      // Validate write permission
      const validation = this.policyGuard.validateWrite(fullPath);
      if (!validation.allowed) {
        return { success: false, error: validation.reason };
      }

      // Read current content
      let currentContent = '';
      if (fs.existsSync(fullPath)) {
        currentContent = fs.readFileSync(fullPath, 'utf-8');
      }

      // Apply patch
      const patches = diff.parsePatch(options.unifiedDiff);
      if (patches.length === 0) {
        return { success: false, error: 'Invalid patch: no hunks found' };
      }

      let newContent = currentContent;
      let linesAdded = 0;
      let linesRemoved = 0;

      for (const patch of patches) {
        const applied = diff.applyPatch(newContent, patch);
        if (applied === false) {
          return { success: false, error: 'Patch could not be applied cleanly' };
        }
        newContent = applied;

        // Count changes
        for (const hunk of patch.hunks) {
          for (const line of hunk.lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) linesAdded++;
            if (line.startsWith('-') && !line.startsWith('---')) linesRemoved++;
          }
        }
      }

      // Create backup
      if (fs.existsSync(fullPath)) {
        const backupPath = fullPath + '.bak';
        fs.copyFileSync(fullPath, backupPath);
      }

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write new content
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      this.touchedFiles.add(this.policyGuard.getRelativePath(fullPath));

      return {
        success: true,
        data: { linesAdded, linesRemoved },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to apply patch: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Write content to a file.
   */
  writeFile(options: WriteFileOptions): ToolResult<void> {
    try {
      const fullPath = path.isAbsolute(options.path)
        ? options.path
        : path.join(this.projectRoot, options.path);

      // Validate write permission with content size
      const contentSize = Buffer.byteLength(options.content, 'utf-8');
      const validation = this.policyGuard.validateWrite(fullPath, contentSize);
      if (!validation.allowed) {
        return { success: false, error: validation.reason };
      }

      // Create backup if requested and file exists
      if (options.createBackup !== false && fs.existsSync(fullPath)) {
        const backupPath = fullPath + '.bak';
        fs.copyFileSync(fullPath, backupPath);
      }

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write atomically
      const tempPath = fullPath + '.tmp';
      fs.writeFileSync(tempPath, options.content, 'utf-8');
      fs.renameSync(tempPath, fullPath);

      this.touchedFiles.add(this.policyGuard.getRelativePath(fullPath));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get file/directory stats.
   */
  stat(options: { path: string }): ToolResult<StatResult> {
    try {
      const fullPath = path.isAbsolute(options.path)
        ? options.path
        : path.join(this.projectRoot, options.path);

      const validation = this.policyGuard.validateRead(fullPath);
      if (!validation.allowed) {
        return { success: false, error: validation.reason };
      }

      if (!fs.existsSync(fullPath)) {
        return {
          success: true,
          data: {
            exists: false,
            isFile: false,
            isDirectory: false,
            size: 0,
            mtime: new Date(0),
          },
        };
      }

      const stats = fs.statSync(fullPath);
      return {
        success: true,
        data: {
          exists: true,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          mtime: stats.mtime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stat: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Find key files in the project (entry points, configs, etc.)
   */
  findKeyFiles(): ToolResult<RepoIndex['keyFiles']> {
    const keyPatterns = [
      'package.json',
      'tsconfig.json',
      'vite.config.*',
      'webpack.config.*',
      'rollup.config.*',
      '.eslintrc*',
      '.prettierrc*',
      'Dockerfile',
      'docker-compose.*',
      'Makefile',
      'README.md',
      'CHANGELOG.md',
      '**/main.ts',
      '**/main.tsx',
      '**/index.ts',
      '**/index.tsx',
      '**/App.tsx',
      '**/app.ts',
    ];

    const keyFiles: string[] = [];

    for (const pattern of keyPatterns) {
      const result = this.listFiles({ glob: pattern, maxResults: 5 });
      if (result.success && result.data) {
        keyFiles.push(...result.data);
      }
    }

    // Deduplicate
    const unique = [...new Set(keyFiles)];

    return { success: true, data: unique };
  }

  /**
   * Create a unified diff between two strings.
   */
  createDiff(oldContent: string, newContent: string, filename: string): string {
    return diff.createPatch(filename, oldContent, newContent, 'original', 'modified');
  }

  /**
   * Get the policy guard instance.
   */
  getPolicyGuard(): PolicyGuard {
    return this.policyGuard;
  }
}
