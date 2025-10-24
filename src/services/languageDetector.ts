/**
 * 🌍 Language Detection & Translation
 *
 * Detects the language of user answers and translates category names
 * to improve Google Search relevance.
 */

/**
 * Detect language from text using Unicode ranges and common patterns
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  const trimmed = text.trim();

  // Arabic (most common in MENA surveys)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(trimmed)) {
    return 'ar';
  }

  // Hebrew
  if (/[\u0590-\u05FF]/.test(trimmed)) {
    return 'he';
  }

  // Cyrillic (Russian, Ukrainian, etc.)
  if (/[\u0400-\u04FF]/.test(trimmed)) {
    return 'ru';
  }

  // Chinese (Simplified & Traditional)
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(trimmed)) {
    return 'zh';
  }

  // Japanese (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed)) {
    return 'ja';
  }

  // Korean (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed)) {
    return 'ko';
  }

  // Thai
  if (/[\u0E00-\u0E7F]/.test(trimmed)) {
    return 'th';
  }

  // Greek
  if (/[\u0370-\u03FF]/.test(trimmed)) {
    return 'el';
  }

  // Polish (ą, ć, ę, ł, ń, ó, ś, ź, ż)
  if (/[ąćęłńóśźż]/i.test(trimmed)) {
    return 'pl';
  }

  // Czech/Slovak (ě, š, č, ř, ž, ý, á, í, é)
  if (/[ěščřžýáíé]/i.test(trimmed)) {
    return 'cs';
  }

  // Turkish (ğ, ş, ı, ü, ö, ç)
  if (/[ğşıüöç]/i.test(trimmed)) {
    return 'tr';
  }

  // Vietnamese (ă, ê, ô, ơ, ư with diacritics)
  if (/[ăêôơư]/.test(trimmed)) {
    return 'vi';
  }

  // Spanish/Portuguese (ñ, á, é, í, ó, ú, ã, õ)
  if (/[ñáéíóúãõ]/i.test(trimmed)) {
    // Check for Portuguese-specific
    if (/[ãõ]/i.test(trimmed)) {
      return 'pt';
    }
    return 'es';
  }

  // French (é, è, ê, ë, à, ù, ç, œ)
  if (/[éèêëàùçœ]/i.test(trimmed)) {
    return 'fr';
  }

  // German (ä, ö, ü, ß)
  if (/[äöüß]/i.test(trimmed)) {
    return 'de';
  }

  // Italian (à, è, é, ì, ò, ù)
  if (/[àèéìòù]/i.test(trimmed)) {
    return 'it';
  }

  // Default to English
  return 'en';
}

/**
 * Translate category name to target language using Google Translate API
 */
export async function translateCategoryName(
  categoryName: string,
  targetLanguage: string
): Promise<string> {
  // No translation needed for English
  if (targetLanguage === 'en') {
    return categoryName;
  }

  try {
    const apiKey = localStorage.getItem('google_cse_api_key');

    if (!apiKey) {
      simpleLogger.warn('⚠️ No Google API key - skipping translation');
      return categoryName; // Return original if no API key
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: categoryName,
        target: targetLanguage,
        format: 'text',
      }),
    });

    if (!response.ok) {
      simpleLogger.warn('⚠️ Translation API error:', response.status);
      return categoryName;
    }

    const data = await response.json();
    const translated = data.data?.translations?.[0]?.translatedText || categoryName;

    simpleLogger.info(`🌍 Translated "${categoryName}" → "${translated}" (${targetLanguage})`);

    return translated;

  } catch (error) {
    simpleLogger.warn('⚠️ Translation failed:', error);
    return categoryName; // Return original on error
  }
}

/**
 * Build optimized search query with translated category name
 * This function NEVER throws - always returns a valid query
 */
export async function buildLocalizedSearchQuery(
  userAnswer: string,
  categoryName: string
): Promise<{ query: string; language: string }> {
  try {
    const language = detectLanguage(userAnswer);

    simpleLogger.info(`🌍 Detected language: ${language} for answer: "${userAnswer.substring(0, 50)}..."`);

    // Translate category name to detected language
    const translatedCategory = await translateCategoryName(categoryName, language);

    // Build query: "{user_answer} {translated_category}"
    const query = `${userAnswer.trim()} ${translatedCategory}`.trim();

    return { query, language };

  } catch (error) {
    simpleLogger.warn('⚠️ Localized search query failed, using original:', error);
    // Fallback: return original answer without category name
    return {
      query: userAnswer.trim(),
      language: 'en',
    };
  }
}

/**
 * Language name mappings for display
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic',
  he: 'Hebrew',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  th: 'Thai',
  el: 'Greek',
  pl: 'Polish',
  cs: 'Czech',
  tr: 'Turkish',
  vi: 'Vietnamese',
  pt: 'Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  en: 'English',
};
