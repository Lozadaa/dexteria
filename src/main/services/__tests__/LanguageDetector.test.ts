/**
 * LanguageDetector Tests
 *
 * Tests for the heuristic-based language detection system.
 */

import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  isSpanish,
  isEnglish,
  getLanguageWithFallback,
  detectLanguageFromSamples,
} from '../LanguageDetector';

// ============================================================================
// detectLanguage() Tests
// ============================================================================

describe('detectLanguage', () => {
  describe('Spanish Detection', () => {
    it('detects Spanish from common words', () => {
      const result = detectLanguage('Quiero crear una aplicación para usuarios');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects Spanish from accented characters', () => {
      const result = detectLanguage('Sí, necesito más información');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('detects Spanish from project-related terms', () => {
      const result = detectLanguage('El proyecto tiene funcionalidad de sistema');
      expect(result.language).toBe('es');
    });

    it('detects Spanish with inverted question marks', () => {
      const result = detectLanguage('¿Qué tipo de aplicación quieres?');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detects Spanish from verb conjugations', () => {
      const result = detectLanguage('Tengo que hacer el proyecto, está muy bien');
      expect(result.language).toBe('es');
    });
  });

  describe('English Detection', () => {
    it('detects English from common words', () => {
      const result = detectLanguage('I want to build a web application for users');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects English from contractions', () => {
      const result = detectLanguage("I'm building something that doesn't exist");
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('detects English from project-related terms', () => {
      const result = detectLanguage('The application has feature functionality');
      expect(result.language).toBe('en');
    });

    it('detects English from auxiliary verbs', () => {
      const result = detectLanguage('This should be done by the system');
      expect(result.language).toBe('en');
    });

    it('detects English from pronouns', () => {
      const result = detectLanguage('We need to create something for them');
      expect(result.language).toBe('en');
    });
  });

  describe('Unknown / Ambiguous Cases', () => {
    it('returns unknown for empty string', () => {
      const result = detectLanguage('');
      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for very short text', () => {
      const result = detectLanguage('ab');
      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for whitespace only', () => {
      const result = detectLanguage('   ');
      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for numbers only', () => {
      const result = detectLanguage('12345 67890');
      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for code snippets without words', () => {
      const result = detectLanguage('const x = () => {}');
      expect(result.language).toBe('unknown');
    });

    it('handles equal scores by defaulting to English', () => {
      // This text has "the" (English) and potentially "de" in isolation
      const result = detectLanguage('the project de');
      // Should default to English when scores are equal
      expect(['en', 'unknown']).toContain(result.language);
    });
  });

  describe('Mixed Language Text', () => {
    it('detects dominant language in mixed text', () => {
      const result = detectLanguage('I want to create una aplicación that is muy buena');
      // English has more indicator words
      expect(['en', 'es']).toContain(result.language);
    });

    it('handles technical terms without language indicators', () => {
      const result = detectLanguage('React TypeScript API REST GraphQL');
      // Technical terms are neutral
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Confidence Scores', () => {
    it('returns higher confidence for text with many indicators', () => {
      const shortResult = detectLanguage('I want');
      const longResult = detectLanguage('I want to build a web application that will help users manage their projects efficiently');
      expect(longResult.confidence).toBeGreaterThanOrEqual(shortResult.confidence);
    });

    it('returns confidence between 0 and 1', () => {
      const result = detectLanguage('This is a test of the language detection system');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Debug Mode', () => {
    it('includes debug info when requested', () => {
      const result = detectLanguage('I want to build something', true);
      expect(result.debug).toBeDefined();
      expect(result.debug!.spanishScore).toBeDefined();
      expect(result.debug!.englishScore).toBeDefined();
      expect(result.debug!.wordCount).toBeDefined();
      expect(result.debug!.spanishMatches).toBeInstanceOf(Array);
      expect(result.debug!.englishMatches).toBeInstanceOf(Array);
    });

    it('excludes debug info by default', () => {
      const result = detectLanguage('I want to build something');
      expect(result.debug).toBeUndefined();
    });

    it('counts matched words correctly', () => {
      const result = detectLanguage('I want to build the application', true);
      expect(result.debug!.englishMatches.length).toBeGreaterThan(0);
      expect(result.debug!.englishMatches).toContain('i');
      expect(result.debug!.englishMatches).toContain('want');
      expect(result.debug!.englishMatches).toContain('to');
      expect(result.debug!.englishMatches).toContain('the');
    });
  });

  describe('Edge Cases', () => {
    it('handles punctuation correctly', () => {
      const result = detectLanguage('Hello! How are you? I am fine.');
      expect(result.language).toBe('en');
    });

    it('handles newlines and tabs', () => {
      const result = detectLanguage('I want\nto build\ta project');
      expect(result.language).toBe('en');
    });

    it('handles repeated spaces', () => {
      const result = detectLanguage('I    want    to    build');
      expect(result.language).toBe('en');
    });

    it('is case insensitive', () => {
      const lowerResult = detectLanguage('i want to build');
      const upperResult = detectLanguage('I WANT TO BUILD');
      expect(lowerResult.language).toBe(upperResult.language);
    });
  });
});

// ============================================================================
// isSpanish() Tests
// ============================================================================

describe('isSpanish', () => {
  it('returns true for Spanish text', () => {
    expect(isSpanish('Quiero crear una aplicación')).toBe(true);
  });

  it('returns false for English text', () => {
    expect(isSpanish('I want to build an application')).toBe(false);
  });

  it('returns false for ambiguous text', () => {
    expect(isSpanish('API REST GraphQL')).toBe(false);
  });

  it('returns false for empty text', () => {
    expect(isSpanish('')).toBe(false);
  });
});

// ============================================================================
// isEnglish() Tests
// ============================================================================

describe('isEnglish', () => {
  it('returns true for English text', () => {
    expect(isEnglish('I want to build an application')).toBe(true);
  });

  it('returns false for Spanish text', () => {
    expect(isEnglish('Quiero crear una aplicación')).toBe(false);
  });

  it('returns false for ambiguous text', () => {
    expect(isEnglish('API REST GraphQL')).toBe(false);
  });

  it('returns false for empty text', () => {
    expect(isEnglish('')).toBe(false);
  });
});

// ============================================================================
// getLanguageWithFallback() Tests
// ============================================================================

describe('getLanguageWithFallback', () => {
  it('returns detected language when confident', () => {
    expect(getLanguageWithFallback('I want to build an app')).toBe('en');
    expect(getLanguageWithFallback('Quiero crear una aplicación')).toBe('es');
  });

  it('returns English fallback by default for ambiguous text', () => {
    expect(getLanguageWithFallback('xyz abc 123')).toBe('en');
  });

  it('returns Spanish fallback when specified for ambiguous text', () => {
    expect(getLanguageWithFallback('xyz abc 123', 'es')).toBe('es');
  });

  it('returns fallback for empty text', () => {
    expect(getLanguageWithFallback('', 'en')).toBe('en');
    expect(getLanguageWithFallback('', 'es')).toBe('es');
  });
});

// ============================================================================
// detectLanguageFromSamples() Tests
// ============================================================================

describe('detectLanguageFromSamples', () => {
  it('detects language from multiple samples', () => {
    const samples = [
      'I want to build',
      'The application should',
      'Users need this feature',
    ];
    const result = detectLanguageFromSamples(samples);
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('detects Spanish from multiple samples', () => {
    const samples = [
      'Quiero crear una aplicación',
      'El sistema debe tener',
      'Los usuarios necesitan',
    ];
    const result = detectLanguageFromSamples(samples);
    expect(result.language).toBe('es');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('handles empty samples array', () => {
    const result = detectLanguageFromSamples([]);
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('handles samples with mixed languages', () => {
    const samples = [
      'I want to build an application',
      'Quiero crear una aplicación',
    ];
    const result = detectLanguageFromSamples(samples);
    // Should detect one of the two languages
    expect(['en', 'es']).toContain(result.language);
  });

  it('aggregates scores across samples', () => {
    const samples = [
      'I', // minimal English
      'want', // minimal English
      'to build a web application for users', // strong English
    ];
    const result = detectLanguageFromSamples(samples);
    expect(result.language).toBe('en');
  });

  it('returns unknown for all empty samples', () => {
    const samples = ['', '   ', '  \n\t  '];
    const result = detectLanguageFromSamples(samples);
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});

// ============================================================================
// Special Character Handling
// ============================================================================

describe('Special Character Handling', () => {
  it('detects Spanish from n-tilde', () => {
    const result = detectLanguage('El niño quiere mañana');
    expect(result.language).toBe('es');
  });

  it('detects Spanish from u-umlaut', () => {
    const result = detectLanguage('La lingüística es interesante');
    expect(result.language).toBe('es');
  });

  it('handles emojis without breaking', () => {
    const result = detectLanguage('I want to build something great! 🚀');
    expect(result.language).toBe('en');
  });

  it('handles unicode without breaking', () => {
    const result = detectLanguage('I want to build 中文 application');
    expect(['en', 'unknown']).toContain(result.language);
  });
});

// ============================================================================
// Contraction Detection
// ============================================================================

describe('English Contraction Detection', () => {
  const contractions = [
    "I'm building",
    "I've done",
    "I'll finish",
    "I'd like",
    "you're here",
    "you've seen",
    "you'll see",
    "you'd think",
    "he's there",
    "she's here",
    "it's working",
    "we're building",
    "we've created",
    "we'll do",
    "they're working",
    "they've done",
    "they'll complete",
    "don't worry",
    "doesn't work",
    "didn't happen",
    "won't stop",
    "wouldn't do",
    "couldn't find",
    "shouldn't be",
    "can't do",
    "haven't seen",
    "hasn't worked",
    "hadn't done",
    "isn't working",
    "aren't done",
    "wasn't there",
    "weren't ready",
  ];

  it('detects English from various contractions', () => {
    for (const phrase of contractions) {
      const result = detectLanguage(phrase);
      expect(result.language).toBe('en');
    }
  });
});
