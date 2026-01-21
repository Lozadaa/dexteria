/**
 * i18n Verification Script
 *
 * Checks for:
 * 1. All keys in en/common.json exist in es/common.json
 * 2. No "__TODO__" values remain
 * 3. Scans src/ for potential hardcoded strings
 *
 * Usage: npx tsx scripts/i18n-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  errors: string[];
  warnings: string[];
}

function loadJson(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function getValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function checkMissingKeys(
  sourceLocale: string,
  targetLocale: string,
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>
): string[] {
  const sourceKeys = getAllKeys(sourceData);
  const errors: string[] = [];

  for (const key of sourceKeys) {
    const targetValue = getValue(targetData, key);
    if (targetValue === undefined) {
      errors.push(`[${targetLocale}] Missing key: ${key}`);
    }
  }

  return errors;
}

function checkTodoValues(
  locale: string,
  data: Record<string, unknown>
): string[] {
  const keys = getAllKeys(data);
  const errors: string[] = [];

  for (const key of keys) {
    const value = getValue(data, key);
    if (typeof value === 'string' && value.includes('__TODO__')) {
      errors.push(`[${locale}] Incomplete translation: ${key} = "${value}"`);
    }
  }

  return errors;
}

function findPotentialHardcodedStrings(dir: string): string[] {
  const warnings: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '__tests__', '.git', 'i18n'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile() && ['.ts', '.tsx'].includes(path.extname(entry.name))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

        lines.forEach((line, index) => {
          // Skip imports, comments, console
          if (/^\s*(import|export|\/\/|\*|console\.)/.test(line)) return;
          // Skip lines with t()
          if (/\bt\s*\(/.test(line)) return;

          // Look for suspicious patterns
          // JSX text that's not just whitespace or numbers
          const jsxMatch = line.match(/>([A-Z][a-z]+(?:\s+[a-z]+)*)</);
          if (jsxMatch && jsxMatch[1].length > 3) {
            warnings.push(`${relativePath}:${index + 1} - Potential hardcoded text: "${jsxMatch[1]}"`);
          }

          // String props that look like user-visible text
          const propMatch = line.match(/(?:placeholder|title|label|aria-label)=["']([A-Z][^"']+)["']/);
          if (propMatch) {
            warnings.push(`${relativePath}:${index + 1} - Potential hardcoded prop: "${propMatch[1]}"`);
          }
        });
      }
    }
  }

  walk(dir);
  return warnings;
}

function main() {
  console.log('=== i18n Verification ===\n');

  const localesDir = path.join(process.cwd(), 'src', 'renderer', 'i18n', 'locales');
  const result: CheckResult = { errors: [], warnings: [] };

  // Load locale files
  const enPath = path.join(localesDir, 'en', 'common.json');
  const esPath = path.join(localesDir, 'es', 'common.json');

  if (!fs.existsSync(enPath)) {
    console.error(`Error: ${enPath} not found`);
    process.exit(1);
  }

  if (!fs.existsSync(esPath)) {
    console.error(`Error: ${esPath} not found`);
    process.exit(1);
  }

  const enData = loadJson(enPath);
  const esData = loadJson(esPath);

  // Check for missing keys
  console.log('Checking for missing keys...');
  result.errors.push(...checkMissingKeys('en', 'es', enData, esData));
  result.errors.push(...checkMissingKeys('es', 'en', esData, enData));

  // Check for __TODO__ values
  console.log('Checking for incomplete translations...');
  result.errors.push(...checkTodoValues('en', enData));
  result.errors.push(...checkTodoValues('es', esData));

  // Scan for potential hardcoded strings
  console.log('Scanning for potential hardcoded strings...');
  const rendererDir = path.join(process.cwd(), 'src', 'renderer');
  result.warnings.push(...findPotentialHardcodedStrings(rendererDir));

  // Print results
  console.log('\n=== Results ===\n');

  if (result.errors.length > 0) {
    console.log(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log(`Warnings (${result.warnings.length}):`);
    // Limit to first 20 warnings
    const shown = result.warnings.slice(0, 20);
    for (const warning of shown) {
      console.log(`  - ${warning}`);
    }
    if (result.warnings.length > 20) {
      console.log(`  ... and ${result.warnings.length - 20} more`);
    }
    console.log('');
  }

  // Summary
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('All checks passed!\n');
    process.exit(0);
  } else if (result.errors.length > 0) {
    console.log(`\nFound ${result.errors.length} errors and ${result.warnings.length} warnings.`);
    console.log('Fix the errors before proceeding.\n');
    process.exit(1);
  } else {
    console.log(`\nNo errors. ${result.warnings.length} warnings to review.\n`);
    process.exit(0);
  }
}

main();
