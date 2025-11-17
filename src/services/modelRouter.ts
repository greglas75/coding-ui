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
  // OpenAI
  'gpt-5.0': {
    id: 'gpt-5.0-2025-09-01',
    provider: 'openai',
    costPer1M: 15,
    avgLatency: 1200,
    quality: 10,
  },
  'gpt-4.5-turbo': {
    id: 'gpt-4.5-turbo-2025-04-15',
    provider: 'openai',
    costPer1M: 8,
    avgLatency: 650,
    quality: 9.2,
  },
  'gpt-4o': {
    id: 'gpt-4o-2024-08-01',
    provider: 'openai',
    costPer1M: 5,
    avgLatency: 600,
    quality: 9,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini-2024-08-01',
    provider: 'openai',
    costPer1M: 0.15,
    avgLatency: 350,
    quality: 8,
  },

  // Anthropic
  'claude-3.5-opus': {
    id: 'claude-3.5-opus-2024-07-18',
    provider: 'anthropic',
    costPer1M: 15,
    avgLatency: 1100,
    quality: 9.6,
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet-2024-07-18',
    provider: 'anthropic',
    costPer1M: 3,
    avgLatency: 700,
    quality: 9.2,
  },
  'claude-3.5-haiku': {
    id: 'claude-3.5-haiku-2024-07-18',
    provider: 'anthropic',
    costPer1M: 0.25,
    avgLatency: 320,
    quality: 8,
  },

  // Google Gemini
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro-2025-05-10',
    provider: 'google',
    costPer1M: 2,
    avgLatency: 850,
    quality: 9.4,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash-2025-05-10',
    provider: 'google',
    costPer1M: 0.06,
    avgLatency: 280,
    quality: 8.6,
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
      return priority === 'fast' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

    case 'translation':
      return 'gemini-2.5-pro';

    case 'context_build':
      return priority === 'accurate' ? 'claude-3.5-opus' : 'claude-3.5-sonnet';

    case 'coding':
      switch (priority) {
        case 'fast':
          return 'claude-3.5-haiku';
        case 'balanced':
          return 'claude-3.5-sonnet';
        case 'accurate':
          return 'gpt-5.0';
      }
      break;

    case 'qa_scoring':
      return priority === 'fast' ? 'claude-3.5-sonnet' : 'claude-3.5-opus';

    case 'evaluation':
      return 'gpt-4.5-turbo';

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
      alternatives.push('claude-3.5-sonnet', 'gemini-2.5-pro');
      break;
    case 'anthropic':
      alternatives.push('gpt-4o', 'gemini-2.5-pro');
      break;
    case 'google':
      alternatives.push('claude-3.5-sonnet', 'gpt-4o');
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

