/**
 * API Calls for Different Providers (OpenAI, Claude, Gemini)
 */

import { getAnthropicAPIKey, getGoogleGeminiAPIKey } from '../../utils/apiKeys';
import { simpleLogger } from '../../utils/logger';

/**
 * Map friendly model names to actual Anthropic API model IDs
 * ALL Anthropic models use HYPHENS everywhere (no dots!)
 */
export function getAnthropicModelId(friendlyName: string): string {
  const modelMap: Record<string, string> = {
    // Haiku models
    'claude-haiku-4.5': 'claude-haiku-4-5',
    'claude-haiku-4-5': 'claude-haiku-4-5',
    'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
    'claude-3-haiku': 'claude-3-haiku-20240307',

    // Sonnet models
    'claude-sonnet-4.5': 'claude-sonnet-4-5',
    'claude-sonnet-4-5': 'claude-sonnet-4-5',
    'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-sonnet-4': 'claude-sonnet-4-20241022',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',

    // Opus models
    'claude-opus-4.1': 'claude-opus-4-1',
    'claude-opus-4-1': 'claude-opus-4-1',
    'claude-opus-4': 'claude-opus-4-20250522',
    'claude-3-opus': 'claude-3-opus-20240229',
  };

  return modelMap[friendlyName] || friendlyName;
}

/**
 * Call Anthropic Claude API via backend proxy (bypasses CORS)
 */
export async function callClaudeAPI(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = getAnthropicAPIKey();

  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add it in Settings page.');
  }

  const actualModelId = getAnthropicModelId(model);

  simpleLogger.info(`🤖 Calling Anthropic API via proxy (model: ${model} → ${actualModelId})...`);

  const response = await fetch('http://localhost:3020/api/ai-proxy/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: actualModelId,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,
      max_tokens: 4096,
      apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    simpleLogger.error(
      `❌ Anthropic API error: ${response.status} ${response.statusText}`,
      errorText
    );
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from Anthropic API');
  }

  return content;
}

/**
 * Call Google Gemini API via backend proxy (bypasses CORS)
 */
export async function callGeminiAPI(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = getGoogleGeminiAPIKey();

  if (!apiKey) {
    throw new Error('Google Gemini API key not configured. Please add it in Settings page.');
  }

  simpleLogger.info(`🤖 Calling Google Gemini API via proxy (model: ${model})...`);

  const response = await fetch('http://localhost:3020/api/ai-proxy/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
      apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    simpleLogger.error(`❌ Gemini API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from Gemini API');
  }

  return content;
}

