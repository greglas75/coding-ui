// ═══════════════════════════════════════════════════════════════
// 🤖 LLM Client - Multi-model orchestrator
// Supports GPT-5, Claude-3.5, Gemini-2.5 with intelligent routing
// ═══════════════════════════════════════════════════════════════

import { logError, logInfo, logWarn } from '../utils/logger';
import { cacheResult, checkWhitelist, getCachedResult } from './cacheLayer';
import { getProvider, selectFallbackModel, selectModel, type Priority, type Provider, type TaskType } from './modelRouter';
import { detectLanguage, translateIfNeeded } from './translationHelper';
import { buildWebContextSection } from './webContextProvider';

// ───────────────────────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────────────────────

export interface ProjectSettings {
  useWebContext?: boolean;
  useAdaptiveSearch?: boolean;
  useAutoTranslate?: boolean;
  useEvaluator?: boolean;
  preferredProvider?: Provider;
  maxCost?: number;
  maxLatency?: number;
}

export interface LLMGenerateParams {
  input: string;
  task: TaskType;
  projectSettings?: ProjectSettings;
  priority?: Priority;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMGenerateResult {
  text: string;
  model: string;
  provider: Provider;
  translation?: string;
  contextUsed?: boolean;
  evaluation?: {
    score: number;
    comments?: string;
  };
  fromWhitelist?: boolean;
  fromCache?: boolean;
  latency?: number;
  cost?: number;
}

// ───────────────────────────────────────────────────────────────
// Main Generate Function
// ───────────────────────────────────────────────────────────────

/**
 * Generates LLM response with intelligent routing and optimization.
 *
 * Process:
 * 1. Check whitelist & cache
 * 2. Detect language & translate if needed
 * 3. Fetch web context (if enabled)
 * 4. Select optimal model
 * 5. Generate response
 * 6. Optional evaluation
 * 7. Cache result
 *
 * @param params - Generation parameters
 * @returns LLM response with metadata
 */
export async function generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
  const startTime = Date.now();
  const {
    input,
    task,
    projectSettings = {},
    priority = 'balanced',
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
  } = params;

  const {
    useWebContext = true,
    useAdaptiveSearch = true,
    useAutoTranslate = true,
    useEvaluator = false,
  } = projectSettings;

  logInfo(`LLM Generate started: task="${task}", priority="${priority}"`, {
    component: 'LLMClient',
    extra: { inputLength: input.length, task, priority },
  });

  // ═════════════════════════════════════════════════════════════
  // Step 1: Check Whitelist
  // ═════════════════════════════════════════════════════════════

  const whitelisted = checkWhitelist(input);
  if (whitelisted) {
    logInfo('Whitelist match found, returning immediately', {
      component: 'LLMClient',
      tags: { source: 'whitelist' },
    });

    return {
      ...whitelisted,
      fromWhitelist: true,
      latency: Date.now() - startTime,
      cost: 0,
    };
  }

  // ═════════════════════════════════════════════════════════════
  // Step 2: Check Cache
  // ═════════════════════════════════════════════════════════════

  const cached = getCachedResult(input);
  if (cached) {
    logInfo('Cache hit, returning cached result', {
      component: 'LLMClient',
      tags: { source: 'cache' },
    });

    return {
      ...cached,
      fromCache: true,
      latency: Date.now() - startTime,
    };
  }

  // ═════════════════════════════════════════════════════════════
  // Step 3: Language Detection & Translation
  // ═════════════════════════════════════════════════════════════

  const detectedLang = detectLanguage(input);
  let processedInput = input;
  let translation: string | undefined;

  if (useAutoTranslate && detectedLang !== 'en') {
    logInfo(`Non-English detected (${detectedLang}), translating...`, {
      component: 'LLMClient',
      tags: { language: detectedLang },
    });

    translation = await translateIfNeeded(input, 'en');
    processedInput = `Original (${detectedLang}): ${input}\n\nEnglish translation: ${translation}`;
  }

  // ═════════════════════════════════════════════════════════════
  // Step 4: Web Context (if enabled)
  // ═════════════════════════════════════════════════════════════

  let contextUsed = false;
  let webContext = '';

  if (useWebContext) {
    // Adaptive search: only fetch context if input contains proper nouns
    const shouldFetchContext = useAdaptiveSearch
      ? /[A-Z][a-z]+/.test(processedInput) // Contains capitalized words
      : true;

    if (shouldFetchContext) {
      logInfo('Fetching web context...', {
        component: 'LLMClient',
        tags: { adaptive: useAdaptiveSearch.toString() },
      });

      webContext = await buildWebContextSection(processedInput, {
        enabled: true,
        numResults: 3,
      });

      contextUsed = webContext.length > 0;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // Step 5: Model Selection
  // ═════════════════════════════════════════════════════════════

  const modelId = selectModel(task, priority);
  const provider = getProvider(modelId);

  logInfo(`Selected model: ${modelId} (${provider})`, {
    component: 'LLMClient',
    tags: { model: modelId, provider },
  });

  // ═════════════════════════════════════════════════════════════
  // Step 6: Build Final Prompt
  // ═════════════════════════════════════════════════════════════

  const finalPrompt = buildFinalPrompt({
    systemPrompt,
    webContext,
    input: processedInput,
    task,
  });

  // ═════════════════════════════════════════════════════════════
  // Step 7: Generate Response
  // ═════════════════════════════════════════════════════════════

  let response: string;
  let actualModel = modelId;
  let actualProvider = provider;

  try {
    response = await callLLM(provider, modelId, finalPrompt, {
      temperature,
      maxTokens,
    });
  } catch (error) {
    logWarn(`Primary model ${modelId} failed, trying fallback...`, {
      component: 'LLMClient',
    });

    // Try fallback model
    const fallbackModel = selectFallbackModel(modelId, task);
    const fallbackProvider = getProvider(fallbackModel);

    actualModel = fallbackModel;
    actualProvider = fallbackProvider;

    response = await callLLM(fallbackProvider, fallbackModel, finalPrompt, {
      temperature,
      maxTokens,
    });
  }

  // ═════════════════════════════════════════════════════════════
  // Step 8: Optional Evaluation
  // ═════════════════════════════════════════════════════════════

  let evaluation: { score: number; comments?: string } | undefined;

  if (useEvaluator && response && !response.includes('[Error]')) {
    logInfo('Running evaluation pass...', {
      component: 'LLMClient',
    });

    const evalModel = selectModel('evaluation', 'fast');
    const evalPrompt = `Rate the following response on a scale of 0.0 to 1.0 for clarity, correctness, and relevance. Return only the score as a number.

Response to evaluate:
${response}

Score:`;

    try {
      const evalResult = await callLLM(getProvider(evalModel), evalModel, evalPrompt, {
        temperature: 0.3,
        maxTokens: 10,
      });

      const scoreMatch = evalResult.match(/[0-9]+\.[0-9]+|[0-9]+/);
      const score = scoreMatch ? parseFloat(scoreMatch[0]) : 1.0;

      evaluation = {
        score: Math.min(1.0, Math.max(0.0, score)),
        comments: evalResult,
      };

      logInfo(`Evaluation score: ${evaluation.score}`, {
        component: 'LLMClient',
        extra: { score: evaluation.score },
      });
    } catch (error) {
      logWarn('Evaluation failed, skipping', {
        component: 'LLMClient',
      });
    }
  }

  // ═════════════════════════════════════════════════════════════
  // Step 9: Build Result & Cache
  // ═════════════════════════════════════════════════════════════

  const latency = Date.now() - startTime;

  const result: LLMGenerateResult = {
    text: response,
    model: actualModel,
    provider: actualProvider,
    translation,
    contextUsed,
    evaluation,
    latency,
    cost: estimateCost(actualModel, processedInput.length, response.length),
  };

  // Cache successful results
  if (response && !response.includes('[Error]')) {
    cacheResult(input, result);
  }

  logInfo(`LLM Generate complete: ${latency}ms`, {
    component: 'LLMClient',
    extra: { latency, model: actualModel, contextUsed },
  });

  return result;
}

// ───────────────────────────────────────────────────────────────
// LLM API Calls
// ───────────────────────────────────────────────────────────────

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Calls LLM API for given provider.
 */
async function callLLM(
  provider: Provider,
  model: string,
  prompt: string,
  options: CallOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 1024, timeout = 30000 } = options;

  logInfo(`Calling ${provider} API with model ${model}`, {
    component: 'LLMClient',
    tags: { provider, model },
  });

  try {
    let response: string;

    switch (provider) {
      case 'openai':
        response = await callOpenAI(model, prompt, temperature, maxTokens, timeout);
        break;
      case 'anthropic':
        response = await callAnthropic(model, prompt, temperature, maxTokens, timeout);
        break;
      case 'google':
        response = await callGoogle(model, prompt, temperature, maxTokens, timeout);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return response;
  } catch (error) {
    logError(`${provider} API call failed`, {
      component: 'LLMClient',
      tags: { provider, model },
    }, error instanceof Error ? error : new Error(String(error)));

    throw error;
  }
}

/**
 * Calls OpenAI API.
 */
async function callOpenAI(
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Route through backend to protect API keys
    const response = await fetch('/api/gpt-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_completion_tokens: maxTokens,
        top_p: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content
      || data?.choices?.[0]?.message?.content?.text
      || (typeof data === 'string' ? data : undefined);
    return content || '[Error: No response]';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Calls Anthropic API.
 */
async function callAnthropic(
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<string> {
  const apiKey = localStorage.getItem('anthropic_api_key') || import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add it in Settings.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.content?.[0]?.text || '[Error: No response]';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Calls Google Gemini API.
 */
async function callGoogle(
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<string> {
  const apiKey = localStorage.getItem('google_gemini_api_key') || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Google Gemini API key not configured. Please add it in Settings.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '[Error: No response]';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────

/**
 * Builds final prompt with context and system instructions.
 */
function buildFinalPrompt(params: {
  systemPrompt?: string;
  webContext: string;
  input: string;
  task: TaskType;
}): string {
  const { systemPrompt, webContext, input, task } = params;

  const parts: string[] = [];

  // System prompt
  if (systemPrompt) {
    parts.push(systemPrompt);
    parts.push('');
  }

  // Web context
  if (webContext) {
    parts.push(webContext);
    parts.push('');
  }

  // Task-specific instructions
  const taskInstructions = getTaskInstructions(task);
  if (taskInstructions) {
    parts.push(taskInstructions);
    parts.push('');
  }

  // User input
  parts.push(input);

  return parts.join('\n');
}

/**
 * Gets task-specific instructions.
 */
function getTaskInstructions(task: TaskType): string {
  switch (task) {
    case 'coding':
      return 'Categorize the following text into the most appropriate code(s). Be precise and concise.';
    case 'translation':
      return 'Translate the following text accurately while preserving the original meaning and tone.';
    case 'context_build':
      return 'Analyze the context and provide relevant information to help understand the text.';
    case 'qa_scoring':
      return 'Evaluate the quality of the response on accuracy, clarity, and relevance. Provide a score and brief comments.';
    case 'evaluation':
      return 'Rate this response on a scale of 0.0 to 1.0. Return only the numeric score.';
    case 'entity_detection':
      return 'Identify and extract all named entities (brands, products, places, organizations) from the text.';
    default:
      return '';
  }
}

/**
 * Estimates cost for generation.
 */
function estimateCost(model: string, inputLength: number, outputLength: number): number {
  // Rough estimate: 1 token ≈ 4 characters
  const inputTokens = Math.ceil(inputLength / 4);
  const outputTokens = Math.ceil(outputLength / 4);

  // Cost per 1M tokens (October 2025)
  const costs: Record<string, number> = {
    'gpt-5': 15.0,
    'gpt-4o': 5.0,
    'gpt-4o-mini': 0.15,
    'claude-sonnet-4.5-20250929': 3.0,
    'claude-opus-4-20250522': 15.0,
    'gemini-2.0-pro-experimental': 2.5,
    'gemini-2.0-flash': 0.075,
  };

  const costPer1M = costs[model] || 5.0;
  const totalTokens = inputTokens + outputTokens;

  return (totalTokens / 1_000_000) * costPer1M;
}

/**
 * Batch generates multiple inputs.
 */
export async function generateBatch(
  inputs: string[],
  params: Omit<LLMGenerateParams, 'input'>
): Promise<LLMGenerateResult[]> {
  const results: LLMGenerateResult[] = [];

  for (const input of inputs) {
    const result = await generate({ ...params, input });
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

