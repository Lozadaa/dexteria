/**
 * Global Test Setup
 *
 * Configures the test environment with necessary mocks and utilities.
 */

import { vi } from 'vitest';

// Mock electron module for main process tests
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/mock/userData';
      if (name === 'appData') return '/mock/appData';
      return `/mock/${name}`;
    }),
    getName: vi.fn(() => 'Dexteria'),
    getVersion: vi.fn(() => '0.1.0'),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    webContents: {
      send: vi.fn(),
      openDevTools: vi.fn(),
    },
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

// Console spy for tracking warnings and errors in tests
export const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

// Restore console in afterAll
afterAll(() => {
  consoleSpy.log.mockRestore();
  consoleSpy.warn.mockRestore();
  consoleSpy.error.mockRestore();
});

// Utility to create a temporary directory for file-based tests
export function createTempDir(): string {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dexteria-test-'));
  return tempDir;
}

// Utility to clean up a temporary directory
export function cleanupTempDir(dir: string): void {
  const fs = require('fs');

  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
