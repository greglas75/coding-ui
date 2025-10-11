// ═══════════════════════════════════════════════════════════════
// 🌎 Translation Helper - Auto-translation with Gemini-2.5-Pro
// ═══════════════════════════════════════════════════════════════

import { logError, logInfo } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Language Detection
// ───────────────────────────────────────────────────────────────

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  en: [/^[a-zA-Z\s]+$/, /\b(the|and|or|is|are|was|were)\b/i],
  es: [/[áéíóúñ]/i, /\b(el|la|los|las|de|que|es|en)\b/i],
  fr: [/[àâäéèêëïîôùûüÿ]/i, /\b(le|la|les|de|et|est|dans)\b/i],
  de: [/[äöüß]/i, /\b(der|die|das|und|ist|in|zu)\b/i],
  it: [/[àèéìòù]/i, /\b(il|la|di|che|è|in|per)\b/i],
  pl: [/[ąćęłńóśźż]/i, /\b(i|w|na|z|do|że|się)\b/i],
  pt: [/[ãõâêôçáéíóú]/i, /\b(o|a|os|as|de|que|e|em)\b/i],
  ru: [/[а-яА-ЯёЁ]/],
  zh: [/[\u4e00-\u9fff]/],
  ja: [/[\u3040-\u309f\u30a0-\u30ff]/],
  ko: [/[\uac00-\ud7af]/],
  ar: [/[\u0600-\u06ff]/],
};

/**
 * Detects the language of input text.
 * Returns ISO 639-1 language code (e.g., 'en', 'es', 'pl').
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  const cleanText = text.toLowerCase().trim();
  const originalText = text.trim();

  // Priority 1: Non-Latin scripts (one match is enough)
  for (const lang of ['ru', 'zh', 'ja', 'ko', 'ar']) {
    const patterns = LANGUAGE_PATTERNS[lang];
    if (patterns.some(pattern => pattern.test(originalText))) {
      return lang;
    }
  }

  // Priority 2: Special characters (diacritics) - check unique chars first
  // Polish-specific: ą, ę, ł, ń, ś, ź, ż (most unique)
  if (/[ąęłńśźż]/.test(originalText)) return 'pl';

  // German-specific: ß (unique), ä, ö, ü
  if (/ß/.test(originalText)) return 'de';
  if (/[äöü]/.test(originalText) && /\b(der|die|das|und|ist)\b/i.test(cleanText)) return 'de';

  // Spanish-specific: ñ (unique), ¿, ¡
  if (/ñ/.test(originalText)) return 'es';
  if (/[¿¡]/.test(originalText)) return 'es';
  if (/[áéíóú]/.test(originalText) && /\b(el|la|de|que|es)\b/i.test(cleanText)) return 'es';

  // French-specific: œ, æ, ç
  if (/[œæç]/.test(originalText)) return 'fr';
  if (/[àâäéèêëîïôûùüÿ]/.test(originalText) && /\b(le|la|de|et|est)\b/i.test(cleanText)) return 'fr';

  // For other languages with overlapping chars, check patterns
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (['ru', 'zh', 'ja', 'ko', 'ar', 'en', 'pl', 'de'].includes(lang)) continue;

    const specialCharPattern = patterns[0];
    if (specialCharPattern && specialCharPattern.test(originalText)) {
      // Double-check with word pattern if available
      const wordPattern = patterns[1];
      if (wordPattern && wordPattern.test(cleanText)) {
        return lang;
      }
    }
  }

  // Priority 3: Common words
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (['ru', 'zh', 'ja', 'ko', 'ar', 'en'].includes(lang)) continue;

    const wordPattern = patterns[1]; // Second pattern is usually common words
    if (wordPattern && wordPattern.test(cleanText)) {
      return lang;
    }
  }

  // Default to English
  return 'en';
}

/**
 * Checks if text is in English.
 */
export function isEnglish(text: string): boolean {
  return detectLanguage(text) === 'en';
}

// ───────────────────────────────────────────────────────────────
// Translation
// ───────────────────────────────────────────────────────────────

const translationCache = new Map<string, string>();
const CACHE_TTL = 3600000; // 1 hour

interface CacheEntry {
  translation: string;
  timestamp: number;
}

/**
 * Translates text to target language using Gemini-2.5-Pro with GPT-4.5-Turbo fallback.
 *
 * @param text - Text to translate
 * @param targetLang - Target language (default: 'en')
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLang: string = 'en'
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Check cache
  const cacheKey = `${text}:${targetLang}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    const entry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age < CACHE_TTL) {
      logInfo(`Translation cache hit: "${text.substring(0, 50)}..."`, {
        component: 'TranslationHelper',
        tags: { targetLang },
      });
      return entry.translation;
    }

    translationCache.delete(cacheKey);
  }

  try {
    logInfo(`Translating text to ${targetLang}: "${text.substring(0, 50)}..."`, {
      component: 'TranslationHelper',
    });

    // Try Gemini first (primary)
    const translation = await translateWithGemini(text, targetLang);

    // Cache result
    const entry: CacheEntry = {
      translation,
      timestamp: Date.now(),
    };
    translationCache.set(cacheKey, JSON.stringify(entry));

    // Limit cache size
    if (translationCache.size > 100) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) {
        translationCache.delete(firstKey);
      }
    }

    logInfo(`Translation complete: "${translation.substring(0, 50)}..."`, {
      component: 'TranslationHelper',
      extra: { originalLength: text.length, translatedLength: translation.length },
    });

    return translation;
  } catch (error) {
    logError('Gemini translation failed, trying fallback...', {
      component: 'TranslationHelper',
      extra: { text: text.substring(0, 100), targetLang },
    }, error instanceof Error ? error : new Error(String(error)));

    // Fallback to GPT-4.5-Turbo
    try {
      const translation = await translateWithOpenAI(text, targetLang);

      // Cache fallback result
      const entry: CacheEntry = {
        translation,
        timestamp: Date.now(),
      };
      translationCache.set(cacheKey, JSON.stringify(entry));

      return translation;
    } catch (fallbackError) {
      logError('Fallback translation failed', {
        component: 'TranslationHelper',
      }, fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));

      return text; // Return original on complete failure
    }
  }
}

/**
 * Translates using Gemini-2.5-Pro (primary method).
 */
async function translateWithGemini(text: string, targetLang: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `Translate the following text to ${getLanguageName(targetLang)}. Keep the exact meaning and tone. Return ONLY the translation, no explanations:

${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent translation
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const translation =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

  return translation;
}

/**
 * Translates using GPT-4.5-Turbo (fallback method).
 */
async function translateWithOpenAI(text: string, targetLang: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  logInfo(`Using GPT-4.5-Turbo fallback for translation`, {
    component: 'TranslationHelper',
  });

  const prompt = `Translate the following text to ${getLanguageName(targetLang)}, keeping the meaning and tone. Return only the translation:

${text}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const translation = data?.choices?.[0]?.message?.content?.trim() || text;

  return translation;
}

/**
 * Translates text to English if needed.
 * Detects language first, only translates if not English.
 */
export async function translateIfNeeded(
  text: string,
  targetLang: string = 'en'
): Promise<string> {
  const detectedLang = detectLanguage(text);

  if (detectedLang === targetLang) {
    logInfo(`Text already in ${targetLang}, skipping translation`, {
      component: 'TranslationHelper',
    });
    return text;
  }

  return await translateText(text, targetLang);
}

/**
 * Translates text and returns both original and translation.
 */
export async function translateWithOriginal(
  text: string,
  targetLang: string = 'en'
): Promise<{ original: string; translation: string; wasTranslated: boolean }> {
  const detectedLang = detectLanguage(text);

  if (detectedLang === targetLang) {
    return {
      original: text,
      translation: text,
      wasTranslated: false,
    };
  }

  const translation = await translateText(text, targetLang);

  return {
    original: text,
    translation,
    wasTranslated: true,
  };
}

/**
 * Clears translation cache.
 */
export function clearTranslationCache(): void {
  translationCache.clear();
  logInfo('Translation cache cleared', { component: 'TranslationHelper' });
}

/**
 * Gets human-readable language name from code.
 */
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pl: 'Polish',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
  };

  return names[code] || 'English';
}

/**
 * Batch translates multiple texts.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string = 'en'
): Promise<string[]> {
  const results: string[] = [];

  for (const text of texts) {
    const translation = await translateIfNeeded(text, targetLang);
    results.push(translation);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

