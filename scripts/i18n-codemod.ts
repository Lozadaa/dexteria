/**
 * i18n Codemod Script
 *
 * Transforms hardcoded strings to use t() function based on key mappings.
 * Reads from scripts/i18n.keys.json and applies transformations.
 *
 * Usage:
 *   npx tsx scripts/i18n-codemod.ts --dry-run   # Preview changes
 *   npx tsx scripts/i18n-codemod.ts             # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface KeyMapping {
  original: string;
  key: string;
  params?: Record<string, string>;
}

interface KeyMappingsFile {
  mappings: KeyMapping[];
}

interface TransformResult {
  file: string;
  changes: number;
  details: string[];
}

const DRY_RUN = process.argv.includes('--dry-run');

// Import statement to add
const T_IMPORT = "import { t } from '../i18n/t';";
const T_IMPORT_HOOK = "import { useTranslation } from '../i18n/useTranslation';";

function loadMappings(): KeyMapping[] {
  const mappingsPath = path.join(process.cwd(), 'scripts', 'i18n.keys.json');

  if (!fs.existsSync(mappingsPath)) {
    console.error(`Error: ${mappingsPath} not found.`);
    console.error('Run "npm run i18n:extract" first, then review and create i18n.keys.json');
    process.exit(1);
  }

  const content = fs.readFileSync(mappingsPath, 'utf-8');
  const data = JSON.parse(content) as KeyMappingsFile;

  return data.mappings;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transformFile(filePath: string, mappings: KeyMapping[]): TransformResult | null {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const details: string[] = [];
  let changes = 0;

  // Check if file already imports t or useTranslation
  const hasT = /import\s*{\s*t\s*}/.test(content) || /\bconst\s*{\s*t\b/.test(content);
  const hasHook = /useTranslation/.test(content);
  const isReactComponent = /\.tsx$/.test(filePath) && (/function\s+\w+|const\s+\w+\s*=\s*\(|export\s+(default\s+)?function/.test(content));

  for (const mapping of mappings) {
    const { original, key, params } = mapping;

    // Build the replacement string
    let replacement: string;
    if (params && Object.keys(params).length > 0) {
      const paramsStr = Object.entries(params)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      replacement = `t('${key}', { ${paramsStr} })`;
    } else {
      replacement = `t('${key}')`;
    }

    // Transform JSX text: >Text< -> {t('key')}
    const jsxPattern = new RegExp(`>(\\s*)${escapeRegex(original)}(\\s*)<`, 'g');
    const jsxReplacement = `>$1{${replacement}}$2<`;
    const jsxMatches = content.match(jsxPattern);
    if (jsxMatches) {
      content = content.replace(jsxPattern, jsxReplacement);
      changes += jsxMatches.length;
      details.push(`JSX text: "${original}" -> {${replacement}}`);
    }

    // Transform props: placeholder="text" -> placeholder={t('key')}
    const propPatterns = ['placeholder', 'title', 'aria-label', 'alt', 'label'];
    for (const prop of propPatterns) {
      const propPattern = new RegExp(`${prop}=["']${escapeRegex(original)}["']`, 'g');
      const propMatches = content.match(propPattern);
      if (propMatches) {
        content = content.replace(propPattern, `${prop}={${replacement}}`);
        changes += propMatches.length;
        details.push(`Prop ${prop}: "${original}" -> {${replacement}}`);
      }
    }

    // Transform confirm/alert calls: confirm("text") -> confirm(t('key'))
    const callPatterns = ['confirm', 'alert'];
    for (const call of callPatterns) {
      const callPattern = new RegExp(`${call}\\(["'\`]${escapeRegex(original)}["'\`]\\)`, 'g');
      const callMatches = content.match(callPattern);
      if (callMatches) {
        content = content.replace(callPattern, `${call}(${replacement})`);
        changes += callMatches.length;
        details.push(`Call ${call}: "${original}" -> ${replacement}`);
      }
    }
  }

  if (changes === 0) {
    return null;
  }

  // Add import if needed
  if (!hasT && !hasHook && changes > 0) {
    // Find the right place to add import
    const importRegex = /^import\s+.+\s+from\s+['"][^'"]+['"];?\s*$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const importToAdd = isReactComponent ? T_IMPORT_HOOK : T_IMPORT;

      // Calculate relative path from file to i18n
      const fileDir = path.dirname(filePath);
      const i18nDir = path.join(process.cwd(), 'src', 'renderer', 'i18n');
      let relativePath = path.relative(fileDir, i18nDir).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }

      const adjustedImport = isReactComponent
        ? `import { useTranslation } from '${relativePath}/useTranslation';`
        : `import { t } from '${relativePath}/t';`;

      content = content.replace(lastImport, `${lastImport}\n${adjustedImport}`);
      details.push(`Added import: ${adjustedImport}`);
    }
  }

  // Write the file if not dry run
  if (!DRY_RUN && content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }

  return {
    file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    changes,
    details,
  };
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '__tests__', '.git', 'i18n'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

function main() {
  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== APPLYING CHANGES ===');
  console.log('');

  const mappings = loadMappings();
  console.log(`Loaded ${mappings.length} key mappings\n`);

  const rendererDir = path.join(process.cwd(), 'src', 'renderer');
  const files = findFiles(rendererDir, ['.ts', '.tsx']);

  console.log(`Scanning ${files.length} files...\n`);

  const results: TransformResult[] = [];

  for (const file of files) {
    const result = transformFile(file, mappings);
    if (result) {
      results.push(result);
    }
  }

  // Print results
  if (results.length === 0) {
    console.log('No changes needed.');
    return;
  }

  console.log('Changes:\n');
  let totalChanges = 0;

  for (const result of results) {
    console.log(`${result.file} (${result.changes} changes)`);
    for (const detail of result.details) {
      console.log(`  - ${detail}`);
    }
    console.log('');
    totalChanges += result.changes;
  }

  console.log(`\nTotal: ${totalChanges} changes in ${results.length} files`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  } else {
    console.log('\nChanges applied successfully.');
  }
}

main();
