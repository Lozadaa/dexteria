/**
 * Theme Context
 *
 * Manages custom theme loading, switching, and CSS injection.
 * Works alongside the existing system dark/light mode detection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { CustomTheme } from '../../shared/types';

interface ThemeEntry {
  id: string;
  name: string;
  isBuiltIn: boolean;
  path: string;
}

interface ThemeContextValue {
  themes: ThemeEntry[];
  activeTheme: CustomTheme | null;
  activeThemeId: string | null;
  isLoading: boolean;
  error: string | null;
  setActiveTheme: (themeId: string) => Promise<void>;
  refreshThemes: () => Promise<void>;
  createTheme: (name: string, baseThemeId?: string) => Promise<CustomTheme | null>;
  deleteTheme: (themeId: string) => Promise<boolean>;
  saveTheme: (theme: CustomTheme) => Promise<boolean>;
  importTheme: (json: string) => Promise<CustomTheme | null>;
  exportTheme: (themeId: string) => Promise<string | null>;
  openThemeEditor: (themeId: string) => void;
  editingThemeId: string | null;
  setEditingThemeId: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

// Inject CSS variables into the document
// Uses high specificity to override both :root and .dark class
function injectThemeCSS(css: string | { light: string; dark: string }) {
  // Remove existing theme style if present
  const existingStyle = document.getElementById('custom-theme-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Handle both old (light/dark) and new (single) formats for backwards compat
  let cssContent: string;
  if (typeof css === 'string') {
    cssContent = css;
  } else {
    // Legacy format - just use dark
    cssContent = css.dark || css.light || '';
  }

  // Create new style element with high specificity
  // Override both :root and .dark to ensure theme applies everywhere
  const style = document.createElement('style');
  style.id = 'custom-theme-styles';
  style.textContent = `
    :root,
    :root.dark,
    :root.light,
    .dark,
    .light,
    html,
    html.dark,
    html.light {
      ${cssContent}
    }
  `;
  document.head.appendChild(style);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themes, setThemes] = useState<ThemeEntry[]>([]);
  const [activeTheme, setActiveThemeState] = useState<CustomTheme | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

  // Load themes function
  const loadThemes = useCallback(async () => {
    try {
      setIsLoading(true);
      const [themeList, active] = await Promise.all([
        window.dexteria?.theme?.getAll?.(),
        window.dexteria?.theme?.getActive?.(),
      ]);

      console.log('[ThemeContext] Loaded themes:', themeList?.length || 0);
      setThemes(themeList || []);

      if (active) {
        const theme = active as CustomTheme;
        setActiveThemeState(theme);
        setActiveThemeId(theme.id);

        // Get and inject CSS
        const css = await window.dexteria?.theme?.getCSS?.(theme.id);
        if (css) {
          injectThemeCSS(css);
        }
      }
    } catch (err) {
      console.error('Failed to load themes:', err);
      setError('Failed to load themes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load themes on mount and when project changes
  useEffect(() => {
    loadThemes();

    // Listen for theme changes from other windows
    const cleanupThemeChanged = window.dexteria?.theme?.onChanged?.((data) => {
      const theme = data.theme as CustomTheme;
      setActiveThemeState(theme);
      setActiveThemeId(theme.id);
      injectThemeCSS(data.css);
    });

    // Listen for project changes to reload themes
    const cleanupProjectChanged = window.dexteria?.project?.onProjectChanged?.(() => {
      console.log('[ThemeContext] Project changed, reloading themes...');
      loadThemes();
    });

    return () => {
      cleanupThemeChanged?.();
      cleanupProjectChanged?.();
    };
  }, [loadThemes]);

  const refreshThemes = useCallback(async () => {
    try {
      const themeList = await window.dexteria?.theme?.getAll?.();
      setThemes(themeList || []);
    } catch (err) {
      console.error('Failed to refresh themes:', err);
    }
  }, []);

  const setActiveTheme = useCallback(async (themeId: string) => {
    try {
      setIsLoading(true);
      const result = await window.dexteria?.theme?.setActive?.(themeId);

      if (result?.success && result.theme) {
        const theme = result.theme as CustomTheme;
        setActiveThemeState(theme);
        setActiveThemeId(theme.id);

        if (result.css) {
          injectThemeCSS(result.css);
        }
      }
    } catch (err) {
      console.error('Failed to set active theme:', err);
      setError('Failed to set theme');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTheme = useCallback(async (name: string, baseThemeId?: string): Promise<CustomTheme | null> => {
    try {
      const theme = await window.dexteria?.theme?.create?.(name, baseThemeId);
      if (theme) {
        await refreshThemes();
        return theme as CustomTheme;
      }
      return null;
    } catch (err) {
      console.error('Failed to create theme:', err);
      return null;
    }
  }, [refreshThemes]);

  const deleteTheme = useCallback(async (themeId: string): Promise<boolean> => {
    try {
      const success = await window.dexteria?.theme?.delete?.(themeId);
      if (success) {
        await refreshThemes();
        if (activeThemeId === themeId) {
          setActiveThemeState(null);
          setActiveThemeId(null);
        }
      }
      return success ?? false;
    } catch (err) {
      console.error('Failed to delete theme:', err);
      return false;
    }
  }, [refreshThemes, activeThemeId]);

  const saveTheme = useCallback(async (theme: CustomTheme): Promise<boolean> => {
    try {
      const result = await window.dexteria?.theme?.save?.(theme);
      if (result?.success) {
        await refreshThemes();
        // If this is the active theme, update it
        if (activeThemeId === theme.id) {
          setActiveThemeState(theme);
          const css = await window.dexteria?.theme?.getCSS?.(theme.id);
          if (css) {
            injectThemeCSS(css);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save theme:', err);
      return false;
    }
  }, [refreshThemes, activeThemeId]);

  const importTheme = useCallback(async (json: string): Promise<CustomTheme | null> => {
    try {
      const theme = await window.dexteria?.theme?.import?.(json);
      if (theme) {
        await refreshThemes();
        return theme as CustomTheme;
      }
      return null;
    } catch (err) {
      console.error('Failed to import theme:', err);
      return null;
    }
  }, [refreshThemes]);

  const exportTheme = useCallback(async (themeId: string): Promise<string | null> => {
    try {
      return await window.dexteria?.theme?.export?.(themeId) ?? null;
    } catch (err) {
      console.error('Failed to export theme:', err);
      return null;
    }
  }, []);

  const openThemeEditor = useCallback((themeId: string) => {
    setEditingThemeId(themeId);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themes,
        activeTheme,
        activeThemeId,
        isLoading,
        error,
        setActiveTheme,
        refreshThemes,
        createTheme,
        deleteTheme,
        saveTheme,
        importTheme,
        exportTheme,
        openThemeEditor,
        editingThemeId,
        setEditingThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
