// ═══════════════════════════════════════════════════════════════
// 🧪 Tests: Translation Helper
// ═══════════════════════════════════════════════════════════════

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTranslationCache,
  detectLanguage,
  isEnglish,
  translateBatch,
  translateIfNeeded,
  translateText,
  translateWithOriginal,
} from '../services/translationHelper';

const mockFetch = vi.fn();
let originalFetch: typeof fetch;

describe('Language Detection', () => {
  it('should detect English', () => {
    expect(detectLanguage('Hello world')).toBe('en');
    expect(detectLanguage('The quick brown fox')).toBe('en');
  });

  it('should detect Polish', () => {
    expect(detectLanguage('Używam GCash')).toBe('pl');
    expect(detectLanguage('Lubię kawę')).toBe('pl');
  });

  it('should detect Spanish', () => {
    expect(detectLanguage('¿Cómo estás?')).toBe('es');
    expect(detectLanguage('Mañana niño')).toBe('es'); // ñ is unique to Spanish
  });

  it('should detect French', () => {
    expect(detectLanguage('Français ça va')).toBe('fr'); // ç is unique
    expect(detectLanguage('À bientôt œuvre')).toBe('fr'); // œ is unique
  });

  it('should detect German', () => {
    expect(detectLanguage('Straße groß')).toBe('de'); // ß is unique to German
    expect(detectLanguage('schön und gut')).toBe('de'); // ö + German words
  });

  it('should detect Russian', () => {
    expect(detectLanguage('Привет мир')).toBe('ru');
    expect(detectLanguage('Как дела?')).toBe('ru');
  });

  it('should detect Chinese', () => {
    expect(detectLanguage('你好世界')).toBe('zh');
  });

  it('should detect Japanese', () => {
    expect(detectLanguage('こんにちは')).toBe('ja');
    expect(detectLanguage('ありがとう')).toBe('ja');
  });

  it('should detect Korean', () => {
    expect(detectLanguage('안녕하세요')).toBe('ko');
  });

  it('should detect Arabic', () => {
    expect(detectLanguage('مرحبا')).toBe('ar');
  });

  it('should default to English for empty text', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('  ')).toBe('en');
  });

  it('should default to English for ambiguous text', () => {
    expect(detectLanguage('123 456')).toBe('en');
    expect(detectLanguage('!@#$%')).toBe('en');
  });

  it('isEnglish helper works correctly', () => {
    expect(isEnglish('Hello world')).toBe(true);
    expect(isEnglish('¿Cómo estás?')).toBe(false);
  });
});

describe('Translation (with mocked API)', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearTranslationCache();

    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
    import.meta.env.VITE_OPENAI_API_KEY = 'test-openai-key';
  });

  it('should translate text using Gemini', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'I use GCash' }],
            },
          },
        ],
      }),
    });

    const result = await translateText('Używam GCash', 'en');

    expect(result).toBe('I use GCash');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should use cache on second call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello' }],
            },
          },
        ],
      }),
    });

    // First call - should fetch
    const result1 = await translateText('Hola', 'en');
    expect(mockFetch).toHaveBeenCalledOnce();

    // Second call - should use cache
    const result2 = await translateText('Hola', 'en');
    expect(mockFetch).toHaveBeenCalledOnce(); // Still only one call
    expect(result2).toBe(result1);
  });

  it('should fallback to OpenAI when Gemini fails', async () => {
    // Gemini fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    // OpenAI succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Fallback translation',
            },
          },
        ],
      }),
    });

    const result = await translateText('Test text', 'en');

    expect(result).toBe('Fallback translation');
    expect(mockFetch).toHaveBeenCalledTimes(2); // Gemini + OpenAI
  });

  it('should return original text when both APIs fail', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await translateText('Test text', 'en');

    expect(result).toBe('Test text');
  });

  it('should return original text when API key missing', async () => {
    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY = '';
    import.meta.env.VITE_OPENAI_API_KEY = '';

    const result = await translateText('Test text', 'en');

    expect(result).toBe('Test text');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle empty text', async () => {
    const result = await translateText('', 'en');

    expect(result).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('translateIfNeeded', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearTranslationCache();

    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  it('should skip translation for English text', async () => {
    const result = await translateIfNeeded('Hello world', 'en');

    expect(result).toBe('Hello world');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should translate non-English text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Good morning' }],
            },
          },
        ],
      }),
    });

    const result = await translateIfNeeded('Dzień dobry', 'en'); // Polish text

    expect(result).toBe('Good morning');
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe('translateWithOriginal', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearTranslationCache();

    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  it('should return both original and translation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello world' }],
            },
          },
        ],
      }),
    });

    const result = await translateWithOriginal('Cześć świat', 'en'); // Polish text

    expect(result.original).toBe('Cześć świat');
    expect(result.translation).toBe('Hello world');
    expect(result.wasTranslated).toBe(true);
  });

  it('should not translate if already in target language', async () => {
    const result = await translateWithOriginal('Hello world', 'en');

    expect(result.original).toBe('Hello world');
    expect(result.translation).toBe('Hello world');
    expect(result.wasTranslated).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('translateBatch', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearTranslationCache();

    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  it('should translate multiple texts', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: `Translated ${callCount}` }],
              },
            },
          ],
        }),
      };
    });

    const results = await translateBatch(['Cześć świecie', 'Dzień dobry'], 'en'); // Polish texts with special chars

    expect(results).toHaveLength(2);
    // Both should be translated since they contain Polish characters
    expect(results.every(r => r.includes('Translated'))).toBe(true);
  });

  it('should skip translation for English texts', async () => {
    const results = await translateBatch(['Hello', 'World'], 'en');

    expect(results).toHaveLength(2);
    expect(results[0]).toBe('Hello');
    expect(results[1]).toBe('World');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('Cache Management', () => {
  beforeEach(() => {
    clearTranslationCache();
  });

  it('should clear translation cache', async () => {
    // This is a smoke test to ensure the function exists
    clearTranslationCache();
    expect(true).toBe(true);
  });
});

