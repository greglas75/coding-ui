// ═══════════════════════════════════════════════════════════════
// 🧪 Tests: Cache Layer
// ═══════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToWhitelist,
  cacheResult,
  checkWhitelist,
  cleanExpiredCache,
  clearCache,
  clearPromptCache,
  exportAllCache,
  exportCache,
  getAllCacheStats,
  getCache,
  getCachedResult,
  getCacheStats,
  getWhitelist,
  importAllCache,
  importCache,
  setCache,
  setWhitelist,
  warmUpCache,
  type CacheNamespace,
} from '../services/cacheLayer';
import type { LLMGenerateResult } from '../services/llmClient';

describe('Whitelist', () => {
  beforeEach(() => {
    setWhitelist([]); // Reset custom whitelist
  });

  it('should match exact whitelist item', () => {
    const result = checkWhitelist('GCash');

    expect(result).not.toBeNull();
    expect(result?.text).toBe('GCash');
    expect(result?.fromWhitelist).toBe(true);
  });

  it('should match whitelist item in sentence', () => {
    const result = checkWhitelist('I use GCash for payments');

    expect(result).not.toBeNull();
    expect(result?.text).toBe('GCash');
  });

  it('should be case-insensitive', () => {
    const result = checkWhitelist('gcash');

    expect(result).not.toBeNull();
    expect(result?.text).toBe('GCash');
  });

  it('should return null for non-whitelisted items', () => {
    const result = checkWhitelist('UnknownBrand123');

    expect(result).toBeNull();
  });

  it('should add custom whitelist items', () => {
    addToWhitelist('CustomBrand');

    const result = checkWhitelist('CustomBrand');

    expect(result).not.toBeNull();
    expect(result?.text).toBe('CustomBrand');
  });

  it('should set entire whitelist', () => {
    setWhitelist(['Brand1', 'Brand2']);

    const result1 = checkWhitelist('Brand1');
    const result2 = checkWhitelist('Brand2');

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
  });

  it('should get all whitelist items', () => {
    const items = getWhitelist();

    expect(items.length).toBeGreaterThan(0);
    expect(items).toContain('GCash');
    expect(items).toContain('Colgate');
  });
});

describe('Prompt Cache', () => {
  beforeEach(() => {
    clearPromptCache();
  });

  it('should cache and retrieve result', () => {
    const mockResult: LLMGenerateResult = {
      text: 'Test response',
      model: 'gpt-4o',
      provider: 'openai',
    };

    cacheResult('test input', mockResult);
    const cached = getCachedResult('test input');

    expect(cached).not.toBeNull();
    expect(cached?.text).toBe('Test response');
  });

  it('should not cache whitelist results', () => {
    const mockResult: LLMGenerateResult = {
      text: 'GCash',
      model: 'whitelist',
      provider: 'openai',
      fromWhitelist: true,
    };

    cacheResult('test', mockResult);
    const cached = getCachedResult('test');

    expect(cached).toBeNull(); // Should not be cached
  });

  it('should not cache errors', () => {
    const mockResult: LLMGenerateResult = {
      text: '[Error: Failed]',
      model: 'gpt-4o',
      provider: 'openai',
    };

    cacheResult('test', mockResult);
    const cached = getCachedResult('test');

    expect(cached).toBeNull();
  });

  it('should increment hit counter', () => {
    const mockResult: LLMGenerateResult = {
      text: 'Test',
      model: 'gpt-4o',
      provider: 'openai',
    };

    cacheResult('test', mockResult);

    // First hit
    getCachedResult('test');
    // Second hit
    getCachedResult('test');

    const stats = getCacheStats();
    expect(stats.totalHits).toBe(2);
  });

  it('should return null for non-cached items', () => {
    const cached = getCachedResult('non-existent');

    expect(cached).toBeNull();
  });

  it('should export cache', () => {
    const mockResult: LLMGenerateResult = {
      text: 'Test',
      model: 'gpt-4o',
      provider: 'openai',
    };

    cacheResult('test1', mockResult);
    cacheResult('test2', mockResult);

    const exported = exportCache();
    const parsed = JSON.parse(exported);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].input).toBe('test1');
  });

  it('should import cache', () => {
    const mockData = JSON.stringify([
      {
        input: 'test',
        result: { text: 'Imported', model: 'gpt-4o', provider: 'openai' },
        timestamp: Date.now(),
        hits: 5,
      },
    ]);

    clearPromptCache();
    importCache(mockData);

    const cached = getCachedResult('test');

    expect(cached).not.toBeNull();
    expect(cached?.text).toBe('Imported');
  });

  it('should get cache statistics', () => {
    const mockResult: LLMGenerateResult = {
      text: 'Test',
      model: 'gpt-4o',
      provider: 'openai',
    };

    cacheResult('test1', mockResult);
    cacheResult('test2', mockResult);

    getCachedResult('test1'); // Hit
    getCachedResult('test1'); // Hit again

    const stats = getCacheStats();

    expect(stats.size).toBe(2);
    expect(stats.totalHits).toBe(2);
    expect(stats.averageHits).toBe(1);
  });

  it('should warm up cache', () => {
    const queries = [
      {
        input: 'query1',
        result: { text: 'result1', model: 'gpt-4o', provider: 'openai' } as LLMGenerateResult,
      },
      {
        input: 'query2',
        result: { text: 'result2', model: 'gpt-4o', provider: 'openai' } as LLMGenerateResult,
      },
    ];

    warmUpCache(queries);

    const cached1 = getCachedResult('query1');
    const cached2 = getCachedResult('query2');

    expect(cached1?.text).toBe('result1');
    expect(cached2?.text).toBe('result2');
  });
});

describe('Multi-Namespace Cache', () => {
  beforeEach(() => {
    clearCache(); // Clear all namespaces
  });

  it('should store and retrieve from specific namespace', () => {
    setCache('key1', 'value1', { namespace: 'translation' });
    setCache('key2', 'value2', { namespace: 'search' });

    const val1 = getCache('key1', { namespace: 'translation' });
    const val2 = getCache('key2', { namespace: 'search' });

    expect(val1).toBe('value1');
    expect(val2).toBe('value2');
  });

  it('should isolate namespaces', () => {
    setCache('same-key', 'translation-value', { namespace: 'translation' });
    setCache('same-key', 'search-value', { namespace: 'search' });

    const translationVal = getCache('same-key', { namespace: 'translation' });
    const searchVal = getCache('same-key', { namespace: 'search' });

    expect(translationVal).toBe('translation-value');
    expect(searchVal).toBe('search-value');
  });

  it('should respect TTL', async () => {
    setCache('temp', 'value', { ttl: 50, namespace: 'general' });

    const val1 = getCache('temp', { namespace: 'general' });
    expect(val1).toBe('value');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 60));

    const val2 = getCache('temp', { namespace: 'general' });
    expect(val2).toBeNull();
  });

  it('should clean expired entries', async () => {
    setCache('expired1', 'value1', { ttl: 10, namespace: 'general' });
    setCache('expired2', 'value2', { ttl: 10, namespace: 'general' });
    setCache('valid', 'value3', { ttl: 10000, namespace: 'general' });

    await new Promise(resolve => setTimeout(resolve, 20));

    const cleaned = cleanExpiredCache();

    expect(cleaned).toBeGreaterThanOrEqual(2);
  });

  it('should clear specific namespace', () => {
    setCache('key1', 'val1', { namespace: 'translation' });
    setCache('key2', 'val2', { namespace: 'search' });

    clearCache('translation');

    expect(getCache('key1', { namespace: 'translation' })).toBeNull();
    expect(getCache('key2', { namespace: 'search' })).toBe('val2');
  });

  it('should clear all namespaces', () => {
    setCache('key1', 'val1', { namespace: 'translation' });
    setCache('key2', 'val2', { namespace: 'search' });

    clearCache();

    expect(getCache('key1', { namespace: 'translation' })).toBeNull();
    expect(getCache('key2', { namespace: 'search' })).toBeNull();
  });

  it('should get stats for all namespaces', () => {
    setCache('key1', 'val1', { namespace: 'translation' });
    setCache('key2', 'val2', { namespace: 'search' });

    getCache('key1', { namespace: 'translation' }); // Hit

    const stats = getAllCacheStats();

    expect(stats.translation.size).toBe(1);
    expect(stats.search.size).toBe(1);
    expect(stats.translation.totalHits).toBe(1);
  });

  it('should export and import all cache data', () => {
    setCache('key1', 'val1', { namespace: 'translation' });
    setCache('key2', 'val2', { namespace: 'search' });

    const exported = exportAllCache();
    clearCache();

    importAllCache(exported);

    expect(getCache('key1', { namespace: 'translation' })).toBe('val1');
    expect(getCache('key2', { namespace: 'search' })).toBe('val2');
  });

  it('should handle complex objects', () => {
    const complexObj = {
      text: 'response',
      metadata: { score: 0.95, tags: ['a', 'b'] },
      nested: { deep: { value: 123 } },
    };

    setCache('complex', complexObj, { namespace: 'qa' });
    const retrieved = getCache('complex', { namespace: 'qa' });

    expect(retrieved).toEqual(complexObj);
  });
});

