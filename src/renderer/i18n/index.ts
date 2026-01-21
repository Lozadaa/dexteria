/**
 * i18n Core Module
 *
 * Provides internationalization support with:
 * - Synchronous initialization (locales bundled)
 * - Language detection: localStorage > navigator.language > 'en'
 * - Runtime language switching with persistence
 * - Event-based reactivity for components
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';

// Supported locales
export type Locale = 'en' | 'es';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

// LocalStorage key for persisting language preference
const STORAGE_KEY = 'dexteria.lang';

// Locale change listeners
type LocaleChangeListener = (locale: Locale) => void;
const listeners = new Set<LocaleChangeListener>();

/**
 * Normalize a locale code to a supported locale.
 * Examples:
 *   'es-ES' -> 'es'
 *   'es-MX' -> 'es'
 *   'en-US' -> 'en'
 *   'en-GB' -> 'en'
 *   'fr-FR' -> 'en' (fallback)
 */
function normalizeLocale(locale: string): Locale {
  const lower = locale.toLowerCase();
  const base = lower.split('-')[0];

  if (base === 'es') return 'es';
  if (base === 'en') return 'en';

  // Fallback to default for unsupported locales
  return DEFAULT_LOCALE;
}

/**
 * Detect the user's preferred locale.
 * Priority: localStorage > navigator.language > default
 */
function detectLocale(): Locale {
  // 1. Check localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch {
    // localStorage not available
  }

  // 2. Check navigator.language
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language);
  }

  // 3. Fallback to default
  return DEFAULT_LOCALE;
}

/**
 * Initialize i18next with bundled locales.
 * This should be called synchronously before React renders.
 */
export function initI18n(): void {
  const detectedLocale = detectLocale();

  i18next
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: enCommon },
        es: { common: esCommon },
      },
      lng: detectedLocale,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: false, // Synchronous initialization
      },
    });
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  return (i18next.language as Locale) || DEFAULT_LOCALE;
}

/**
 * Set the current locale.
 * Persists to localStorage and notifies listeners.
 */
export function setLocale(locale: Locale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(`[i18n] Unsupported locale: ${locale}`);
    return;
  }

  // Change i18next language
  i18next.changeLanguage(locale);

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }

  // Notify listeners
  listeners.forEach((listener) => listener(locale));
}

/**
 * Subscribe to locale changes.
 * Returns an unsubscribe function.
 */
export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Export i18next instance for direct access if needed
export { i18next };
