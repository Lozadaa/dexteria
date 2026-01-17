/**
 * Theme Service
 *
 * Manages custom themes for the application.
 * Handles loading, saving, applying, and editing themes.
 * Themes are stored in .local-kanban/themes/
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  CustomTheme,
  ThemeIndex,
  ThemeColors,
  ThemeFonts,
  ThemeColorTokens,
  ThemeCodeTokens,
  ThemeDiffTokens,
  ThemeTerminalTokens,
} from '../../shared/types';

/**
 * Default theme colors (dark theme as default)
 */
const DEFAULT_COLORS: ThemeColors = {
  core: {
    background: '224 71% 4%',
    foreground: '213 31% 91%',
    card: '224 71% 6%',
    cardForeground: '213 31% 91%',
    popover: '224 71% 6%',
    popoverForeground: '215 20.2% 65.1%',
    primary: '210 40% 98%',
    primaryForeground: '222.2 47.4% 1.2%',
    secondary: '222.2 47.4% 11.2%',
    secondaryForeground: '210 40% 98%',
    muted: '223 47% 11%',
    mutedForeground: '215.4 16.3% 56.9%',
    accent: '216 34% 17%',
    accentForeground: '210 40% 98%',
    destructive: '0 63% 31%',
    destructiveForeground: '210 40% 98%',
    border: '216 34% 17%',
    input: '216 34% 17%',
    ring: '224 64% 33%',
  },
  code: {
    background: '220 13% 10%',
    foreground: '220 14% 85%',
    comment: '220 10% 45%',
    keyword: '286 60% 72%',
    string: '95 38% 67%',
    number: '29 54% 66%',
    function: '207 82% 71%',
    operator: '187 47% 60%',
    variable: '355 65% 70%',
    class: '39 67% 74%',
  },
  diff: {
    addBackground: '142 76% 20%',
    addForeground: '142 76% 90%',
    removeBackground: '0 63% 25%',
    removeForeground: '0 0% 95%',
    changeBackground: '45 80% 25%',
    changeForeground: '45 93% 90%',
  },
  terminal: {
    background: '220 13% 6%',
    foreground: '220 14% 90%',
    cursor: '210 40% 98%',
    selection: '224 64% 33%',
  },
  lineNumber: '220 10% 35%',
  lineHighlight: '220 13% 12%',
};

const DEFAULT_FONTS: ThemeFonts = {
  sans: 'Janna, system-ui, sans-serif',
  mono: 'JetBrains Mono, Menlo, Monaco, monospace',
  display: 'Janna, system-ui, sans-serif',
  baseFontSize: '14px',
  codeFontSize: '13px',
};

export class ThemeService {
  private themesDir: string;
  private indexPath: string;
  private index: ThemeIndex | null = null;
  private activeTheme: CustomTheme | null = null;

  constructor(projectPath: string) {
    this.themesDir = path.join(projectPath, '.local-kanban', 'themes');
    this.indexPath = path.join(this.themesDir, 'index.json');
  }

  /**
   * Initialize the theme service
   */
  async init(): Promise<void> {
    // Ensure themes directory exists
    if (!fs.existsSync(this.themesDir)) {
      fs.mkdirSync(this.themesDir, { recursive: true });
    }

    // Load or create index
    this.index = this.loadIndex();

    // Create default theme if none exist
    if (this.index.themes.length === 0) {
      const defaultTheme = this.createDefaultTheme();
      await this.saveTheme(defaultTheme);
      this.index.themes.push({
        id: defaultTheme.id,
        name: defaultTheme.name,
        isBuiltIn: true,
        path: `${defaultTheme.id}.json`,
      });
      this.saveIndex();
    }

    // Load active theme
    if (this.index.activeThemeId) {
      this.activeTheme = await this.loadTheme(this.index.activeThemeId);
    }
  }

  /**
   * Load the theme index
   */
  private loadIndex(): ThemeIndex {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(data);
      } catch (err) {
        console.error('Failed to load theme index:', err);
      }
    }

    return {
      version: 1,
      activeThemeId: null,
      themes: [],
    };
  }

  /**
   * Save the theme index
   */
  private saveIndex(): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Create the default Dexteria theme
   */
  private createDefaultTheme(): CustomTheme {
    const now = new Date().toISOString();
    return {
      id: 'dexteria-default',
      name: 'Dexteria',
      version: 1,
      author: 'Dexteria Team',
      description: 'Default Dexteria theme',
      colors: DEFAULT_COLORS,
      fonts: DEFAULT_FONTS,
      radius: '0.5rem',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Load a theme by ID
   */
  async loadTheme(themeId: string): Promise<CustomTheme | null> {
    const themeEntry = this.index?.themes.find(t => t.id === themeId);
    if (!themeEntry) return null;

    const themePath = path.join(this.themesDir, themeEntry.path);
    if (!fs.existsSync(themePath)) return null;

    try {
      const data = fs.readFileSync(themePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to load theme:', err);
      return null;
    }
  }

  /**
   * Save a theme
   */
  async saveTheme(theme: CustomTheme): Promise<void> {
    const themePath = path.join(this.themesDir, `${theme.id}.json`);
    theme.updatedAt = new Date().toISOString();
    fs.writeFileSync(themePath, JSON.stringify(theme, null, 2));

    // Update index if this is a new theme
    if (this.index && !this.index.themes.find(t => t.id === theme.id)) {
      this.index.themes.push({
        id: theme.id,
        name: theme.name,
        isBuiltIn: false,
        path: `${theme.id}.json`,
      });
      this.saveIndex();
    }
  }

  /**
   * Get all available themes
   */
  getThemes(): ThemeIndex['themes'] {
    return this.index?.themes || [];
  }

  /**
   * Get the currently active theme
   */
  getActiveTheme(): CustomTheme | null {
    return this.activeTheme;
  }

  /**
   * Set the active theme
   */
  async setActiveTheme(themeId: string): Promise<CustomTheme | null> {
    const theme = await this.loadTheme(themeId);
    if (!theme) return null;

    this.activeTheme = theme;
    if (this.index) {
      this.index.activeThemeId = themeId;
      this.saveIndex();
    }

    return theme;
  }

  /**
   * Create a new custom theme based on the default
   */
  async createTheme(name: string, baseThemeId?: string): Promise<CustomTheme> {
    const baseTheme = baseThemeId
      ? await this.loadTheme(baseThemeId)
      : this.createDefaultTheme();

    const now = new Date().toISOString();
    const newTheme: CustomTheme = {
      ...baseTheme!,
      id: uuidv4(),
      name,
      author: undefined,
      description: `Custom theme based on ${baseTheme?.name || 'Dexteria'}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveTheme(newTheme);
    return newTheme;
  }

  /**
   * Delete a custom theme (cannot delete built-in themes)
   */
  async deleteTheme(themeId: string): Promise<boolean> {
    if (!this.index) return false;

    const themeEntry = this.index.themes.find(t => t.id === themeId);
    if (!themeEntry || themeEntry.isBuiltIn) return false;

    // Remove file
    const themePath = path.join(this.themesDir, themeEntry.path);
    if (fs.existsSync(themePath)) {
      fs.unlinkSync(themePath);
    }

    // Remove from index
    this.index.themes = this.index.themes.filter(t => t.id !== themeId);

    // If this was the active theme, clear it
    if (this.index.activeThemeId === themeId) {
      this.index.activeThemeId = null;
      this.activeTheme = null;
    }

    this.saveIndex();
    return true;
  }

  /**
   * Import a theme from JSON string
   */
  async importTheme(jsonString: string): Promise<CustomTheme> {
    const theme = JSON.parse(jsonString) as CustomTheme;

    // Generate new ID to avoid conflicts
    theme.id = uuidv4();
    theme.createdAt = new Date().toISOString();
    theme.updatedAt = theme.createdAt;

    await this.saveTheme(theme);
    return theme;
  }

  /**
   * Export a theme as JSON string
   */
  async exportTheme(themeId: string): Promise<string | null> {
    const theme = await this.loadTheme(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Get the theme file path for direct editing
   */
  getThemeFilePath(themeId: string): string | null {
    const themeEntry = this.index?.themes.find(t => t.id === themeId);
    if (!themeEntry) return null;
    return path.join(this.themesDir, themeEntry.path);
  }

  /**
   * Generate CSS variables from a theme for injection
   */
  generateCSSVariables(theme: CustomTheme): string {
    const colors = theme.colors;
    const fonts = theme.fonts;

    const cssVars: string[] = [];

    // Core colors
    const coreMap: Record<keyof ThemeColorTokens, string> = {
      background: '--background',
      foreground: '--foreground',
      card: '--card',
      cardForeground: '--card-foreground',
      popover: '--popover',
      popoverForeground: '--popover-foreground',
      primary: '--primary',
      primaryForeground: '--primary-foreground',
      secondary: '--secondary',
      secondaryForeground: '--secondary-foreground',
      muted: '--muted',
      mutedForeground: '--muted-foreground',
      accent: '--accent',
      accentForeground: '--accent-foreground',
      destructive: '--destructive',
      destructiveForeground: '--destructive-foreground',
      border: '--border',
      input: '--input',
      ring: '--ring',
    };

    for (const [key, varName] of Object.entries(coreMap)) {
      cssVars.push(`${varName}: ${colors.core[key as keyof ThemeColorTokens]};`);
    }

    // Code colors
    const codeMap: Record<keyof ThemeCodeTokens, string> = {
      background: '--code-background',
      foreground: '--code-foreground',
      comment: '--code-comment',
      keyword: '--code-keyword',
      string: '--code-string',
      number: '--code-number',
      function: '--code-function',
      operator: '--code-operator',
      variable: '--code-variable',
      class: '--code-class',
    };

    for (const [key, varName] of Object.entries(codeMap)) {
      cssVars.push(`${varName}: ${colors.code[key as keyof ThemeCodeTokens]};`);
    }

    // Diff colors
    const diffMap: Record<keyof ThemeDiffTokens, string> = {
      addBackground: '--diff-add-background',
      addForeground: '--diff-add-foreground',
      removeBackground: '--diff-remove-background',
      removeForeground: '--diff-remove-foreground',
      changeBackground: '--diff-change-background',
      changeForeground: '--diff-change-foreground',
    };

    for (const [key, varName] of Object.entries(diffMap)) {
      cssVars.push(`${varName}: ${colors.diff[key as keyof ThemeDiffTokens]};`);
    }

    // Terminal colors
    const termMap: Record<keyof ThemeTerminalTokens, string> = {
      background: '--terminal-background',
      foreground: '--terminal-foreground',
      cursor: '--terminal-cursor',
      selection: '--terminal-selection',
    };

    for (const [key, varName] of Object.entries(termMap)) {
      cssVars.push(`${varName}: ${colors.terminal[key as keyof ThemeTerminalTokens]};`);
    }

    // Line numbers
    cssVars.push(`--line-number: ${colors.lineNumber};`);
    cssVars.push(`--line-highlight: ${colors.lineHighlight};`);

    // Fonts
    cssVars.push(`--font-family-sans: ${fonts.sans};`);
    cssVars.push(`--font-family-mono: ${fonts.mono};`);
    cssVars.push(`--font-family-display: ${fonts.display};`);
    cssVars.push(`--font-size-base: ${fonts.baseFontSize};`);
    cssVars.push(`--font-size-code: ${fonts.codeFontSize};`);

    // Radius
    cssVars.push(`--radius: ${theme.radius};`);

    return cssVars.join('\n');
  }
}

// Singleton instance (initialized when project opens)
let themeServiceInstance: ThemeService | null = null;

export function initThemeService(projectPath: string): ThemeService {
  themeServiceInstance = new ThemeService(projectPath);
  return themeServiceInstance;
}

export function getThemeService(): ThemeService | null {
  return themeServiceInstance;
}
