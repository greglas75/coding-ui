// ═══════════════════════════════════════════════════════════════
// 🧪 Tests: Web Context Provider
// ═══════════════════════════════════════════════════════════════

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildPromptWithWebContext,
    buildWebContextSection,
    clearSearchCache,
    extractKeyTerms,
    googleSearch,
    type WebContext,
} from '../services/webContextProvider';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('extractKeyTerms', () => {
  it('should extract meaningful terms from text', () => {
    const input = 'I prefer GCash because it is faster than Maya';
    const result = extractKeyTerms(input);

    expect(result).toContain('gcash');
    expect(result).toContain('faster');
    expect(result).toContain('maya');

    // Should not contain stop words
    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
    expect(result).not.toContain('because');
  });

  it('should handle empty input', () => {
    expect(extractKeyTerms('')).toBe('');
    expect(extractKeyTerms('   ')).toBe('');
  });

  it('should remove special characters', () => {
    const input = 'I love GCash! It\'s #1 <best> payment app';
    const result = extractKeyTerms(input);

    expect(result).toContain('love');
    expect(result).toContain('gcash');
    expect(result).toContain('payment');
    expect(result).not.toContain('!');
    expect(result).not.toContain('#');
    expect(result).not.toContain('<');
  });

  it('should limit to max terms', () => {
    const input = 'one two three four five six seven eight';
    const result = extractKeyTerms(input, 3);
    const terms = result.split(' ');

    expect(terms.length).toBeLessThanOrEqual(3);
  });

  it('should truncate long input', () => {
    const longInput = 'a'.repeat(200);
    const result = extractKeyTerms(longInput);

    // Should process only first ~100 chars
    expect(result.length).toBeLessThan(200);
  });

  it('should remove duplicates', () => {
    const input = 'GCash GCash GCash Maya Maya';
    const result = extractKeyTerms(input);

    const terms = result.split(' ');
    const uniqueTerms = new Set(terms);

    expect(terms.length).toBe(uniqueTerms.size);
  });
});

describe('googleSearch', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    // Save original fetch
    originalFetch = global.fetch;
    // Replace with mock
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearSearchCache();

    // Set mock environment variables
    import.meta.env.VITE_GOOGLE_CSE_API_KEY = 'test-api-key';
    import.meta.env.VITE_GOOGLE_CSE_CX_ID = 'test-cx-id';
  });

  it('should return empty array when disabled', async () => {
    const results = await googleSearch('test query', { enabled: false });

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return empty array for empty query', async () => {
    const results = await googleSearch('');

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return empty array when API not configured', async () => {
    import.meta.env.VITE_GOOGLE_CSE_API_KEY = '';
    import.meta.env.VITE_GOOGLE_CSE_CX_ID = '';

    const results = await googleSearch('test query');

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch and return search results', async () => {
    const mockResponse: WebContext[] = [
      {
        title: 'GCash - Philippines',
        snippet: 'Leading mobile wallet in the Philippines',
        url: 'https://www.gcash.com',
      },
      {
        title: 'Maya - Digital Bank',
        snippet: 'Digital bank and payment app',
        url: 'https://www.maya.ph',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockResponse.map(item => ({
          title: item.title,
          snippet: item.snippet,
          link: item.url,
        })),
      }),
    });

    const results = await googleSearch('GCash Maya');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('GCash');
    expect(results[1].title).toContain('Maya');
  });

  it('should limit results to numResults', async () => {
    const mockItems = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i + 1}`,
      snippet: `Snippet ${i + 1}`,
      link: `https://example.com/${i + 1}`,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    const results = await googleSearch('test query', { numResults: 3 });

    expect(results).toHaveLength(3);
  });

  it('should use cache on second call', async () => {
    const mockItems = [
      {
        title: 'Test Result',
        snippet: 'Test snippet',
        link: 'https://example.com',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    // First call - should fetch
    const results1 = await googleSearch('test query');
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(results1).toHaveLength(1);

    // Second call - should use cache
    const results2 = await googleSearch('test query');
    expect(mockFetch).toHaveBeenCalledOnce(); // Still only one call
    expect(results2).toHaveLength(1);
    expect(results2).toEqual(results1);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const results = await googleSearch('test query');

    expect(results).toEqual([]);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await googleSearch('test query');

    expect(results).toEqual([]);
  });

  it('should truncate long snippets', async () => {
    const longSnippet = 'a'.repeat(300);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            title: 'Test',
            snippet: longSnippet,
            link: 'https://example.com',
          },
        ],
      }),
    });

    const results = await googleSearch('test query', { maxSnippetLength: 150 });

    expect(results[0].snippet.length).toBeLessThanOrEqual(154); // 150 + "..."
  });

  it('should remove duplicate URLs', async () => {
    const mockItems = [
      {
        title: 'Result 1',
        snippet: 'First',
        link: 'https://example.com',
      },
      {
        title: 'Result 2',
        snippet: 'Second',
        link: 'https://example.com', // Duplicate
      },
      {
        title: 'Result 3',
        snippet: 'Third',
        link: 'https://other.com',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    const results = await googleSearch('test query');

    expect(results).toHaveLength(2); // One duplicate removed
    expect(results.map(r => r.url)).toEqual([
      'https://example.com',
      'https://other.com',
    ]);
  });
});

describe('buildWebContextSection', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearSearchCache();

    import.meta.env.VITE_GOOGLE_CSE_API_KEY = 'test-api-key';
    import.meta.env.VITE_GOOGLE_CSE_CX_ID = 'test-cx-id';
  });

  it('should return empty string when disabled', async () => {
    const result = await buildWebContextSection('test query', { enabled: false });

    expect(result).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return empty string when no results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await buildWebContextSection('test query');

    expect(result).toBe('');
  });

  it('should format results into context section', async () => {
    const mockItems = [
      {
        title: 'GCash',
        snippet: 'Mobile wallet in Philippines',
        link: 'https://gcash.com',
      },
      {
        title: 'Maya',
        snippet: 'Digital bank in Philippines',
        link: 'https://maya.ph',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    const result = await buildWebContextSection('GCash Maya');

    expect(result).toContain('Context from Web:');
    expect(result).toContain('1. GCash — Mobile wallet in Philippines');
    expect(result).toContain('2. Maya — Digital bank in Philippines');
  });
});

describe('buildPromptWithWebContext', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearSearchCache();

    import.meta.env.VITE_GOOGLE_CSE_API_KEY = 'test-api-key';
    import.meta.env.VITE_GOOGLE_CSE_CX_ID = 'test-cx-id';
  });

  it('should return base prompt when useWebContext is false', async () => {
    const basePrompt = 'Base prompt text';
    const input = 'GCash Maya';
    const settings = { useWebContext: false };

    const result = await buildPromptWithWebContext(basePrompt, input, settings);

    expect(result).toBe(basePrompt);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should add web context when useWebContext is true', async () => {
    const basePrompt = 'Base prompt text';
    const input = 'I prefer GCash over Maya';

    const mockItems = [
      {
        title: 'GCash',
        snippet: 'Mobile wallet',
        link: 'https://gcash.com',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    const result = await buildPromptWithWebContext(basePrompt, input, { useWebContext: true });

    expect(result).toContain(basePrompt);
    expect(result).toContain('Context from Web:');
    expect(result).toContain('GCash');
  });

  it('should default to useWebContext = true when not specified', async () => {
    const basePrompt = 'Base prompt text';
    const input = 'GCash';

    const mockItems = [
      {
        title: 'GCash',
        snippet: 'Mobile wallet',
        link: 'https://gcash.com',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    // No settings provided - should default to enabled
    const result = await buildPromptWithWebContext(basePrompt, input);

    expect(result).toContain('Context from Web:');
  });

  it('should return base prompt when no key terms extracted', async () => {
    const basePrompt = 'Base prompt text';
    const input = 'the and or'; // Only stop words

    const result = await buildPromptWithWebContext(basePrompt, input);

    expect(result).toBe(basePrompt);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return base prompt when search returns no results', async () => {
    const basePrompt = 'Base prompt text';
    const input = 'GCash';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await buildPromptWithWebContext(basePrompt, input);

    expect(result).toBe(basePrompt);
  });
});

describe('Cache Management', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    clearSearchCache();

    import.meta.env.VITE_GOOGLE_CSE_API_KEY = 'test-api-key';
    import.meta.env.VITE_GOOGLE_CSE_CX_ID = 'test-cx-id';
  });

  it('should clear cache', async () => {
    const mockItems = [
      {
        title: 'Test',
        snippet: 'Test snippet',
        link: 'https://example.com',
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    // First call - fetch
    await googleSearch('test query');
    expect(mockFetch).toHaveBeenCalledOnce();

    // Second call - cached
    await googleSearch('test query');
    expect(mockFetch).toHaveBeenCalledOnce();

    // Clear cache
    clearSearchCache();

    // Third call - should fetch again
    await googleSearch('test query');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

