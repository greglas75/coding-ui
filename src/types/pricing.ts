/**
 * 💰 AI Pricing Types
 *
 * Type definitions for AI model pricing and related data structures
 */

export interface ModelPricing {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  costPer1M: number; // USD per 1M tokens
  costPer1000Responses: number; // Estimated cost for 1000 categorizations
  inputCostPer1M?: number; // Some providers have different input/output pricing
  outputCostPer1M?: number;
  avgLatency: number; // milliseconds
  quality: number; // 0-10 scale
  contextWindow: number; // max tokens
  available: boolean;
  deprecated?: boolean;
  releaseDate?: string;
  description?: string;
}

export interface PricingData {
  lastUpdated: string; // ISO 8601
  dataSource: 'cache' | 'live' | 'fallback';
  models: {
    openai: ModelPricing[];
    anthropic: ModelPricing[];
    google: ModelPricing[];
  };
}

export interface PricingResponse extends PricingData {
  cacheExpiry: string;
  nextUpdate: string;
}

