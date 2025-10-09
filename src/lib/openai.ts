/**
 * 🤖 OpenAI API Integration for Answer Categorization
 *
 * This service handles AI-powered categorization of survey answers
 * using OpenAI's GPT models with structured JSON output.
 */

import OpenAI from 'openai';
import type { AiCodeSuggestion, AiSuggestions } from '../types';
import { openaiRateLimiter, retryWithBackoff } from './rateLimit';

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null;

try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (apiKey && apiKey !== 'sk-proj-placeholder-key') {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage (consider moving to backend)
    });
  }
} catch (error) {
  console.warn('⚠️ OpenAI client initialization failed:', error);
}

/**
 * Request structure for categorizing an answer
 */
export interface CategorizeRequest {
  answer: string;
  answerTranslation?: string; // Optional English translation for better accuracy
  categoryName: string;
  template: string;
  codes: Array<{ id: string; name: string }>;
  context: {
    language?: string;
    country?: string;
  };
}

/**
 * Response from OpenAI (matches our AiCodeSuggestion type)
 */
export interface CategorizeResponse {
  suggestions: AiCodeSuggestion[];
  reasoning?: string;
}

/**
 * Categorize a single answer using OpenAI
 *
 * @param request - The categorization request with answer, codes, and context
 * @returns Array of AI suggestions with confidence scores
 *
 * @example
 * ```typescript
 * const suggestions = await categorizeAnswer({
 *   answer: "I love Nike shoes",
 *   categoryName: "Fashion Brands",
 *   template: "Categorize this answer...",
 *   codes: [
 *     { id: "1", name: "Nike" },
 *     { id: "2", name: "Adidas" }
 *   ],
 *   context: {
 *     language: "en",
 *     country: "US"
 *   }
 * });
 * ```
 */
export async function categorizeAnswer(
  request: CategorizeRequest
): Promise<AiCodeSuggestion[]> {
  // Validate OpenAI client first
  if (!openai) {
    const error = new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY in .env');
    console.error('❌ Configuration error:', error.message);
    throw error;
  }

  // Add to rate limiter queue and retry with exponential backoff
  return openaiRateLimiter.add(() =>
    retryWithBackoff(async () => {
      try {
        // Build the system prompt by replacing placeholders
        const systemPrompt = buildSystemPrompt(request);

        console.log(`🤖 Calling OpenAI API for categorization...`);

        // Call OpenAI API
        const response = await openai!.chat.completions.create({
          model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `User's response: "${request.answer}"`,
            },
          ],
          temperature: 0.3, // Low temperature for consistent, focused responses
          response_format: { type: 'json_object' }, // Enforce JSON output
        });

        // Parse the JSON response
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        const result: CategorizeResponse = JSON.parse(content);

        // Validate response structure
        if (!result.suggestions || !Array.isArray(result.suggestions)) {
          throw new Error('Invalid response format from OpenAI - missing suggestions array');
        }

        // Validate each suggestion
        const validatedSuggestions = result.suggestions.map(suggestion => ({
          code_id: String(suggestion.code_id || 'unknown'),
          code_name: String(suggestion.code_name || 'Unknown'),
          confidence: Math.max(0, Math.min(1, Number(suggestion.confidence) || 0)), // Clamp between 0-1
          reasoning: String(suggestion.reasoning || 'No reasoning provided'),
        }));

        console.log(`✅ OpenAI returned ${validatedSuggestions.length} suggestions`);
        return validatedSuggestions;

      } catch (error: any) {
        // Enhanced error handling for common OpenAI errors
        console.error('❌ OpenAI API error:', error);

        // Rate limit error (429)
        if (error.status === 429) {
          const errorMessage = 'Rate limit reached. Please wait a moment and try again.';
          console.error(`🚫 ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Authentication error (401)
        if (error.status === 401) {
          const errorMessage = 'OpenAI API key is invalid. Please check your VITE_OPENAI_API_KEY in .env';
          console.error(`🔑 ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Insufficient quota (403)
        if (error.status === 403) {
          const errorMessage = 'OpenAI account has insufficient quota. Please add credits.';
          console.error(`💳 ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Bad request (400)
        if (error.status === 400) {
          const errorMessage = `Invalid request to OpenAI: ${error.message || 'Unknown error'}`;
          console.error(`⚠️ ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Server error (500+)
        if (error.status >= 500) {
          const errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
          console.error(`🔥 ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Network or other errors
        if (error.message?.includes('fetch')) {
          const errorMessage = 'Network error. Please check your internet connection.';
          console.error(`📡 ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Generic error
        throw error;
      }
    }, 3, 1000) // Retry up to 3 times with exponential backoff starting at 1s
  );
}

/**
 * Batch categorize multiple answers
 *
 * @param requests - Array of categorization requests
 * @returns Array of AiSuggestions objects ready for database storage
 */
export async function batchCategorizeAnswers(
  requests: CategorizeRequest[]
): Promise<AiSuggestions[]> {
  const results = await Promise.all(
    requests.map(async (request) => {
      try {
        const suggestions = await categorizeAnswer(request);

        const aiSuggestions: AiSuggestions = {
          suggestions,
          model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          preset_used: request.categoryName,
        };

        return aiSuggestions;
      } catch (error) {
        console.error(`Failed to categorize answer: ${request.answer}`, error);
        // Return empty suggestions on error
        return {
          suggestions: [],
          model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          preset_used: request.categoryName,
        };
      }
    })
  );

  return results;
}

/**
 * Build the system prompt by replacing template placeholders
 */
function buildSystemPrompt(request: CategorizeRequest): string {
  let prompt = request.template;

  // Replace placeholders
  prompt = prompt.replace('{name}', request.categoryName);
  prompt = prompt.replace('{codes}', formatCodes(request.codes));
  prompt = prompt.replace('{answer_lang}', request.context.language || 'unknown');
  prompt = prompt.replace('{country}', request.context.country || 'unknown');

  // Add answer section with both original and translation
  prompt += buildAnswerSection(request);

  // Add JSON format instructions if not present
  if (!prompt.includes('JSON')) {
    prompt += `\n\nIMPORTANT: You must respond with valid JSON in this exact format:
{
  "suggestions": [
    {
      "code_id": "1",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User explicitly mentioned 'nike' in their response"
    }
  ]
}

Rules:
- Return 1-3 suggestions, ordered by confidence (highest first)
- confidence must be a number between 0.0 and 1.0
- Only suggest codes that are relevant to the answer
- If uncertain, use lower confidence scores
- Always provide clear reasoning for each suggestion`;
  }

  return prompt;
}

/**
 * Format codes array for the prompt
 */
function formatCodes(codes: Array<{ id: string; name: string }>): string {
  // Return as a formatted list
  return codes.map((code, idx) => `${idx + 1}. ${code.name} (ID: ${code.id})`).join('\n');
}

/**
 * Build answer section with both original and translation
 * Using both languages significantly improves accuracy and confidence scores
 */
function buildAnswerSection(request: CategorizeRequest): string {
  let section = `\n\n=== ANSWER INFORMATION ===\n\n`;

  section += `Original Answer (${request.context.language || 'unknown'}): "${request.answer}"`;

  if (request.answerTranslation) {
    section += `\nEnglish Translation: "${request.answerTranslation}"`;
  }

  section += `\n\n=== INSTRUCTIONS ===
- Analyze BOTH the original answer and English translation (if provided)
- The original may contain brand names in local spelling
- The translation helps understand context and intent
- Consider information from BOTH languages for maximum accuracy
- Brand names like "Nike", "Colgate", "Coca-Cola" may appear in either version
- If brand name appears in original language, it's usually more reliable
- Use redundancy between languages to increase confidence scores
- Generic terms without specific brands should have lower confidence`;

  return section;
}

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

Use BOTH versions to make the best categorization decision. The original may contain brand names in local spelling, while the translation provides context. When both languages confirm the same brand or category, use higher confidence scores.`;

/**
 * Validate OpenAI API key is configured
 */
export function validateOpenAIConfig(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

/**
 * Get OpenAI configuration status for debugging
 */
export function getOpenAIStatus(): {
  configured: boolean;
  model: string;
  apiKeyPresent: boolean;
} {
  return {
    configured: validateOpenAIConfig(),
    model: 'gpt-4o-mini',
    apiKeyPresent: !!import.meta.env.VITE_OPENAI_API_KEY,
  };
}
