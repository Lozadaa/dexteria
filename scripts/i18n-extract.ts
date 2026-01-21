/**
 * i18n String Extraction Script
 *
 * Scans src/renderer/**\/*.{ts,tsx} for hardcoded strings and extracts them
 * for translation. Outputs to scripts/i18n.todo.json.
 *
 * Usage: npx tsx scripts/i18n-extract.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExtractedString {
  file: string;
  line: number;
  original: string;
  context: 'jsx' | 'prop' | 'call' | 'other';
  suggestedKey: string;
}

interface ExtractionResult {
  extractedAt: string;
  count: number;
  strings: ExtractedString[];
}

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /^console\.(log|warn|error|info|debug)\s*\(/,
  /^import\s/,
  /^export\s/,
  /^\s*\/\//,
  /^\s*\*/,
  /className/,
  /^https?:\/\//,
  /^\.\//,
  /^\.\.\//,
  /^[a-zA-Z]:\\/, // Windows paths
  /^\d+$/,
  /^[a-z]+:$/i, // Labels like "id:", "type:"
  /^\s*$/,
];

// Props that contain translatable text
const TRANSLATABLE_PROPS = [
  'placeholder',
  'title',
  'aria-label',
  'alt',
  'label',
];

// Function calls that contain translatable text
const TRANSLATABLE_CALLS = [
  'toast',
  'notify',
  'confirm',
  'alert',
];

// Words/patterns that indicate non-translatable content
const NON_TRANSLATABLE = [
  /^\d+(\.\d+)?$/,
  /^#[0-9a-fA-F]{3,8}$/,
  /^rgb/,
  /^hsl/,
  /^[a-z]+[A-Z]/,  // camelCase identifiers
  /^[A-Z_]+$/,     // CONSTANT_CASE
  /^\./,           // Paths
  /^@/,            // At-mentions or decorators
  /^\$/,           // Variables
  /^[a-z]+:\/\//i, // URLs
  /^data:/,        // Data URLs
  /^[{}[\]()]/,    // Code-like
];

function shouldExclude(str: string): boolean {
  const trimmed = str.trim();

  // Too short to be meaningful
  if (trimmed.length < 2) return true;

  // Check exclude patterns
  for (const pattern of [...EXCLUDE_PATTERNS, ...NON_TRANSLATABLE]) {
    if (pattern.test(trimmed)) return true;
  }

  // Already wrapped in t()
  if (/^t\s*\(/.test(trimmed)) return true;

  // Pure numbers or symbols
  if (/^[\d\s\-+*\/=<>!&|.,;:'"()[\]{}]+$/.test(trimmed)) return true;

  return false;
}

function suggestKey(original: string, context: string, filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const viewName = fileName.replace(/Panel|Modal|Dialog|View|Component/gi, '').toLowerCase();

  // Clean and normalize the string
  const cleaned = original
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('');

  // Suggest based on context
  if (context === 'prop') {
    if (original.includes('...')) return `placeholders.${cleaned}`;
    return `tooltips.${cleaned}`;
  }

  if (context === 'call') {
    return `errors.${cleaned}`;
  }

  // Check for common patterns
  if (/^(save|cancel|delete|edit|create|add|remove|close|open)/i.test(original)) {
    return `actions.${cleaned}`;
  }

  if (/loading|error|failed|success/i.test(original)) {
    return `common.${cleaned}`;
  }

  return `views.${viewName}.${cleaned}`;
}

function extractStringsFromFile(filePath: string): ExtractedString[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const extracted: ExtractedString[] = [];
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip imports, comments, console statements
    if (/^\s*(import|export|\/\/|\*|console\.)/.test(line)) return;

    // Skip lines that already use t()
    if (/\bt\s*\(/.test(line)) return;

    // Extract JSX text: >Text here<
    const jsxMatches = line.matchAll(/>([^<>{]+)</g);
    for (const match of jsxMatches) {
      const text = match[1].trim();
      if (text && !shouldExclude(text)) {
        extracted.push({
          file: relativePath,
          line: lineNum,
          original: text,
          context: 'jsx',
          suggestedKey: suggestKey(text, 'jsx', filePath),
        });
      }
    }

    // Extract translatable props: placeholder="...", title="..."
    for (const prop of TRANSLATABLE_PROPS) {
      const propRegex = new RegExp(`${prop}=["']([^"']+)["']`, 'g');
      const propMatches = line.matchAll(propRegex);
      for (const match of propMatches) {
        const text = match[1].trim();
        if (text && !shouldExclude(text)) {
          extracted.push({
            file: relativePath,
            line: lineNum,
            original: text,
            context: 'prop',
            suggestedKey: suggestKey(text, 'prop', filePath),
          });
        }
      }
    }

    // Extract translatable function calls: toast('message'), confirm('Are you sure?')
    for (const call of TRANSLATABLE_CALLS) {
      const callRegex = new RegExp(`${call}\\s*\\(\\s*["'\`]([^"'\`]+)["'\`]`, 'g');
      const callMatches = line.matchAll(callRegex);
      for (const match of callMatches) {
        const text = match[1].trim();
        if (text && !shouldExclude(text)) {
          extracted.push({
            file: relativePath,
            line: lineNum,
            original: text,
            context: 'call',
            suggestedKey: suggestKey(text, 'call', filePath),
          });
        }
      }
    }
  });

  return extracted;
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, __tests__, etc.
        if (['node_modules', 'dist', '__tests__', '.git'].includes(entry.name)) continue;
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
  console.log('Scanning for translatable strings...\n');

  const rendererDir = path.join(process.cwd(), 'src', 'renderer');
  const files = findFiles(rendererDir, ['.ts', '.tsx']);

  console.log(`Found ${files.length} files to scan\n`);

  const allStrings: ExtractedString[] = [];

  for (const file of files) {
    // Skip i18n files themselves
    if (file.includes('/i18n/') || file.includes('\\i18n\\')) continue;

    const extracted = extractStringsFromFile(file);
    if (extracted.length > 0) {
      console.log(`  ${path.relative(process.cwd(), file)}: ${extracted.length} strings`);
      allStrings.push(...extracted);
    }
  }

  // Deduplicate by original string
  const seen = new Set<string>();
  const unique = allStrings.filter(s => {
    if (seen.has(s.original)) return false;
    seen.add(s.original);
    return true;
  });

  const result: ExtractionResult = {
    extractedAt: new Date().toISOString(),
    count: unique.length,
    strings: unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  };

  const outputPath = path.join(process.cwd(), 'scripts', 'i18n.todo.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`\nExtracted ${unique.length} unique strings`);
  console.log(`Output written to: ${outputPath}`);
}

main();
