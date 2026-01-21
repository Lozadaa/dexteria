/**
 * i18n Module Tests
 *
 * Tests for internationalization functionality including:
 * - Locale initialization and detection
 * - Locale switching and persistence
 * - Translation function
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

// Mock navigator
const navigatorMock = {
  language: 'en-US',
};

// Setup global mocks
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('navigator', navigatorMock);

// Import after mocks are set up
import {
  initI18n,
  getLocale,
  setLocale,
  onLocaleChange,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type Locale,
} from '../index';
import { t } from '../t';

describe('i18n', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    navigatorMock.language = 'en-US';
  });

  describe('initI18n', () => {
    it('initializes with default locale when no preference is set', () => {
      initI18n();
      expect(getLocale()).toBe('en');
    });

    it('detects locale from localStorage', () => {
      localStorageMock.setItem('dexteria.lang', 'es');
      initI18n();
      expect(getLocale()).toBe('es');
    });

    it('normalizes es-ES to es', () => {
      navigatorMock.language = 'es-ES';
      initI18n();
      expect(getLocale()).toBe('es');
    });

    it('normalizes es-MX to es', () => {
      navigatorMock.language = 'es-MX';
      initI18n();
      expect(getLocale()).toBe('es');
    });

    it('normalizes en-US to en', () => {
      navigatorMock.language = 'en-US';
      initI18n();
      expect(getLocale()).toBe('en');
    });

    it('normalizes en-GB to en', () => {
      navigatorMock.language = 'en-GB';
      initI18n();
      expect(getLocale()).toBe('en');
    });

    it('falls back to en for unsupported fr-FR', () => {
      navigatorMock.language = 'fr-FR';
      initI18n();
      expect(getLocale()).toBe('en');
    });

    it('falls back to en for unsupported de-DE', () => {
      navigatorMock.language = 'de-DE';
      initI18n();
      expect(getLocale()).toBe('en');
    });

    it('localStorage preference takes priority over navigator.language', () => {
      localStorageMock.setItem('dexteria.lang', 'es');
      navigatorMock.language = 'en-US';
      initI18n();
      expect(getLocale()).toBe('es');
    });
  });

  describe('setLocale', () => {
    beforeEach(() => {
      initI18n();
    });

    it('persists to localStorage', () => {
      setLocale('es');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dexteria.lang', 'es');
    });

    it('changes the current locale', () => {
      setLocale('es');
      expect(getLocale()).toBe('es');
    });

    it('notifies subscribers', () => {
      const listener = vi.fn();
      onLocaleChange(listener);

      setLocale('es');

      expect(listener).toHaveBeenCalledWith('es');
    });

    it('ignores unsupported locales', () => {
      const initialLocale = getLocale();
      setLocale('fr' as Locale);
      expect(getLocale()).toBe(initialLocale);
    });

    it('allows unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = onLocaleChange(listener);

      unsubscribe();
      setLocale('es');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('t()', () => {
    beforeEach(() => {
      initI18n();
    });

    it('returns translation for valid key', () => {
      // Test with a key we know exists
      const result = t('actions.save');
      expect(result).toBe('Save');
    });

    it('returns Spanish translation when locale is es', () => {
      setLocale('es');
      const result = t('actions.save');
      expect(result).toBe('Guardar');
    });

    it('interpolates {{params}}', () => {
      const result = t('time.minutesAgo', { count: 5 });
      expect(result).toBe('5 min ago');
    });

    it('interpolates params in Spanish', () => {
      setLocale('es');
      const result = t('time.minutesAgo', { count: 5 });
      expect(result).toBe('hace 5 min');
    });

    it('returns key path if missing', () => {
      const result = t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('handles nested keys', () => {
      const result = t('views.settings.language.title');
      expect(result).toBe('Language');
    });

    it('handles nested keys in Spanish', () => {
      setLocale('es');
      const result = t('views.settings.language.title');
      expect(result).toBe('Idioma');
    });
  });

  describe('constants', () => {
    it('SUPPORTED_LOCALES contains en and es', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('es');
    });

    it('DEFAULT_LOCALE is en', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });
});
