/**
 * Provider Detection & API Key Management
 */

import {
  getAnthropicAPIKey,
  getGoogleGeminiAPIKey,
  getOpenAIAPIKey,
} from '../../utils/apiKeys';

/**
 * Detect AI provider from model name
 */
export function detectProvider(model: string): 'openai' | 'anthropic' | 'google' {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return 'openai';
}

/**
 * Get API key for provider
 */
export function getProviderAPIKey(provider: 'openai' | 'anthropic' | 'google'): string {
  let apiKey: string | null = null;

  if (provider === 'anthropic') {
    apiKey = getAnthropicAPIKey();
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Please add it in Settings page.');
    }
  } else if (provider === 'google') {
    apiKey = getGoogleGeminiAPIKey();
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured. Please add it in Settings page.');
    }
  } else {
    apiKey = getOpenAIAPIKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in Settings page.');
    }
  }

  return apiKey;
}

