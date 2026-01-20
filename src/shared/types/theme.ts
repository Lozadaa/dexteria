/**
 * Theme Domain Types
 *
 * Types related to the theming system and color configuration.
 */

// ============================================
// Color Value Types
// ============================================

/**
 * HSL color value without the hsl() wrapper.
 * Format: "hue saturation% lightness%"
 * @example "221.2 83.2% 53.3%"
 */
export type HSLValue = string;

// ============================================
// Token Types
// ============================================

/**
 * Core color tokens for the UI.
 */
export interface ThemeColorTokens {
  background: HSLValue;
  foreground: HSLValue;
  card: HSLValue;
  cardForeground: HSLValue;
  popover: HSLValue;
  popoverForeground: HSLValue;
  primary: HSLValue;
  primaryForeground: HSLValue;
  secondary: HSLValue;
  secondaryForeground: HSLValue;
  muted: HSLValue;
  mutedForeground: HSLValue;
  accent: HSLValue;
  accentForeground: HSLValue;
  destructive: HSLValue;
  destructiveForeground: HSLValue;
  border: HSLValue;
  input: HSLValue;
  ring: HSLValue;
}

/**
 * Code editor color tokens.
 */
export interface ThemeCodeTokens {
  background: HSLValue;
  foreground: HSLValue;
  comment: HSLValue;
  keyword: HSLValue;
  string: HSLValue;
  number: HSLValue;
  function: HSLValue;
  operator: HSLValue;
  variable: HSLValue;
  class: HSLValue;
}

/**
 * Diff viewer color tokens.
 */
export interface ThemeDiffTokens {
  addBackground: HSLValue;
  addForeground: HSLValue;
  removeBackground: HSLValue;
  removeForeground: HSLValue;
  changeBackground: HSLValue;
  changeForeground: HSLValue;
}

/**
 * Terminal color tokens.
 */
export interface ThemeTerminalTokens {
  background: HSLValue;
  foreground: HSLValue;
  cursor: HSLValue;
  selection: HSLValue;
}

// ============================================
// Complete Theme Types
// ============================================

/**
 * Complete color palette for a theme.
 */
export interface ThemeColors {
  core: ThemeColorTokens;
  code: ThemeCodeTokens;
  diff: ThemeDiffTokens;
  terminal: ThemeTerminalTokens;
  lineNumber: HSLValue;
  lineHighlight: HSLValue;
}

/**
 * Font configuration for a theme.
 */
export interface ThemeFonts {
  sans: string;
  mono: string;
  display: string;
  baseFontSize: string;
  codeFontSize: string;
}

/**
 * Complete theme definition.
 * Note: Themes no longer have separate light/dark modes.
 * Each theme defines its own colors directly.
 */
export interface CustomTheme {
  /** Unique theme identifier */
  id: string;
  /** Display name */
  name: string;
  /** Theme format version */
  version: number;
  /** Theme author */
  author?: string;
  /** Theme description */
  description?: string;
  /** Color configuration */
  colors: ThemeColors;
  /** Font configuration */
  fonts: ThemeFonts;
  /** Border radius value */
  radius: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

// ============================================
// Theme Index Types
// ============================================

/**
 * Entry in the theme index.
 */
export interface ThemeIndexEntry {
  id: string;
  name: string;
  isBuiltIn: boolean;
  path: string;
}

/**
 * Theme index stored in .local-kanban/themes/index.json.
 */
export interface ThemeIndex {
  version: number;
  activeThemeId: string | null;
  themes: ThemeIndexEntry[];
}

// ============================================
// Theme Preset Types
// ============================================

/**
 * Simplified theme preset for quick selection.
 */
export interface ThemePreset {
  id: string;
  name: string;
  preview: {
    primary: HSLValue;
    background: HSLValue;
    foreground: HSLValue;
  };
}
