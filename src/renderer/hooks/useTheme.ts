import { useEffect, useState } from 'react';

/**
 * Hook to detect and sync with system theme preference.
 * Applies 'dark' class to document element when system is in dark mode.
 */
export function useSystemTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check initial preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial value
    setIsDark(mediaQuery.matches);

    // Apply to document
    if (mediaQuery.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}
