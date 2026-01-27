/**
 * LanguageDetector
 *
 * Simple heuristic-based language detection for user input.
 * Supports English (en) and Spanish (es) detection.
 */

// ============================================================================
// Language Indicators
// ============================================================================

const SPANISH_WORDS = new Set([
  // Articles and prepositions
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'en', 'con', 'para', 'por', 'sin',
  // Common verbs
  'es', 'son', 'ser', 'estar', 'estoy', 'está', 'están',
  'tengo', 'tiene', 'tienen', 'tener', 'hay',
  'quiero', 'quiere', 'quieren', 'necesito', 'necesita',
  'puedo', 'puede', 'pueden', 'hacer', 'hago', 'hace',
  // Common words
  'que', 'qué', 'como', 'cómo', 'cuando', 'dónde', 'donde',
  'porque', 'pero', 'también', 'muy', 'más', 'menos',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra',
  'sí', 'no', 'bien', 'bueno', 'buena', 'malo', 'mala',
  'ahora', 'hoy', 'mañana', 'ayer', 'siempre', 'nunca',
  'todo', 'todos', 'toda', 'todas', 'algo', 'nada',
  'yo', 'tú', 'él', 'ella', 'nosotros', 'ellos', 'ellas',
  // Project-related
  'proyecto', 'aplicación', 'sistema', 'usuario', 'usuarios',
  'funcionalidad', 'característica', 'página', 'web',
]);

const ENGLISH_WORDS = new Set([
  // Articles and prepositions
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  // Common verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'want', 'need', 'like', 'make', 'get', 'use',
  // Common words
  'that', 'which', 'who', 'what', 'where', 'when', 'how', 'why',
  'this', 'these', 'those', 'it', 'its',
  'and', 'or', 'but', 'so', 'if', 'then', 'because',
  'my', 'your', 'his', 'her', 'our', 'their',
  'yes', 'no', 'not', 'very', 'more', 'less',
  'all', 'some', 'any', 'many', 'much', 'few',
  'i', 'you', 'he', 'she', 'we', 'they',
  // Project-related
  'project', 'application', 'app', 'system', 'user', 'users',
  'feature', 'functionality', 'page', 'web', 'website',
]);

// Spanish-specific character patterns
const SPANISH_CHARS_PATTERN = /[áéíóúüñ¿¡]/i;

// English-specific patterns (contractions, etc.)
const ENGLISH_CONTRACTIONS_PATTERN = /\b(i'm|i've|i'll|i'd|you're|you've|you'll|you'd|he's|she's|it's|we're|we've|we'll|they're|they've|they'll|don't|doesn't|didn't|won't|wouldn't|couldn't|shouldn't|can't|haven't|hasn't|hadn't|isn't|aren't|wasn't|weren't)\b/i;

// ============================================================================
// Detection Result
// ============================================================================

export interface LanguageDetectionResult {
  /** Detected language code */
  language: 'en' | 'es' | 'unknown';
  /** Confidence score (0-1) */
  confidence: number;
  /** Debug info */
  debug?: {
    spanishScore: number;
    englishScore: number;
    wordCount: number;
    spanishMatches: string[];
    englishMatches: string[];
  };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect the language of a text input.
 *
 * Uses a scoring system based on:
 * - Word matching against known word lists
 * - Character pattern matching (Spanish accents, etc.)
 * - English contractions
 *
 * @param text The text to analyze
 * @param includeDebug Whether to include debug info in the result
 * @returns Detection result with language and confidence
 */
export function detectLanguage(text: string, includeDebug = false): LanguageDetectionResult {
  if (!text || text.trim().length < 3) {
    return { language: 'unknown', confidence: 0 };
  }

  // Normalize and tokenize
  const normalizedText = text.toLowerCase();
  const words = normalizedText
    .replace(/[^\w\sáéíóúüñ¿¡']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) {
    return { language: 'unknown', confidence: 0 };
  }

  let spanishScore = 0;
  let englishScore = 0;
  const spanishMatches: string[] = [];
  const englishMatches: string[] = [];

  // Check words against language word sets
  for (const word of words) {
    if (SPANISH_WORDS.has(word)) {
      spanishScore += 1;
      spanishMatches.push(word);
    }
    if (ENGLISH_WORDS.has(word)) {
      englishScore += 1;
      englishMatches.push(word);
    }
  }

  // Check for Spanish-specific characters (strong signal)
  if (SPANISH_CHARS_PATTERN.test(text)) {
    spanishScore += 3;
  }

  // Check for English contractions (strong signal)
  const contractionMatches = text.match(ENGLISH_CONTRACTIONS_PATTERN);
  if (contractionMatches) {
    englishScore += contractionMatches.length * 2;
  }

  // Calculate confidence
  const totalScore = spanishScore + englishScore;
  const wordCount = words.length;

  // Normalize scores by word count to get a more fair comparison
  const normalizedSpanish = spanishScore / Math.max(1, wordCount);
  const normalizedEnglish = englishScore / Math.max(1, wordCount);

  // Determine language
  let language: 'en' | 'es' | 'unknown' = 'unknown';
  let confidence = 0;

  if (totalScore === 0) {
    // No matches found
    language = 'unknown';
    confidence = 0;
  } else if (spanishScore > englishScore) {
    language = 'es';
    confidence = Math.min(1, normalizedSpanish / 0.5); // 0.5 = threshold for full confidence
  } else if (englishScore > spanishScore) {
    language = 'en';
    confidence = Math.min(1, normalizedEnglish / 0.5);
  } else {
    // Equal scores - could be mixed or unclear
    // Default to English if scores are equal and non-zero
    if (englishScore > 0) {
      language = 'en';
      confidence = 0.5;
    }
  }

  const result: LanguageDetectionResult = { language, confidence };

  if (includeDebug) {
    result.debug = {
      spanishScore,
      englishScore,
      wordCount,
      spanishMatches,
      englishMatches,
    };
  }

  return result;
}

/**
 * Simple check if text appears to be Spanish.
 */
export function isSpanish(text: string): boolean {
  const result = detectLanguage(text);
  return result.language === 'es' && result.confidence > 0.3;
}

/**
 * Simple check if text appears to be English.
 */
export function isEnglish(text: string): boolean {
  const result = detectLanguage(text);
  return result.language === 'en' && result.confidence > 0.3;
}

/**
 * Get the language code with a fallback.
 */
export function getLanguageWithFallback(text: string, fallback: 'en' | 'es' = 'en'): 'en' | 'es' {
  const result = detectLanguage(text);
  if (result.language === 'unknown' || result.confidence < 0.3) {
    return fallback;
  }
  return result.language;
}

/**
 * Detect language from multiple text samples (more reliable).
 */
export function detectLanguageFromSamples(texts: string[]): LanguageDetectionResult {
  let totalSpanish = 0;
  let totalEnglish = 0;
  let totalWords = 0;

  for (const text of texts) {
    const result = detectLanguage(text, true);
    if (result.debug) {
      totalSpanish += result.debug.spanishScore;
      totalEnglish += result.debug.englishScore;
      totalWords += result.debug.wordCount;
    }
  }

  const totalScore = totalSpanish + totalEnglish;

  if (totalScore === 0) {
    return { language: 'unknown', confidence: 0 };
  }

  if (totalSpanish > totalEnglish) {
    return {
      language: 'es',
      confidence: Math.min(1, totalSpanish / Math.max(1, totalWords) / 0.3),
    };
  } else {
    return {
      language: 'en',
      confidence: Math.min(1, totalEnglish / Math.max(1, totalWords) / 0.3),
    };
  }
}
