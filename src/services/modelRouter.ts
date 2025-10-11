// ═══════════════════════════════════════════════════════════════
// 🤖 AI Model Router - Intelligent model selection
// ═══════════════════════════════════════════════════════════════

export type TaskType =
  | 'coding'
  | 'translation'
  | 'context_build'
  | 'qa_scoring'
  | 'evaluation'
  | 'entity_detection'
  | 'general';

export type Priority = 'fast' | 'balanced' | 'accurate';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface ModelInfo {
  id: string;
  provider: Provider;
  costPer1M: number; // USD per 1M tokens
  avgLatency: number; // ms
  quality: number; // 0-10
}

// ───────────────────────────────────────────────────────────────
// Model Registry
// ───────────────────────────────────────────────────────────────

const MODELS: Record<string, ModelInfo> = {
  // OpenAI Models (October 2025)
  'gpt-5': {
    id: 'gpt-5',
    provider: 'openai',
    costPer1M: 15.0,
    avgLatency: 1200,
    quality: 10,
  },
  'o1-preview': {
    id: 'o1-preview',
    provider: 'openai',
    costPer1M: 15.0,
    avgLatency: 2000,
    quality: 9.8,
  },
  'o1-mini': {
    id: 'o1-mini',
    provider: 'openai',
    costPer1M: 3.0,
    avgLatency: 1000,
    quality: 9,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    costPer1M: 5.0,
    avgLatency: 600,
    quality: 9,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    costPer1M: 0.15,
    avgLatency: 400,
    quality: 8,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    provider: 'openai',
    costPer1M: 10.0,
    avgLatency: 800,
    quality: 8.8,
  },

  // Anthropic Models (October 2025)
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5-20250929',
    provider: 'anthropic',
    costPer1M: 3.0,
    avgLatency: 700,
    quality: 10,
  },
  'claude-opus-4': {
    id: 'claude-opus-4-20250522',
    provider: 'anthropic',
    costPer1M: 15.0,
    avgLatency: 1100,
    quality: 9.5,
  },
  'claude-3-opus': {
    id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    costPer1M: 15.0,
    avgLatency: 1200,
    quality: 9.2,
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet-20240229',
    provider: 'anthropic',
    costPer1M: 3.0,
    avgLatency: 750,
    quality: 8.8,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    costPer1M: 0.25,
    avgLatency: 350,
    quality: 7.5,
  },

  // Google Gemini Models (October 2025)
  'gemini-2.0-pro-exp': {
    id: 'gemini-2.0-pro-experimental',
    provider: 'google',
    costPer1M: 2.5,
    avgLatency: 900,
    quality: 9.5,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'google',
    costPer1M: 0.075,
    avgLatency: 300,
    quality: 8.5,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    costPer1M: 1.25,
    avgLatency: 800,
    quality: 9,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    provider: 'google',
    costPer1M: 0.075,
    avgLatency: 250,
    quality: 8,
  },
};

// ───────────────────────────────────────────────────────────────
// Model Selection Logic
// ───────────────────────────────────────────────────────────────

/**
 * Selects the optimal model based on task type and priority.
 *
 * @param task - Type of task to perform
 * @param priority - Speed/cost/quality trade-off
 * @returns Model ID to use
 */
export function selectModel(task: TaskType, priority: Priority = 'balanced'): string {
  // Task-specific routing
  switch (task) {
    case 'entity_detection':
      return priority === 'fast' ? 'gemini-2.0-flash' : 'gemini-2.0-pro-exp';

    case 'translation':
      // Gemini excels at translation
      return 'gemini-2.0-pro-exp';

    case 'context_build':
      // Claude is great at understanding context
      return priority === 'accurate' ? 'claude-opus-4' : 'claude-sonnet-4.5';

    case 'coding':
      // Best models for coding/categorization - Claude Sonnet 4.5 is best for coding
      switch (priority) {
        case 'fast':
          return 'gpt-4o-mini';
        case 'balanced':
          return 'claude-sonnet-4.5';
        case 'accurate':
          return 'gpt-5';
      }
      break;

    case 'qa_scoring':
      // Critical QA needs high accuracy
      return priority === 'fast' ? 'claude-sonnet-4.5' : 'claude-opus-4';

    case 'evaluation':
      // Fast evaluation with GPT-4o
      return 'gpt-4o';

    case 'general':
    default:
      // General purpose routing
      switch (priority) {
        case 'fast':
          return 'gemini-2.0-flash';
        case 'balanced':
          return 'gpt-4o';
        case 'accurate':
          return 'gpt-5';
      }
  }

  // Fallback
  return 'gpt-4o';
}

/**
 * Gets model information.
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODELS[modelId];
}

/**
 * Selects fallback model if primary fails.
 */
export function selectFallbackModel(primaryModel: string, _task: TaskType): string {
  const primary = MODELS[primaryModel];
  if (!primary) return 'gpt-4o'; // Default fallback

  // Find alternative from different provider
  const alternatives: string[] = [];

  switch (primary.provider) {
    case 'openai':
      alternatives.push('claude-sonnet-4.5', 'gemini-2.0-pro-exp');
      break;
    case 'anthropic':
      alternatives.push('gpt-4o', 'gemini-2.0-pro-exp');
      break;
    case 'google':
      alternatives.push('claude-sonnet-4.5', 'gpt-4o');
      break;
  }

  // Return first available alternative
  return alternatives[0] || 'gpt-4o';
}

/**
 * Estimates cost for a request.
 */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = MODELS[modelId];
  if (!model) return 0;

  const totalTokens = inputTokens + outputTokens;
  return (totalTokens / 1_000_000) * model.costPer1M;
}

/**
 * Gets all available models for a task.
 */
export function getModelsForTask(task: TaskType): ModelInfo[] {
  const priorities: Priority[] = ['fast', 'balanced', 'accurate'];
  const modelIds = priorities.map(p => selectModel(task, p));
  const uniqueIds = Array.from(new Set(modelIds));

  return uniqueIds
    .map(id => MODELS[id])
    .filter(Boolean)
    .sort((a, b) => b.quality - a.quality);
}

/**
 * Selects model based on custom criteria.
 */
export function selectCustomModel(criteria: {
  maxCost?: number;
  maxLatency?: number;
  minQuality?: number;
  preferredProvider?: Provider;
}): string {
  const { maxCost = Infinity, maxLatency = Infinity, minQuality = 0, preferredProvider } = criteria;

  const candidates = Object.entries(MODELS)
    .filter(([_, model]) => {
      if (model.costPer1M > maxCost) return false;
      if (model.avgLatency > maxLatency) return false;
      if (model.quality < minQuality) return false;
      if (preferredProvider && model.provider !== preferredProvider) return false;
      return true;
    })
    .sort(([_, a], [__, b]) => {
      // Optimize for quality, then cost, then latency
      if (a.quality !== b.quality) return b.quality - a.quality;
      if (a.costPer1M !== b.costPer1M) return a.costPer1M - b.costPer1M;
      return a.avgLatency - b.avgLatency;
    });

  return candidates[0]?.[0] || 'gpt-4o';
}

/**
 * Gets provider from model ID.
 */
export function getProvider(modelId: string): Provider {
  const model = MODELS[modelId];
  return model?.provider || 'openai';
}

/**
 * Checks if model supports streaming.
 */
export function supportsStreaming(modelId: string): boolean {
  const model = MODELS[modelId];
  if (!model) return false;

  // All major providers support streaming
  return true;
}

/**
 * Gets recommended batch size for model.
 */
export function getRecommendedBatchSize(modelId: string): number {
  const model = MODELS[modelId];
  if (!model) return 10;

  // Faster models can handle larger batches
  if (model.avgLatency < 500) return 20;
  if (model.avgLatency < 1000) return 10;
  return 5;
}

