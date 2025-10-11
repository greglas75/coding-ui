// ═══════════════════════════════════════════════════════════════
// 🧪 Tests: Model Router
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it } from 'vitest';
import {
  estimateCost,
  getModelInfo,
  getModelsForTask,
  getProvider,
  getRecommendedBatchSize,
  selectCustomModel,
  selectFallbackModel,
  selectModel,
  supportsStreaming,
} from '../services/modelRouter';

describe('selectModel', () => {
  it('should select fast model for coding task', () => {
    const model = selectModel('coding', 'fast');
    expect(model).toBe('claude-3.5-haiku');
  });

  it('should select balanced model for coding task', () => {
    const model = selectModel('coding', 'balanced');
    expect(model).toBe('claude-3.5-sonnet');
  });

  it('should select accurate model for coding task', () => {
    const model = selectModel('coding', 'accurate');
    expect(model).toBe('gpt-5.0');
  });

  it('should select Gemini for translation', () => {
    const model = selectModel('translation', 'balanced');
    expect(model).toBe('gemini-2.5-pro');
  });

  it('should select Claude for context building', () => {
    const model = selectModel('context_build', 'balanced');
    expect(model).toBe('claude-3.5-sonnet');
  });

  it('should select appropriate model for QA scoring', () => {
    const fastModel = selectModel('qa_scoring', 'fast');
    const accurateModel = selectModel('qa_scoring', 'accurate');

    expect(fastModel).toBe('claude-3.5-sonnet');
    expect(accurateModel).toBe('claude-3.5-opus');
  });

  it('should select GPT-4.5-Turbo for evaluation', () => {
    const model = selectModel('evaluation', 'fast');
    expect(model).toBe('gpt-4.5-turbo');
  });

  it('should select Gemini for entity detection', () => {
    const fastModel = selectModel('entity_detection', 'fast');
    const balancedModel = selectModel('entity_detection', 'balanced');

    expect(fastModel).toBe('gemini-2.5-flash');
    expect(balancedModel).toBe('gemini-2.5-pro');
  });

  it('should default to balanced priority', () => {
    const model = selectModel('coding');
    expect(model).toBe('claude-3.5-sonnet');
  });

  it('should have fallback for unknown tasks', () => {
    const model = selectModel('general', 'balanced');
    expect(model).toBe('gpt-4o');
  });
});

describe('getModelInfo', () => {
  it('should return model information', () => {
    const info = getModelInfo('gpt-5.0');

    expect(info).toBeDefined();
    expect(info?.provider).toBe('openai');
    expect(info?.costPer1M).toBe(15.0);
    expect(info?.quality).toBe(10);
  });

  it('should return undefined for unknown model', () => {
    const info = getModelInfo('unknown-model');
    expect(info).toBeUndefined();
  });
});

describe('selectFallbackModel', () => {
  it('should select different provider for fallback', () => {
    const fallback = selectFallbackModel('gpt-5.0', 'coding');

    // Should not be OpenAI
    expect(fallback).not.toContain('gpt');
    expect(['claude-3.5-sonnet', 'gemini-2.5-pro']).toContain(fallback);
  });

  it('should return gpt-4o for unknown primary model', () => {
    const fallback = selectFallbackModel('unknown', 'coding');
    expect(fallback).toBe('gpt-4o');
  });

  it('should select OpenAI or Gemini when Claude fails', () => {
    const fallback = selectFallbackModel('claude-3.5-sonnet', 'coding');

    expect(['gpt-4o', 'gemini-2.5-pro']).toContain(fallback);
  });
});

describe('estimateCost', () => {
  it('should estimate cost for request', () => {
    const cost = estimateCost('gpt-5.0', 1000, 500);

    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(1); // Should be small for test
  });

  it('should return 0 for unknown model', () => {
    const cost = estimateCost('unknown-model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('should calculate proportional to token count', () => {
    const cost1 = estimateCost('gpt-4o', 1000, 500);
    const cost2 = estimateCost('gpt-4o', 2000, 1000);

    expect(cost2).toBeGreaterThan(cost1);
    expect(cost2).toBeCloseTo(cost1 * 2, 5);
  });
});

describe('getModelsForTask', () => {
  it('should return models for task', () => {
    const models = getModelsForTask('coding');

    expect(models.length).toBeGreaterThan(0);
    expect(models.every(m => m.id && m.provider)).toBe(true);
  });

  it('should sort models by quality', () => {
    const models = getModelsForTask('coding');

    for (let i = 0; i < models.length - 1; i++) {
      expect(models[i].quality).toBeGreaterThanOrEqual(models[i + 1].quality);
    }
  });
});

describe('selectCustomModel', () => {
  it('should select model within cost limit', () => {
    const model = selectCustomModel({ maxCost: 5.0 });

    const info = getModelInfo(model);
    expect(info).toBeDefined();
    expect(info!.costPer1M).toBeLessThanOrEqual(5.0);
  });

  it('should select model within latency limit', () => {
    const model = selectCustomModel({ maxLatency: 500 });

    const info = getModelInfo(model);
    expect(info).toBeDefined();
    expect(info!.avgLatency).toBeLessThanOrEqual(500);
  });

  it('should select model meeting quality requirement', () => {
    const model = selectCustomModel({ minQuality: 9 });

    const info = getModelInfo(model);
    expect(info).toBeDefined();
    expect(info!.quality).toBeGreaterThanOrEqual(9);
  });

  it('should prefer specific provider', () => {
    const model = selectCustomModel({ preferredProvider: 'google' });

    const info = getModelInfo(model);
    expect(info).toBeDefined();
    expect(info!.provider).toBe('google');
  });

  it('should optimize for quality first', () => {
    const model = selectCustomModel({});

    const info = getModelInfo(model);
    expect(info).toBeDefined();
    expect(info!.quality).toBeGreaterThanOrEqual(9);
  });
});

describe('getProvider', () => {
  it('should return correct provider for GPT models', () => {
    expect(getProvider('gpt-5.0')).toBe('openai');
    expect(getProvider('gpt-4o')).toBe('openai');
  });

  it('should return correct provider for Claude models', () => {
    expect(getProvider('claude-3.5-sonnet')).toBe('anthropic');
    expect(getProvider('claude-3.5-opus')).toBe('anthropic');
  });

  it('should return correct provider for Gemini models', () => {
    expect(getProvider('gemini-2.5-pro')).toBe('google');
    expect(getProvider('gemini-2.5-flash')).toBe('google');
  });

  it('should default to openai for unknown models', () => {
    expect(getProvider('unknown-model')).toBe('openai');
  });
});

describe('supportsStreaming', () => {
  it('should return true for all known models', () => {
    expect(supportsStreaming('gpt-5.0')).toBe(true);
    expect(supportsStreaming('claude-3.5-sonnet')).toBe(true);
    expect(supportsStreaming('gemini-2.5-pro')).toBe(true);
  });

  it('should return false for unknown models', () => {
    expect(supportsStreaming('unknown-model')).toBe(false);
  });
});

describe('getRecommendedBatchSize', () => {
  it('should return larger batch for fast models', () => {
    const batchSize = getRecommendedBatchSize('gemini-2.5-flash');
    expect(batchSize).toBe(20);
  });

  it('should return medium batch for balanced models', () => {
    const batchSize = getRecommendedBatchSize('claude-3.5-sonnet');
    expect(batchSize).toBe(10);
  });

  it('should return smaller batch for slow models', () => {
    const batchSize = getRecommendedBatchSize('gpt-5.0');
    expect(batchSize).toBe(5);
  });

  it('should return default for unknown models', () => {
    const batchSize = getRecommendedBatchSize('unknown-model');
    expect(batchSize).toBe(10);
  });
});

