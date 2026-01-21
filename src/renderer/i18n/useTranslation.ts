/**
 * React Hook for i18n
 *
 * Provides reactive access to:
 * - t() function for translations
 * - locale - current locale
 * - setLocale() - change the locale
 */

import { useState, useEffect, useCallback } from 'react';
import { getLocale, setLocale as setLocaleInternal, onLocaleChange, type Locale } from './index';
import { t, type InterpolationParams } from './t';

interface UseTranslationReturn {
  /**
   * Translate a key to the current locale.
   */
  t: (key: string, params?: InterpolationParams) => string;

  /**
   * Current locale (e.g., 'en', 'es').
   */
  locale: Locale;

  /**
   * Change the current locale.
   * Persists to localStorage and updates all components using this hook.
   */
  setLocale: (locale: Locale) => void;
}

/**
 * React hook for internationalization.
 *
 * @example
 * const { t, locale, setLocale } = useTranslation();
 *
 * return (
 *   <div>
 *     <h1>{t('views.settings.title')}</h1>
 *     <button onClick={() => setLocale('es')}>Español</button>
 *   </div>
 * );
 */
export function useTranslation(): UseTranslationReturn {
  const [locale, setLocaleState] = useState<Locale>(getLocale);

  // Subscribe to locale changes
  useEffect(() => {
    const unsubscribe = onLocaleChange((newLocale) => {
      setLocaleState(newLocale);
    });
    return unsubscribe;
  }, []);

  // Memoized setLocale that updates both i18n and local state
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleInternal(newLocale);
    // State will be updated via the listener above
  }, []);

  return {
    t,
    locale,
    setLocale,
  };
}
