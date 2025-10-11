// ═══════════════════════════════════════════════════════════════
// 🌐 Google Search Context Provider
// Enriches AI prompts with web context from Google Custom Search
// ═══════════════════════════════════════════════════════════════

import { logError, logInfo, logWarn } from '../utils/logger';
import { sanitizeForAPI } from '../utils/pii';

// ───────────────────────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────────────────────

export interface WebContext {
  title: string;
  snippet: string;
  url: string;
}

export interface ImageSearchResult {
  title: string;
  link: string;
  thumbnailLink?: string;
  contextLink?: string;
}

export interface WebContextOptions {
  enabled?: boolean; // default: true
  numResults?: number; // default: 3
  maxSnippetLength?: number; // default: 150
  cacheTTL?: number; // default: 3600000 (1 hour in ms)
}

export interface GoogleSearchResponse {
  items?: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

interface CacheEntry {
  data: WebContext[] | ImageSearchResult[] | any;
  timestamp: number;
}

// ───────────────────────────────────────────────────────────────
// Cache
// ───────────────────────────────────────────────────────────────

const searchCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 3600000; // 1 hour

function getCachedResult(query: string, ttl: number = DEFAULT_CACHE_TTL): WebContext[] | null {
  const cached = searchCache.get(query);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;

  if (age > ttl) {
    searchCache.delete(query);
    return null;
  }

  logInfo(`Cache hit for query: "${query}" (age: ${Math.round(age / 1000)}s)`, {
    component: 'WebContextProvider',
    tags: { cache: 'hit' },
  });

  return cached.data;
}

function setCachedResult(query: string, data: WebContext[]): void {
  searchCache.set(query, {
    data,
    timestamp: Date.now(),
  });

  // Limit cache size to 100 entries (LRU-style)
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) {
      searchCache.delete(firstKey);
    }
  }
}

export function clearSearchCache(): void {
  searchCache.clear();
  logInfo('Search cache cleared', { component: 'WebContextProvider' });
}

// ───────────────────────────────────────────────────────────────
// Stop Words (for key term extraction)
// ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'am', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this',
  'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'because', 'prefer',
  'like', 'use', 'using', 'used', 'get', 'got', 'make', 'made',
]);

// ───────────────────────────────────────────────────────────────
// Key Term Extraction
// ───────────────────────────────────────────────────────────────

/**
 * Extracts 2-5 key terms from input text for search query.
 * Removes stop words, special characters, and keeps meaningful terms.
 *
 * @example
 * extractKeyTerms("I prefer GCash because it's faster than Maya")
 * // Returns: "GCash faster Maya"
 */
export function extractKeyTerms(input: string, maxTerms: number = 5): string {
  if (!input || input.trim().length === 0) return '';

  // Truncate to first ~100 characters for efficiency
  const truncated = input.substring(0, 100);

  // Remove special characters, keep alphanumeric and spaces
  const cleaned = truncated
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words
  const words = cleaned.split(' ');

  // Filter out stop words and very short words (< 3 chars)
  const meaningfulWords = words.filter(word =>
    word.length >= 3 && !STOP_WORDS.has(word)
  );

  // Remove duplicates (case-insensitive)
  const uniqueWords = Array.from(new Set(meaningfulWords));

  // Take first N meaningful words
  const keyTerms = uniqueWords.slice(0, maxTerms);

  // Join with spaces
  const result = keyTerms.join(' ');

  logInfo(`Extracted key terms: "${result}" from "${input.substring(0, 50)}..."`, {
    component: 'WebContextProvider',
    extra: { originalLength: input.length, termsCount: keyTerms.length },
  });

  return result;
}

// ───────────────────────────────────────────────────────────────
// Google Search API
// ───────────────────────────────────────────────────────────────

/**
 * Performs Google Custom Search and returns results.
 * Uses environment variables for API credentials.
 *
 * @param query - Search query (should be pre-sanitized)
 * @param options - Configuration options
 * @returns Array of search results
 */
export async function googleSearch(
  query: string,
  options?: WebContextOptions
): Promise<WebContext[]> {
  const {
    enabled = true,
    numResults = 3,
    maxSnippetLength = 150,
    cacheTTL = DEFAULT_CACHE_TTL,
  } = options || {};

  // Early exit if disabled
  if (!enabled) {
    logInfo('Google Search disabled via options', { component: 'WebContextProvider' });
    return [];
  }

  // Validate query
  if (!query || query.trim().length === 0) {
    logWarn('Empty search query provided', { component: 'WebContextProvider' });
    return [];
  }

  // Sanitize query for safety
  const sanitizedQuery = sanitizeForAPI(query, 200);

  // Check cache first
  const cached = getCachedResult(sanitizedQuery, cacheTTL);
  if (cached) {
    return cached.slice(0, numResults);
  }

  // Get API credentials from localStorage or env
  const apiKey = localStorage.getItem('google_cse_api_key') || import.meta.env.VITE_GOOGLE_CSE_API_KEY;
  const cxId = localStorage.getItem('google_cse_cx_id') || import.meta.env.VITE_GOOGLE_CSE_CX_ID;

  if (!apiKey || !cxId) {
    logError('Google Custom Search API not configured', {
      component: 'WebContextProvider',
      extra: {
        hasApiKey: !!apiKey,
        hasCxId: !!cxId,
      },
    });
    return [];
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('q', sanitizedQuery);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cxId);
    url.searchParams.set('num', String(Math.min(numResults, 10))); // Max 10 per request

    logInfo(`Fetching Google Search results for: "${sanitizedQuery}"`, {
      component: 'WebContextProvider',
    });

    // Fetch with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    let lastError: Error | null = null;
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data: GoogleSearchResponse = await response.json();

        // Check for API errors
        if (data.error) {
          throw new Error(`Google API Error ${data.error.code}: ${data.error.message}`);
        }

        // Extract results
        const items = data.items || [];
        const results: WebContext[] = items.map(item => ({
          title: item.title || 'No title',
          snippet: truncateSnippet(item.snippet || '', maxSnippetLength),
          url: item.link || '',
        }));

        // Remove duplicates (by URL)
        const uniqueResults = Array.from(
          new Map(results.map(r => [r.url, r])).values()
        );

        logInfo(`Found ${uniqueResults.length} search results`, {
          component: 'WebContextProvider',
          extra: { query: sanitizedQuery, resultsCount: uniqueResults.length },
        });

        // Cache results
        setCachedResult(sanitizedQuery, uniqueResults);

        return uniqueResults.slice(0, numResults);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          logWarn(`Search attempt ${attempt + 1} failed, retrying...`, {
            component: 'WebContextProvider',
            extra: { error: lastError.message },
          });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Search failed after retries');

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError('Google Search failed', {
      component: 'WebContextProvider',
      extra: { query: sanitizedQuery, error: err.message },
    }, err);

    return [];
  }
}

// ───────────────────────────────────────────────────────────────
// Context Builder
// ───────────────────────────────────────────────────────────────

/**
 * Builds a formatted web context section for AI prompts.
 *
 * @param query - Search query (will be extracted/sanitized)
 * @param options - Configuration options
 * @returns Formatted context string
 *
 * @example
 * const context = await buildWebContextSection("GCash Maya Philippines");
 * // Returns:
 * // "Context from Web:
 * //  1. GCash - Leading mobile wallet in the Philippines...
 * //  2. Maya - Digital bank and payment app in the Philippines..."
 */
export async function buildWebContextSection(
  query: string,
  options?: WebContextOptions
): Promise<string> {
  const { enabled = true } = options || {};

  if (!enabled) {
    return '';
  }

  const results = await googleSearch(query, options);

  if (results.length === 0) {
    return '';
  }

  const contextLines = results.map((result, index) => {
    return `${index + 1}. ${result.title} — ${result.snippet}`;
  });

  const contextSection = `Context from Web:\n${contextLines.join('\n')}`;

  return contextSection;
}

// ───────────────────────────────────────────────────────────────
// Prompt Builder with Web Context
// ───────────────────────────────────────────────────────────────

export interface CategorySettings {
  useWebContext?: boolean; // default: true
}

/**
 * Builds a complete AI prompt with optional web context.
 *
 * @param basePrompt - Base prompt template
 * @param input - User input to extract search terms from
 * @param settings - Category/project settings
 * @returns Enhanced prompt with web context (if enabled)
 */
export async function buildPromptWithWebContext(
  basePrompt: string,
  input: string,
  settings?: CategorySettings
): Promise<string> {
  // Default to enabled
  const useWebContext = settings?.useWebContext ?? true;

  if (!useWebContext) {
    logInfo('Web context disabled for this category', {
      component: 'WebContextProvider',
    });
    return basePrompt;
  }

  // Extract key terms from input
  const query = extractKeyTerms(input);

  if (!query || query.trim().length === 0) {
    logWarn('No key terms extracted, skipping web context', {
      component: 'WebContextProvider',
    });
    return basePrompt;
  }

  // Fetch web context
  const webContext = await buildWebContextSection(query, {
    enabled: true,
    numResults: 3,
  });

  if (!webContext) {
    return basePrompt;
  }

  // Combine base prompt with web context
  const enhancedPrompt = `${basePrompt}

${webContext}`;

  logInfo('Prompt enhanced with web context', {
    component: 'WebContextProvider',
    extra: {
      query,
      contextLength: webContext.length,
      basePromptLength: basePrompt.length,
    },
  });

  return enhancedPrompt;
}

// ───────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────

function truncateSnippet(snippet: string, maxLength: number): string {
  if (snippet.length <= maxLength) {
    return snippet;
  }

  // Truncate at word boundary
  const truncated = snippet.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

// ───────────────────────────────────────────────────────────────
// Google Image Search
// ───────────────────────────────────────────────────────────────

export interface ImageSearchResult {
  title: string;
  link: string;
  thumbnailLink?: string;
  contextLink?: string;
}

/**
 * Performs Google Image Search and returns results.
 * Used for brand validation - checking for logos, packaging, products.
 *
 * @param query - Search query
 * @param numResults - Number of results (default: 5)
 * @returns Array of image search results
 */
export async function googleImageSearch(
  query: string,
  numResults: number = 5
): Promise<ImageSearchResult[]> {
  if (!query || query.trim().length === 0) {
    logWarn('Empty image search query provided', { component: 'WebContextProvider' });
    return [];
  }

  // Get API credentials from localStorage or env
  const apiKey = localStorage.getItem('google_cse_api_key') || import.meta.env.VITE_GOOGLE_CSE_API_KEY;
  const cxId = localStorage.getItem('google_cse_cx_id') || import.meta.env.VITE_GOOGLE_CSE_CX_ID;

  if (!apiKey || !cxId) {
    logError('Google Custom Search API not configured for image search', {
      component: 'WebContextProvider',
    });
    return [];
  }

  // Check cache first (using same cache as text search)
  const cacheKey = `image:${query}`;
  const cached = searchCache.get(cacheKey);

  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < 3600000) { // 1 hour TTL
      logInfo(`Image search cache hit for: "${query}"`, {
        component: 'WebContextProvider',
        tags: { cache: 'hit' },
      });
      return cached.data as ImageSearchResult[];
    }
    searchCache.delete(cacheKey);
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('q', query);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cxId);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', String(Math.min(numResults, 10)));

    logInfo(`Fetching Google Image Search results for: "${query}"`, {
      component: 'WebContextProvider',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();

    if (data.error) {
      throw new Error(`Google API Error ${data.error.code}: ${data.error.message}`);
    }

    const items = data.items || [];
    const results: ImageSearchResult[] = items.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      thumbnailLink: item.image?.thumbnailLink || undefined,
      contextLink: item.image?.contextLink || undefined,
    }));

    logInfo(`Found ${results.length} image search results`, {
      component: 'WebContextProvider',
      extra: { query, resultsCount: results.length },
    });

    // Cache results
    searchCache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
    });

    return results;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError('Google Image Search failed', {
      component: 'WebContextProvider',
      extra: { query, error: err.message },
    }, err);

    return [];
  }
}

// ───────────────────────────────────────────────────────────────
// Exports
// ───────────────────────────────────────────────────────────────

export default {
  googleSearch,
  googleImageSearch,
  buildWebContextSection,
  buildPromptWithWebContext,
  extractKeyTerms,
  clearSearchCache,
};

