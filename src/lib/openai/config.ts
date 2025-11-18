/**
 * Configuration & Validation
 */

import { getOpenAIAPIKey } from '../../utils/apiKeys';

/**
 * Default categorization template
 * Can be customized per category
 */
export const DEFAULT_CATEGORIZATION_TEMPLATE = `You are an expert at categorizing survey responses for the category: {name}.

Your task is to analyze a user's response and suggest which code(s) from the following list best match their answer:

{codes}

Additional context:
- Language: {answer_lang}
- Country: {country}

You will receive:
1. The ORIGINAL answer in the user's language
2. An ENGLISH TRANSLATION (if available)
3. VISION AI ANALYSIS (if available) - This shows what brands/objects were detected in images
4. WEB SEARCH CONTEXT (if available) - This shows relevant search results

CRITICAL INSTRUCTIONS:
- ALWAYS prioritize the MEANING of the user's text over Vision AI results
- If user says "multiple brands" or "various brands" → choose generic codes, NOT specific brands
- If user says "more than one brand" → this is NOT a specific brand name
- Vision AI is only helpful when user mentions a SPECIFIC brand name
- If user text is generic (like "multiple brands"), ignore Vision AI brand detection
- Only use Vision AI when user explicitly mentions a brand or when text is unclear
- If user says "اكثر من ماركة" (more than one brand) → this is NOT "Sensodyne"

Use BOTH versions to make the best categorization decision. The original may contain brand names in local spelling, while the translation provides context. When both languages confirm the same brand or category, use higher confidence scores.`;

/**
 * Validate OpenAI API key is configured in Settings
 */
export function validateOpenAIConfig(): boolean {
  const apiKey = getOpenAIAPIKey();
  return !!apiKey && apiKey.trim().length > 0;
}

/**
 * Get OpenAI configuration status for debugging
 */
export function getOpenAIStatus(): {
  configured: boolean;
  model: string;
  apiKeyPresent: boolean;
} {
  const apiKey = getOpenAIAPIKey();
  return {
    configured: validateOpenAIConfig(),
    model: 'gpt-4o-mini',
    apiKeyPresent: !!apiKey && apiKey.trim().length > 0,
  };
}

