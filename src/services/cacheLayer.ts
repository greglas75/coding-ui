// ═══════════════════════════════════════════════════════════════
// 💾 Cache Layer - Whitelist + Prompt Cache
// ═══════════════════════════════════════════════════════════════

import { logInfo } from '../utils/logger';
import type { LLMGenerateResult } from './llmClient';

// ───────────────────────────────────────────────────────────────
// Whitelist - Known entities/brands
// ───────────────────────────────────────────────────────────────

const DEFAULT_WHITELIST = [
  // Payment Methods
  'GCash',
  'Maya',
  'PayMaya',
  'PayPal',
  'Visa',
  'Mastercard',
  'American Express',
  'Amex',

  // E-commerce
  'Shopee',
  'Lazada',
  'Amazon',
  'eBay',
  'Alibaba',
  'Zalora',

  // Delivery/Transport
  'Grab',
  'Uber',
  'Lalamove',
  'FoodPanda',
  'GrabFood',

  // Telecom
  'Globe',
  'Smart',
  'PLDT',
  'Dito',

  // Social Media
  'Facebook',
  'Instagram',
  'Twitter',
  'X',
  'TikTok',
  'YouTube',

  // Brands (Toothpaste example)
  'Colgate',
  'Sensodyne',
  'Closeup',
  'Pepsodent',
  'Oral-B',

  // Common answers
  'Yes',
  'No',
  'None',
  'Other',
  'N/A',
  'Not applicable',
];

let customWhitelist: string[] = [];

/**
 * Sets custom whitelist items.
 */
export function setWhitelist(items: string[]): void {
  customWhitelist = items;
  logInfo(`Whitelist updated: ${items.length} items`, {
    component: 'CacheLayer',
  });
}

/**
 * Adds item to whitelist.
 */
export function addToWhitelist(item: string): void {
  if (!customWhitelist.includes(item)) {
    customWhitelist.push(item);
  }
}

/**
 * Checks if input matches whitelist.
 * Returns pre-defined result if match found.
 */
export function checkWhitelist(input: string): LLMGenerateResult | null {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const cleanInput = input.trim().toLowerCase();
  const allItems = [...DEFAULT_WHITELIST, ...customWhitelist];

  // Exact match (case-insensitive)
  const exactMatch = allItems.find(
    item => item.toLowerCase() === cleanInput
  );

  if (exactMatch) {
    logInfo(`Whitelist exact match: "${exactMatch}"`, {
      component: 'CacheLayer',
      tags: { type: 'whitelist', match: 'exact' },
    });

    return {
      text: exactMatch,
      model: 'whitelist',
      provider: 'openai', // Dummy provider
      fromWhitelist: true,
    };
  }

  // Partial match (input contains whitelist item)
  const partialMatch = allItems.find(item =>
    cleanInput.includes(item.toLowerCase())
  );

  if (partialMatch && partialMatch.length > 3) {
    // Only match if item is significant (>3 chars)
    logInfo(`Whitelist partial match: "${partialMatch}" in "${input}"`, {
      component: 'CacheLayer',
      tags: { type: 'whitelist', match: 'partial' },
    });

    return {
      text: partialMatch,
      model: 'whitelist',
      provider: 'openai',
      fromWhitelist: true,
    };
  }

  return null;
}

/**
 * Gets all whitelist items.
 */
export function getWhitelist(): string[] {
  return [...DEFAULT_WHITELIST, ...customWhitelist];
}

// ───────────────────────────────────────────────────────────────
// Prompt Cache
// ───────────────────────────────────────────────────────────────

interface CacheEntry {
  result: LLMGenerateResult;
  timestamp: number;
  hits: number;
}

const promptCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000;

/**
 * Gets cached result for prompt.
 */
export function getCachedResult(input: string): LLMGenerateResult | null {
  const cached = promptCache.get(input);

  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.timestamp;

  if (age > CACHE_TTL) {
    promptCache.delete(input);
    return null;
  }

  // Increment hit counter
  cached.hits++;

  logInfo(`Cache hit: "${input.substring(0, 50)}..." (hits: ${cached.hits})`, {
    component: 'CacheLayer',
    tags: { type: 'prompt_cache', hits: String(cached.hits) },
  });

  return cached.result;
}

/**
 * Caches result for prompt.
 */
export function cacheResult(input: string, result: LLMGenerateResult): void {
  // Don't cache errors or whitelist results
  if (result.fromWhitelist || result.text.includes('[Error')) {
    return;
  }

  promptCache.set(input, {
    result,
    timestamp: Date.now(),
    hits: 0,
  });

  // Limit cache size (LRU eviction)
  if (promptCache.size > MAX_CACHE_SIZE) {
    // Find least recently used (oldest timestamp)
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of promptCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      promptCache.delete(oldestKey);
    }
  }

  logInfo(`Cached result: "${input.substring(0, 50)}..."`, {
    component: 'CacheLayer',
    extra: { cacheSize: promptCache.size },
  });
}

/**
 * Clears prompt cache.
 */
export function clearPromptCache(): void {
  promptCache.clear();
  logInfo('Prompt cache cleared', { component: 'CacheLayer' });
}

/**
 * Gets cache statistics.
 */
export function getCacheStats(): {
  size: number;
  totalHits: number;
  averageHits: number;
  oldestEntry: number;
} {
  let totalHits = 0;
  let oldestTime = Date.now();

  for (const entry of promptCache.values()) {
    totalHits += entry.hits;
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
    }
  }

  return {
    size: promptCache.size,
    totalHits,
    averageHits: promptCache.size > 0 ? totalHits / promptCache.size : 0,
    oldestEntry: Date.now() - oldestTime,
  };
}

/**
 * Exports cache for persistence.
 */
export function exportCache(): string {
  const entries = Array.from(promptCache.entries()).map(([key, entry]) => ({
    input: key,
    result: entry.result,
    timestamp: entry.timestamp,
    hits: entry.hits,
  }));

  return JSON.stringify(entries);
}

/**
 * Imports cache from persistence.
 */
export function importCache(data: string): void {
  try {
    const entries = JSON.parse(data);

    for (const entry of entries) {
      // Only import entries less than 1 hour old
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        promptCache.set(entry.input, {
          result: entry.result,
          timestamp: entry.timestamp,
          hits: entry.hits || 0,
        });
      }
    }

    logInfo(`Imported ${entries.length} cache entries`, {
      component: 'CacheLayer',
    });
  } catch (error) {
    logInfo('Failed to import cache', {
      component: 'CacheLayer',
    });
  }
}

/**
 * Warms up cache with common queries.
 */
export function warmUpCache(commonQueries: Array<{ input: string; result: LLMGenerateResult }>): void {
  for (const { input, result } of commonQueries) {
    cacheResult(input, result);
  }

  logInfo(`Cache warmed up with ${commonQueries.length} queries`, {
    component: 'CacheLayer',
  });
}

// ───────────────────────────────────────────────────────────────
// Multi-Namespace Cache (Generic)
// ───────────────────────────────────────────────────────────────

export type CacheNamespace = 'prompt' | 'translation' | 'search' | 'qa' | 'general';

export interface CacheOptions {
  ttl?: number;
  namespace?: CacheNamespace;
}

interface GenericCacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

// Separate caches for each namespace
const namespaceCaches = new Map<CacheNamespace, Map<string, GenericCacheEntry<any>>>();

const DEFAULT_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE_PER_NAMESPACE = 500;

/**
 * Gets cache for specific namespace.
 */
function getNamespaceCache(namespace: CacheNamespace): Map<string, GenericCacheEntry<any>> {
  if (!namespaceCaches.has(namespace)) {
    namespaceCaches.set(namespace, new Map());
  }
  return namespaceCaches.get(namespace)!;
}

/**
 * Makes cache key with namespace prefix.
 */
function makeKey(namespace: CacheNamespace, key: string): string {
  return `${namespace}:${key.toLowerCase().trim()}`;
}

/**
 * Sets value in cache with TTL.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options (ttl, namespace)
 */
export function setCache<T = any>(
  key: string,
  value: T,
  options?: CacheOptions
): void {
  const { ttl = DEFAULT_TTL, namespace = 'general' } = options || {};
  const now = Date.now();
  const cache = getNamespaceCache(namespace);
  const cacheKey = makeKey(namespace, key);

  const entry: GenericCacheEntry<T> = {
    value,
    timestamp: now,
    expiresAt: now + ttl,
    hits: 0,
  };

  cache.set(cacheKey, entry);

  // LRU eviction if cache is too large
  if (cache.size > MAX_CACHE_SIZE_PER_NAMESPACE) {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [k, e] of cache.entries()) {
      if (e.timestamp < oldestTime) {
        oldestTime = e.timestamp;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  // Persist to localStorage if in browser
  if (typeof window !== 'undefined' && namespace !== 'general') {
    try {
      const storageKey = `cache:${cacheKey}`;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  logInfo(`Cache set: ${cacheKey.substring(0, 60)}...`, {
    component: 'CacheLayer',
    tags: { namespace, ttl: String(ttl) },
  });
}

/**
 * Gets value from cache.
 *
 * @param key - Cache key
 * @param options - Cache options (namespace)
 * @returns Cached value or null if not found/expired
 */
export function getCache<T = any>(
  key: string,
  options?: CacheOptions
): T | null {
  const { namespace = 'general' } = options || {};
  const cache = getNamespaceCache(namespace);
  const cacheKey = makeKey(namespace, key);
  const now = Date.now();

  // Check memory cache first
  const entry = cache.get(cacheKey);

  if (entry) {
    if (entry.expiresAt > now) {
      entry.hits++;
      logInfo(`Cache hit (memory): ${cacheKey.substring(0, 60)}... (hits: ${entry.hits})`, {
        component: 'CacheLayer',
        tags: { namespace, source: 'memory' },
      });
      return entry.value as T;
    } else {
      // Expired - remove it
      cache.delete(cacheKey);
    }
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined' && namespace !== 'general') {
    try {
      const storageKey = `cache:${cacheKey}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed: GenericCacheEntry<T> = JSON.parse(stored);

        if (parsed.expiresAt > now) {
          // Restore to memory cache
          cache.set(cacheKey, parsed);

          logInfo(`Cache hit (localStorage): ${cacheKey.substring(0, 60)}...`, {
            component: 'CacheLayer',
            tags: { namespace, source: 'localStorage' },
          });

          return parsed.value;
        } else {
          // Expired - remove from localStorage
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  return null;
}

/**
 * Clears cache for specific namespace.
 */
export function clearCache(namespace?: CacheNamespace): void {
  if (namespace) {
    const cache = getNamespaceCache(namespace);
    cache.clear();

    // Clear from localStorage too
    if (typeof window !== 'undefined') {
      const prefix = `cache:${namespace}:`;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    logInfo(`Cache cleared for namespace: ${namespace}`, {
      component: 'CacheLayer',
      tags: { namespace },
    });
  } else {
    // Clear all namespaces
    namespaceCaches.clear();

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    logInfo('All caches cleared', {
      component: 'CacheLayer',
    });
  }
}

/**
 * Cleans up expired entries from all caches.
 */
export function cleanExpiredCache(): number {
  const now = Date.now();
  let totalCleaned = 0;

  for (const [namespace, cache] of namespaceCaches.entries()) {
    const expiredKeys: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => cache.delete(key));
    totalCleaned += expiredKeys.length;

    if (expiredKeys.length > 0) {
      logInfo(`Cleaned ${expiredKeys.length} expired entries from ${namespace}`, {
        component: 'CacheLayer',
        tags: { namespace },
      });
    }
  }

  return totalCleaned;
}

/**
 * Gets cache statistics for all namespaces.
 */
export function getAllCacheStats(): Record<CacheNamespace, {
  size: number;
  totalHits: number;
  averageHits: number;
  oldestEntry: number;
}> {
  const stats: any = {};

  for (const namespace of ['prompt', 'translation', 'search', 'qa', 'general'] as CacheNamespace[]) {
    const cache = getNamespaceCache(namespace);
    let totalHits = 0;
    let oldestTime = Date.now();

    for (const entry of cache.values()) {
      totalHits += entry.hits;
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
      }
    }

    stats[namespace] = {
      size: cache.size,
      totalHits,
      averageHits: cache.size > 0 ? totalHits / cache.size : 0,
      oldestEntry: cache.size > 0 ? Date.now() - oldestTime : 0,
    };
  }

  return stats;
}

/**
 * Exports all cache data for backup/persistence.
 */
export function exportAllCache(): string {
  const allData: Record<string, any[]> = {};

  for (const [namespace, cache] of namespaceCaches.entries()) {
    const entries = Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      hits: entry.hits,
    }));

    allData[namespace] = entries;
  }

  return JSON.stringify(allData);
}

/**
 * Imports cache data from backup.
 */
export function importAllCache(data: string): void {
  try {
    const allData: Record<string, any[]> = JSON.parse(data);
    const now = Date.now();
    let totalImported = 0;

    for (const [namespace, entries] of Object.entries(allData)) {
      const cache = getNamespaceCache(namespace as CacheNamespace);

      for (const entry of entries) {
        // Only import non-expired entries
        if (entry.expiresAt > now) {
          cache.set(entry.key, {
            value: entry.value,
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
            hits: entry.hits || 0,
          });
          totalImported++;
        }
      }
    }

    logInfo(`Imported ${totalImported} cache entries`, {
      component: 'CacheLayer',
    });
  } catch (error) {
    logInfo('Failed to import cache data', {
      component: 'CacheLayer',
    });
  }
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanExpiredCache();
  }, 5 * 60 * 1000);
}

