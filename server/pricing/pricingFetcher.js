/**
 * 💰 Pricing Fetcher
 *
 * Manages fetching and caching of AI model pricing data
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PricingFetcher {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Main method to fetch pricing data
   * Checks cache first, then fetches fresh data if needed
   */
  async fetchPricing() {
    // Check if cache is valid
    if (this.isCacheValid()) {
      console.log('✅ Returning cached pricing data');
      return {
        ...this.cache,
        dataSource: 'cache',
      };
    }

    console.log('🔄 Fetching fresh pricing data...');

    try {
      const [openaiPricing, anthropicPricing, googlePricing] = await Promise.all([
        this.fetchOpenAIPricing(),
        this.fetchAnthropicPricing(),
        this.fetchGooglePricing(),
      ]);

      const pricingData = {
        lastUpdated: new Date().toISOString(),
        dataSource: 'live',
        models: {
          openai: openaiPricing,
          anthropic: anthropicPricing,
          google: googlePricing,
        },
      };

      // Cache the results
      this.cache = pricingData;
      this.cacheTime = Date.now();

      // Save to disk as backup
      await this.saveToDisk(pricingData);

      console.log('✅ Pricing data fetched and cached successfully');
      return pricingData;
    } catch (error) {
      console.error('❌ Error fetching pricing:', error.message);

      // Fallback to disk cache
      return this.loadFromDisk();
    }
  }

  /**
   * Fetch OpenAI pricing
   * Returns array of OpenAI models with pricing info
   */
  async fetchOpenAIPricing() {
    // For now, returns static data (can be enhanced with actual API calls or scraping)
    return [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1200,
        quality: 10,
        contextWindow: 128000,
        available: true,
        releaseDate: '2025-08-01',
        description: 'Latest and most powerful model',
      },
      {
        id: 'o1-preview',
        name: 'o1-preview',
        provider: 'openai',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 2000,
        quality: 9.8,
        contextWindow: 128000,
        available: true,
        description: 'Advanced reasoning model',
      },
      {
        id: 'o1-mini',
        name: 'o1-mini',
        provider: 'openai',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 1000,
        quality: 9,
        contextWindow: 128000,
        available: true,
        description: 'Fast reasoning model',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        costPer1M: 5.0,
        costPer1000Responses: 0.50,
        avgLatency: 600,
        quality: 9,
        contextWindow: 128000,
        available: true,
        description: 'Fast and high quality',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        costPer1M: 0.15,
        costPer1000Responses: 0.015,
        avgLatency: 400,
        quality: 8,
        contextWindow: 128000,
        available: true,
        description: 'Most cost-effective',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        costPer1M: 10.0,
        costPer1000Responses: 1.00,
        avgLatency: 800,
        quality: 8.8,
        contextWindow: 128000,
        available: true,
        description: 'Balanced performance',
      },
    ];
  }

  /**
   * Fetch Anthropic pricing
   */
  async fetchAnthropicPricing() {
    return [
      {
        id: 'claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 700,
        quality: 10,
        contextWindow: 200000,
        available: true,
        releaseDate: '2025-09-29',
        description: 'Best coding model',
      },
      {
        id: 'claude-opus-4',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1100,
        quality: 9.5,
        contextWindow: 200000,
        available: true,
        releaseDate: '2025-05-22',
        description: 'Highest quality',
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1200,
        quality: 9.2,
        contextWindow: 200000,
        available: true,
        description: 'Previous generation flagship',
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 750,
        quality: 8.8,
        contextWindow: 200000,
        available: true,
        description: 'Balanced model',
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        costPer1M: 0.25,
        costPer1000Responses: 0.025,
        avgLatency: 350,
        quality: 7.5,
        contextWindow: 200000,
        available: true,
        description: 'Fastest and cheapest',
      },
    ];
  }

  /**
   * Fetch Google Gemini pricing
   */
  async fetchGooglePricing() {
    return [
      {
        id: 'gemini-2.0-pro-exp',
        name: 'Gemini 2.0 Pro Experimental',
        provider: 'google',
        costPer1M: 2.5,
        costPer1000Responses: 0.25,
        avgLatency: 900,
        quality: 9.5,
        contextWindow: 2000000,
        available: true,
        description: '2M token context',
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        costPer1M: 0.075,
        costPer1000Responses: 0.0075,
        avgLatency: 300,
        quality: 8.5,
        contextWindow: 1000000,
        available: true,
        description: 'Fastest and cheapest',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        costPer1M: 1.25,
        costPer1000Responses: 0.125,
        avgLatency: 800,
        quality: 9,
        contextWindow: 2000000,
        available: true,
        description: 'Stable production model',
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        costPer1M: 0.075,
        costPer1000Responses: 0.0075,
        avgLatency: 250,
        quality: 8,
        contextWindow: 1000000,
        available: true,
        description: 'Fast and cost-effective',
      },
    ];
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    if (!this.cache || !this.cacheTime) {
      return false;
    }

    const age = Date.now() - this.cacheTime;
    return age < this.CACHE_TTL;
  }

  /**
   * Save pricing data to disk for backup
   */
  async saveToDisk(data) {
    try {
      const filePath = join(__dirname, '../../src/data/ai-pricing-cache.json');

      // Create directory if it doesn't exist
      await fs.mkdir(dirname(filePath), { recursive: true });

      // Write data
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      console.log('💾 Pricing data saved to disk');
    } catch (error) {
      console.error('❌ Error saving pricing to disk:', error.message);
    }
  }

  /**
   * Load pricing data from disk (fallback)
   */
  async loadFromDisk() {
    try {
      const filePath = join(__dirname, '../../src/data/ai-pricing-cache.json');
      const data = await fs.readFile(filePath, 'utf-8');

      const parsed = JSON.parse(data);
      parsed.dataSource = 'cache';

      console.log('📂 Loaded pricing from disk cache');
      return parsed;
    } catch (error) {
      console.warn('⚠️ Failed to load from disk, using hardcoded fallback');
      return this.getFallbackData();
    }
  }

  /**
   * Hardcoded fallback data (last resort)
   */
  getFallbackData() {
    return {
      lastUpdated: new Date().toISOString(),
      dataSource: 'fallback',
      models: {
        openai: [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', costPer1M: 0.15, costPer1000Responses: 0.015, avgLatency: 400, quality: 8, contextWindow: 128000, available: true },
        ],
        anthropic: [
          { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', costPer1M: 0.25, costPer1000Responses: 0.025, avgLatency: 350, quality: 7.5, contextWindow: 200000, available: true },
        ],
        google: [
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', costPer1M: 0.075, costPer1000Responses: 0.0075, avgLatency: 300, quality: 8.5, contextWindow: 1000000, available: true },
        ],
      },
    };
  }

  /**
   * Force refresh cache (clear and fetch new)
   */
  async forceRefresh() {
    console.log('🔄 Forcing cache refresh...');
    this.cache = null;
    this.cacheTime = null;
    return this.fetchPricing();
  }
}

// Export singleton instance
const pricingFetcher = new PricingFetcher();
export default pricingFetcher;

