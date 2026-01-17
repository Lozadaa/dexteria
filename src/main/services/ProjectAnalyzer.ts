/**
 * ProjectAnalyzer
 *
 * Analyzes a project to extract context information for AI prompts.
 * Detects tech stack, folder structure, and key configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ProjectContext } from '../../shared/types';

interface PackageJson {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface TechStackInfo {
  language: string;
  framework?: string;
  buildTool?: string;
  testFramework?: string;
  styling?: string;
  packageManager?: string;
}

/**
 * Analyze a project and return context information.
 */
export async function analyzeProject(projectRoot: string): Promise<ProjectContext> {
  console.log('[ProjectAnalyzer] Analyzing project:', projectRoot);

  const projectName = path.basename(projectRoot);
  const techStack = await detectTechStack(projectRoot);
  const folderStructure = await analyzeFolderStructure(projectRoot);
  // Note: keyFiles is available if needed in the future
  // const keyFiles = findKeyFiles(projectRoot);

  // Build architecture description
  const architecture: Record<string, string> = {};

  if (techStack.language) {
    architecture['language'] = techStack.language;
  }
  if (techStack.framework) {
    architecture['framework'] = techStack.framework;
  }
  if (techStack.buildTool) {
    architecture['buildTool'] = techStack.buildTool;
  }
  if (techStack.testFramework) {
    architecture['testing'] = techStack.testFramework;
  }
  if (techStack.styling) {
    architecture['styling'] = techStack.styling;
  }

  // Add folder structure info
  if (folderStructure.srcDir) {
    architecture['sourceDir'] = folderStructure.srcDir;
  }
  if (folderStructure.hasTests) {
    architecture['hasTests'] = 'yes';
  }

  // Build dev workflow
  const devWorkflow: Record<string, string> = {};

  if (techStack.packageManager) {
    devWorkflow['packageManager'] = techStack.packageManager;
  }

  // Detect common commands from package.json
  const pkgJson = readPackageJson(projectRoot);
  if (pkgJson?.scripts) {
    if (pkgJson.scripts.dev || pkgJson.scripts.start) {
      devWorkflow['runCommand'] = pkgJson.scripts.dev ? 'npm run dev' : 'npm start';
    }
    if (pkgJson.scripts.build) {
      devWorkflow['buildCommand'] = 'npm run build';
    }
    if (pkgJson.scripts.test) {
      devWorkflow['testCommand'] = 'npm test';
    }
  }

  // Build description
  let description = `${projectName} is a`;
  if (techStack.framework) {
    description += ` ${techStack.framework}`;
  }
  description += ` ${techStack.language} project`;
  if (pkgJson?.description) {
    description += `. ${pkgJson.description}`;
  }

  // Build purpose from README if available
  const purpose = await extractPurposeFromReadme(projectRoot) || 'Software development project';

  // Build constraints
  const constraints: string[] = [];

  if (folderStructure.hasTypeScript) {
    constraints.push('TypeScript strict mode - ensure type safety');
  }
  if (folderStructure.hasEslint) {
    constraints.push('ESLint configured - follow linting rules');
  }
  if (folderStructure.hasPrettier) {
    constraints.push('Prettier configured - format code accordingly');
  }
  if (folderStructure.hasTests) {
    constraints.push('Test suite exists - add tests for new features');
  }

  const context: ProjectContext = {
    name: projectName,
    description,
    purpose,
    architecture,
    devWorkflow,
    constraints,
    updatedAt: new Date().toISOString(),
  };

  console.log('[ProjectAnalyzer] Analysis complete:', context);
  return context;
}

/**
 * Read package.json from project root.
 */
function readPackageJson(projectRoot: string): PackageJson | null {
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.warn('[ProjectAnalyzer] Failed to read package.json:', e);
    return null;
  }
}

/**
 * Detect the tech stack used in the project.
 */
async function detectTechStack(projectRoot: string): Promise<TechStackInfo> {
  const info: TechStackInfo = {
    language: 'JavaScript', // Default
  };

  // Check for TypeScript
  if (
    fs.existsSync(path.join(projectRoot, 'tsconfig.json')) ||
    fs.existsSync(path.join(projectRoot, 'tsconfig.base.json'))
  ) {
    info.language = 'TypeScript';
  }

  // Read package.json for dependencies
  const pkgJson = readPackageJson(projectRoot);
  if (!pkgJson) {
    return info;
  }

  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };

  // Detect framework
  if (allDeps['next']) {
    info.framework = 'Next.js';
  } else if (allDeps['@angular/core']) {
    info.framework = 'Angular';
  } else if (allDeps['vue']) {
    info.framework = 'Vue.js';
  } else if (allDeps['svelte']) {
    info.framework = 'Svelte';
  } else if (allDeps['react']) {
    info.framework = 'React';
  } else if (allDeps['express']) {
    info.framework = 'Express.js';
  } else if (allDeps['fastify']) {
    info.framework = 'Fastify';
  } else if (allDeps['electron']) {
    info.framework = 'Electron';
  }

  // Detect build tool
  if (allDeps['vite']) {
    info.buildTool = 'Vite';
  } else if (allDeps['webpack']) {
    info.buildTool = 'Webpack';
  } else if (allDeps['rollup']) {
    info.buildTool = 'Rollup';
  } else if (allDeps['esbuild']) {
    info.buildTool = 'esbuild';
  } else if (allDeps['parcel']) {
    info.buildTool = 'Parcel';
  }

  // Detect test framework
  if (allDeps['jest']) {
    info.testFramework = 'Jest';
  } else if (allDeps['vitest']) {
    info.testFramework = 'Vitest';
  } else if (allDeps['mocha']) {
    info.testFramework = 'Mocha';
  } else if (allDeps['@playwright/test']) {
    info.testFramework = 'Playwright';
  } else if (allDeps['cypress']) {
    info.testFramework = 'Cypress';
  }

  // Detect styling
  if (allDeps['tailwindcss']) {
    info.styling = 'Tailwind CSS';
  } else if (allDeps['styled-components']) {
    info.styling = 'styled-components';
  } else if (allDeps['@emotion/react']) {
    info.styling = 'Emotion';
  } else if (allDeps['sass'] || allDeps['node-sass']) {
    info.styling = 'Sass/SCSS';
  }

  // Detect package manager
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) {
    info.packageManager = 'bun';
  } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    info.packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    info.packageManager = 'yarn';
  } else if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
    info.packageManager = 'npm';
  }

  return info;
}

interface FolderStructureInfo {
  srcDir?: string;
  hasTests: boolean;
  hasTypeScript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasDocker: boolean;
  isMonorepo: boolean;
}

/**
 * Analyze the folder structure of the project.
 */
async function analyzeFolderStructure(projectRoot: string): Promise<FolderStructureInfo> {
  const info: FolderStructureInfo = {
    hasTests: false,
    hasTypeScript: false,
    hasEslint: false,
    hasPrettier: false,
    hasDocker: false,
    isMonorepo: false,
  };

  // Check for common source directories
  const srcDirs = ['src', 'lib', 'app', 'pages', 'source'];
  for (const dir of srcDirs) {
    if (fs.existsSync(path.join(projectRoot, dir))) {
      info.srcDir = dir;
      break;
    }
  }

  // Check for tests
  const testDirs = ['test', 'tests', '__tests__', 'spec', 'specs'];
  for (const dir of testDirs) {
    if (fs.existsSync(path.join(projectRoot, dir))) {
      info.hasTests = true;
      break;
    }
  }
  // Also check for test files in src
  if (info.srcDir && !info.hasTests) {
    try {
      const srcFiles = fs.readdirSync(path.join(projectRoot, info.srcDir), { recursive: true }) as string[];
      info.hasTests = srcFiles.some(f =>
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
      );
    } catch {
      // Ignore errors
    }
  }

  // Check for TypeScript
  info.hasTypeScript = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));

  // Check for ESLint
  const eslintFiles = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs'];
  info.hasEslint = eslintFiles.some(f => fs.existsSync(path.join(projectRoot, f)));

  // Check for Prettier
  const prettierFiles = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'];
  info.hasPrettier = prettierFiles.some(f => fs.existsSync(path.join(projectRoot, f)));

  // Check for Docker
  info.hasDocker = fs.existsSync(path.join(projectRoot, 'Dockerfile')) ||
                   fs.existsSync(path.join(projectRoot, 'docker-compose.yml'));

  // Check for monorepo
  info.isMonorepo = fs.existsSync(path.join(projectRoot, 'packages')) ||
                    fs.existsSync(path.join(projectRoot, 'lerna.json')) ||
                    fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'));

  return info;
}

/**
 * Extract project purpose from README.
 */
async function extractPurposeFromReadme(projectRoot: string): Promise<string | null> {
  const readmePath = path.join(projectRoot, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(readmePath, 'utf-8');

    // Get first paragraph after the title (usually describes the project)
    const lines = content.split('\n');
    let foundTitle = false;
    let purpose = '';

    for (const line of lines) {
      // Skip empty lines before finding content
      if (!foundTitle && line.startsWith('#')) {
        foundTitle = true;
        continue;
      }

      if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('!') && !line.startsWith('[')) {
        // Found first paragraph
        purpose = line.trim();

        // Get full paragraph (up to 200 chars)
        if (purpose.length < 200) {
          const nextLines = lines.slice(lines.indexOf(line) + 1);
          for (const nextLine of nextLines) {
            if (!nextLine.trim() || nextLine.startsWith('#')) break;
            purpose += ' ' + nextLine.trim();
            if (purpose.length >= 200) break;
          }
        }

        // Truncate if too long
        if (purpose.length > 250) {
          purpose = purpose.substring(0, 247) + '...';
        }

        return purpose;
      }
    }

    return null;
  } catch (e) {
    console.warn('[ProjectAnalyzer] Failed to read README:', e);
    return null;
  }
}

/**
 * Format project context as a string for prompts.
 */
export function formatContextForPrompt(context: ProjectContext): string {
  let prompt = `## Project Context\n\n`;

  prompt += `**Project**: ${context.name}\n`;
  prompt += `**Description**: ${context.description}\n`;

  if (context.purpose) {
    prompt += `**Purpose**: ${context.purpose}\n`;
  }

  prompt += `\n### Tech Stack\n`;
  for (const [key, value] of Object.entries(context.architecture)) {
    prompt += `- **${key}**: ${value}\n`;
  }

  if (Object.keys(context.devWorkflow).length > 0) {
    prompt += `\n### Development Workflow\n`;
    for (const [key, value] of Object.entries(context.devWorkflow)) {
      prompt += `- **${key}**: ${value}\n`;
    }
  }

  if (context.constraints.length > 0) {
    prompt += `\n### Constraints\n`;
    for (const constraint of context.constraints) {
      prompt += `- ${constraint}\n`;
    }
  }

  return prompt;
}
