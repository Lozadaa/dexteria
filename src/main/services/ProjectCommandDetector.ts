/**
 * ProjectCommandDetector
 *
 * Auto-detects project commands based on project files and structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DetectedCommands } from '../../shared/types';

interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
}

/**
 * Detect the package manager used in a Node.js project.
 */
function detectPackageManager(projectRoot: string): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  // Check for lockfiles in order of preference
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) {
    return 'bun';
  }
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }

  // Check package.json packageManager field
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('bun')) return 'bun';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Default to npm
  return 'npm';
}

/**
 * Detect Node.js project commands from package.json.
 */
function detectNodeCommands(projectRoot: string): DetectedCommands {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {};
  }

  try {
    const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const scripts = pkg.scripts || {};
    const pm = detectPackageManager(projectRoot);

    const result: DetectedCommands = {
      packageManager: pm,
    };

    // Detect run command (dev server)
    const runScripts = ['dev', 'start', 'serve', 'run'];
    for (const script of runScripts) {
      if (scripts[script]) {
        result.run = `${pm} run ${script}`;
        break;
      }
    }

    // Detect build command
    const buildScripts = ['build', 'compile', 'dist'];
    for (const script of buildScripts) {
      if (scripts[script]) {
        result.build = `${pm} run ${script}`;
        break;
      }
    }

    // Install command
    result.install = pm === 'npm' ? 'npm install' : `${pm} install`;

    return result;
  } catch (error) {
    console.error('[Detector] Failed to parse package.json:', error);
    return {};
  }
}

/**
 * Detect Makefile-based project commands.
 */
function detectMakefileCommands(projectRoot: string): DetectedCommands {
  const makefilePath = path.join(projectRoot, 'Makefile');
  if (!fs.existsSync(makefilePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(makefilePath, 'utf-8');
    const result: DetectedCommands = {};

    // Look for common targets
    const runTargets = ['dev', 'run', 'start', 'serve'];
    const buildTargets = ['build', 'compile', 'all'];
    const installTargets = ['install', 'deps', 'dependencies'];

    for (const target of runTargets) {
      if (content.includes(`${target}:`)) {
        result.run = `make ${target}`;
        break;
      }
    }

    for (const target of buildTargets) {
      if (content.includes(`${target}:`)) {
        result.build = `make ${target}`;
        break;
      }
    }

    for (const target of installTargets) {
      if (content.includes(`${target}:`)) {
        result.install = `make ${target}`;
        break;
      }
    }

    return result;
  } catch (error) {
    console.error('[Detector] Failed to read Makefile:', error);
    return {};
  }
}

/**
 * Detect Python project commands.
 */
function detectPythonCommands(projectRoot: string): DetectedCommands {
  const result: DetectedCommands = {};

  // Check for common Python project files
  const hasRequirements = fs.existsSync(path.join(projectRoot, 'requirements.txt'));
  const hasPyproject = fs.existsSync(path.join(projectRoot, 'pyproject.toml'));
  const hasSetupPy = fs.existsSync(path.join(projectRoot, 'setup.py'));

  if (!hasRequirements && !hasPyproject && !hasSetupPy) {
    return {};
  }

  // Check for main.py or app.py
  if (fs.existsSync(path.join(projectRoot, 'main.py'))) {
    result.run = 'python main.py';
  } else if (fs.existsSync(path.join(projectRoot, 'app.py'))) {
    result.run = 'python app.py';
  }

  // Install command
  if (hasPyproject) {
    result.install = 'pip install -e .';
  } else if (hasRequirements) {
    result.install = 'pip install -r requirements.txt';
  }

  return result;
}

/**
 * Detect Cargo (Rust) project commands.
 */
function detectCargoCommands(projectRoot: string): DetectedCommands {
  const cargoPath = path.join(projectRoot, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) {
    return {};
  }

  return {
    run: 'cargo run',
    build: 'cargo build --release',
    install: 'cargo build',
  };
}

/**
 * Detect Go project commands.
 */
function detectGoCommands(projectRoot: string): DetectedCommands {
  const goModPath = path.join(projectRoot, 'go.mod');
  if (!fs.existsSync(goModPath)) {
    return {};
  }

  return {
    run: 'go run .',
    build: 'go build',
    install: 'go mod download',
  };
}

/**
 * Detect project commands based on project structure.
 * Returns detected commands that can be used to fill in settings.
 */
export function detectProjectCommands(projectRoot: string): DetectedCommands {
  console.log('[Detector] Detecting project commands for:', projectRoot);

  // Try each detector in order of priority
  const detectors = [
    detectNodeCommands,
    detectCargoCommands,
    detectGoCommands,
    detectMakefileCommands,
    detectPythonCommands,
  ];

  let result: DetectedCommands = {};

  for (const detector of detectors) {
    const detected = detector(projectRoot);
    // Merge detected commands, earlier detectors take priority
    result = {
      ...detected,
      ...result,
    };
  }

  console.log('[Detector] Detected commands:', result);
  return result;
}

/**
 * Get effective command for a project command type.
 * Uses auto-detected command if settings command is empty and autoDetect is true.
 */
export function getEffectiveCommand(
  projectRoot: string,
  type: 'run' | 'build' | 'install',
  settingsCmd: string,
  autoDetect: boolean
): string {
  if (settingsCmd && settingsCmd.trim()) {
    return settingsCmd.trim();
  }

  if (!autoDetect) {
    return '';
  }

  const detected = detectProjectCommands(projectRoot);
  return detected[type] || '';
}
