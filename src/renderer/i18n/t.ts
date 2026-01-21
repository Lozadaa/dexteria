/**
 * Translation Function
 *
 * Type-safe wrapper around i18next.t() that:
 * - Supports dot-notation key paths
 * - Supports interpolation with {{var}} syntax
 * - Returns the key path if translation is missing
 */

import { i18next } from './index';

/**
 * Interpolation parameters type.
 * Supports common patterns like {{count}}, {{name}}, etc.
 */
export type InterpolationParams = Record<string, string | number>;

/**
 * Translate a key to the current locale.
 *
 * @param key - Dot-notation path to the translation (e.g., 'actions.save')
 * @param params - Optional interpolation parameters
 * @returns The translated string, or the key if not found
 *
 * @example
 * t('actions.save') // "Save"
 * t('time.minutesAgo', { count: 5 }) // "5 min ago"
 */
export function t(key: string, params?: InterpolationParams): string {
  if (!i18next.isInitialized) {
    console.warn('[i18n] i18next not initialized, returning key:', key);
    return key;
  }

  const result = i18next.t(key, params as Record<string, unknown>);

  // i18next returns the key if not found (default behavior)
  return typeof result === 'string' ? result : key;
}
