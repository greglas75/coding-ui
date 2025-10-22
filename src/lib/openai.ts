/**
 * 🤖 OpenAI API Integration for Answer Categorization
 *
 * This service handles AI-powered categorization of survey answers
 * using OpenAI's GPT models with structured JSON output.
 */

import OpenAI from 'openai';
import type { AiCodeSuggestion, AiSuggestions } from '../types';
import { openaiRateLimiter, retryWithBackoff } from './rateLimit';
import { getOpenAIAPIKey } from '../utils/apiKeys';
import { buildWebContextSection, googleImageSearch } from '../services/webContextProvider';
import { getTemplate, type TemplatePreset } from '../config/DefaultTemplates';

// ✅ SECURITY: OpenAI client initialized dynamically from Settings page (localStorage)
// Keys are obfuscated in browser storage and never exposed in .env files

/**
 * Request structure for categorizing an answer
 */
export interface CategorizeRequest {
  answer: string;
  answerTranslation?: string; // Optional English translation for better accuracy
  categoryName: string;
  presetName: string; // Template preset name (e.g., "LLM Proper Name", "LLM Brand List")
  customTemplate?: string; // Custom template (overrides preset if provided)
  model?: string; // OpenAI model (defaults to 'gpt-4o-mini' if not provided)
  visionModel?: string; // Gemini vision model for image analysis (e.g., "gemini-2.5-flash-lite")
  codes: Array<{ id: string; name: string }>;
  context: {
    language?: string;
    country?: string;
  };
}

/**
 * Web context result
 */
export interface WebContext {
  title: string;
  snippet: string;
  url: string;
}

/**
 * Image search result
 */
export interface ImageResult {
  title: string;
  link: string;
  thumbnailLink?: string;
  contextLink?: string;
}

/**
 * Response from OpenAI (matches our AiCodeSuggestion type)
 */
export interface CategorizeResponse {
  suggestions: AiCodeSuggestion[];
  reasoning?: string;
  webContext?: WebContext[];
  images?: ImageResult[];
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
 *   presetName: "LLM Brand List",
 *   model: "gpt-4o-mini",
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
): Promise<CategorizeResponse> {
  // Get API key from Settings page (localStorage)
  const apiKey = getOpenAIAPIKey();

  if (!apiKey) {
    const error = new Error('OpenAI API key not configured. Please add your API key in Settings page.');
    console.error('❌ Configuration error:', error.message);
    throw error;
  }

  // Create OpenAI client with key from Settings
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Add to rate limiter queue and retry with exponential backoff
  return openaiRateLimiter.add(() =>
    retryWithBackoff(async () => {
      try {
        // ═══════════════════════════════════════════════════════════
        // Step 1: Fetch Web Context (Google Search)
        // ═══════════════════════════════════════════════════════════
        let webContext: WebContext[] = [];
        let images: ImageResult[] = [];

        try {
          console.log(`🌐 Fetching web context for: "${request.answer.substring(0, 50)}..."`);

          // 🌍 Build localized search query (translate category name to user's language)
          // TODO: Re-enable after fixing translation API
          const localizedQuery = request.answer; // Temporarily using original answer
          const language = 'auto';

          console.log(`🔍 Search query: "${localizedQuery}"`);

          // Build web context section (returns formatted string)
          const webContextText = await buildWebContextSection(localizedQuery, {
            enabled: true,
            numResults: 3,
          });

          // Also get raw results for the modal
          const { googleSearch } = await import('../services/webContextProvider');
          webContext = await googleSearch(localizedQuery, 3);

          console.log(`✅ Found ${webContext.length} web results:`, webContext);

          // Fetch related images
          console.log(`🖼️ Fetching related images...`);
          images = await googleImageSearch(localizedQuery, 6);
          console.log(`✅ Found ${images.length} images:`, images);

          // 👁️ Analyze images with vision AI (if vision_model configured)
          if (images.length > 0 && request.visionModel) {
            console.log(`👁️ Analyzing images with ${request.visionModel}...`);
            try {
              const { analyzeImagesWithGemini, calculateVisionBoost } = await import('../services/geminiVision');

              const brandNames = request.codes.map((c: any) => c.name);
              const visionResult = await analyzeImagesWithGemini(
                images,
                request.answer,
                brandNames,
                request.visionModel
              );

              console.log('✅ Vision analysis result:', visionResult);

              // Store vision result for later evidence boost
              (request as any)._visionResult = visionResult;

            } catch (visionError) {
              console.warn('⚠️ Vision analysis failed:', visionError);
            }
          }

        } catch (error) {
          console.warn('⚠️ Web context fetch failed, continuing without it:', error);
        }

        // ═══════════════════════════════════════════════════════════
        // Step 2: Build the system prompt with web context
        // ═══════════════════════════════════════════════════════════
        const systemPrompt = buildSystemPrompt(request);

        // Use model from request or default to gpt-4o-mini
        const modelToUse = request.model || 'gpt-4o-mini';

        console.log(`🤖 Calling OpenAI API for categorization (model: ${modelToUse})...`);

        // GPT-5 and some other models don't support custom temperature
        const supportsCustomTemperature = !modelToUse.toLowerCase().startsWith('gpt-5');

        // Build request parameters
        const requestParams: any = {
          model: modelToUse,
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
          response_format: { type: 'json_object' }, // Enforce JSON output
        };

        // Only add temperature if the model supports it
        if (supportsCustomTemperature) {
          requestParams.temperature = 0.3; // Low temperature for consistent, focused responses
        }

        // Call OpenAI API
        const response = await openai.chat.completions.create(requestParams);

        // Parse the JSON response
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        console.log('📄 Raw OpenAI response:', content.substring(0, 500));

        const result: CategorizeResponse = JSON.parse(content);

        // Validate response structure
        if (!result.suggestions || !Array.isArray(result.suggestions)) {
          console.error('❌ Invalid response structure:', JSON.stringify(result, null, 2));
          console.error('Expected format: { suggestions: [...] }');
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

        // ═══════════════════════════════════════════════════════════
        // Step 3: Boost confidence with web evidence validation
        // ═══════════════════════════════════════════════════════════
        const boostedSuggestions = validatedSuggestions.map(suggestion => {
          const visionResult = (request as any)._visionResult;
          const evidenceScore = calculateEvidenceScore(
            suggestion.code_name,
            webContext,
            images,
            visionResult
          );

          const originalConfidence = suggestion.confidence;
          const boostedConfidence = Math.min(1.0, suggestion.confidence + evidenceScore.boost);

          // Add evidence details to reasoning
          let enhancedReasoning = suggestion.reasoning;
          if (evidenceScore.boost > 0) {
            enhancedReasoning += `\n\n🔍 Web Evidence (${evidenceScore.details}): Confidence boosted from ${(originalConfidence * 100).toFixed(0)}% to ${(boostedConfidence * 100).toFixed(0)}%`;
          }

          console.log(`📊 Evidence boost for "${suggestion.code_name}": ${(evidenceScore.boost * 100).toFixed(1)}% (${evidenceScore.details})`);

          return {
            ...suggestion,
            confidence: boostedConfidence,
            reasoning: enhancedReasoning,
          };
        });

        // Return suggestions with web context, images, and search query
        const finalResult = {
          suggestions: boostedSuggestions,
          webContext: webContext.length > 0 ? webContext : undefined,
          images: images.length > 0 ? images : undefined,
          searchQuery: localizedQuery, // Add search phrase used in Google
        };

        console.log('📊 Returning AI result:', {
          suggestionsCount: finalResult.suggestions.length,
          webContextCount: finalResult.webContext?.length || 0,
          imagesCount: finalResult.images?.length || 0,
          searchQuery: finalResult.searchQuery,
        });

        return finalResult;

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
          const errorMessage = 'OpenAI API key is invalid. Please check your API key in Settings page.';
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
 * Calculate evidence score from web search results and images
 *
 * This function validates AI suggestions by analyzing Google search results,
 * images, and Gemini vision analysis to boost confidence when strong evidence is found.
 *
 * @param brandName - The brand name to validate
 * @param webContext - Google search results
 * @param images - Google image search results
 * @param visionResult - Optional Gemini vision analysis result
 * @returns Score object with boost amount and evidence details
 */
function calculateEvidenceScore(
  brandName: string,
  webContext: WebContext[],
  images: ImageResult[],
  visionResult?: any
): { boost: number; details: string } {
  let boost = 0;
  const evidenceItems: string[] = [];

  // Normalize brand name for comparison (lowercase, no spaces)
  const normalizedBrand = brandName.toLowerCase().replace(/\s+/g, '');

  // ═══════════════════════════════════════════════════════════
  // 1. Check Web Search Results
  // ═══════════════════════════════════════════════════════════
  if (webContext.length > 0) {
    let hasOfficialSite = false;
    let hasRetailSite = false;
    let brandMentions = 0;

    for (const result of webContext) {
      const url = result.url.toLowerCase();
      const title = result.title.toLowerCase();
      const snippet = result.snippet.toLowerCase();

      // Check if brand name appears in URL (strong evidence)
      if (url.includes(normalizedBrand)) {
        brandMentions++;

        // Check for official website (domain matches brand)
        if (url.includes(`.${normalizedBrand}.com`) || url.includes(`//${normalizedBrand}.`)) {
          hasOfficialSite = true;
        }
      }

      // Check if brand appears in title or snippet
      if (title.includes(normalizedBrand) || snippet.includes(normalizedBrand)) {
        brandMentions++;
      }

      // Check for e-commerce/retail sites
      const retailDomains = ['amazon', 'walmart', 'target', 'ebay', 'shopify', 'carrefour', 'allegro'];
      if (retailDomains.some(domain => url.includes(domain))) {
        hasRetailSite = true;
      }
    }

    // Calculate boost from web results
    if (hasOfficialSite) {
      boost += 0.10; // +10% for official website
      evidenceItems.push('official site');
    }

    if (hasRetailSite) {
      boost += 0.05; // +5% for retail presence
      evidenceItems.push('retail sites');
    }

    if (brandMentions >= 2) {
      boost += 0.03; // +3% for multiple mentions
      evidenceItems.push(`${brandMentions} mentions`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Check Image Search Results
  // ═══════════════════════════════════════════════════════════
  if (images.length > 0) {
    let productImagesFound = 0;

    for (const image of images) {
      const imageUrl = image.link.toLowerCase();
      const imageTitle = image.title.toLowerCase();

      // Check if brand name appears in image URL or title
      if (imageUrl.includes(normalizedBrand) || imageTitle.includes(normalizedBrand)) {
        productImagesFound++;
      }
    }

    // Boost confidence based on number of product images
    if (productImagesFound >= 4) {
      boost += 0.10; // +10% for many product images
      evidenceItems.push('many product images');
    } else if (productImagesFound >= 2) {
      boost += 0.05; // +5% for some product images
      evidenceItems.push('product images');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Penalty for lack of evidence
  // ═══════════════════════════════════════════════════════════
  if (webContext.length === 0 && images.length === 0) {
    boost = -0.10; // -10% if no web evidence at all
    evidenceItems.push('no web evidence found');
  } else if (webContext.length === 0) {
    boost -= 0.05; // -5% if no search results
    evidenceItems.push('no search results');
  } else if (images.length === 0) {
    // No penalty for missing images alone
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Vision AI Analysis (Gemini) 👁️
  // ═══════════════════════════════════════════════════════════
  if (visionResult) {
    const visionBrandMatch = visionResult.brandName.toLowerCase() === brandName.toLowerCase();

    if (visionResult.brandDetected && visionBrandMatch) {
      // Vision AI detected the correct brand!
      if (visionResult.confidence >= 0.8) {
        boost += 0.15; // +15% for high confidence vision match
        evidenceItems.push('strong visual confirmation');
      } else if (visionResult.confidence >= 0.6) {
        boost += 0.10; // +10% for medium confidence
        evidenceItems.push('visual match detected');
      } else if (visionResult.confidence >= 0.4) {
        boost += 0.05; // +5% for weak match
        evidenceItems.push('possible visual match');
      }

      // Bonus for multiple objects detected
      if (visionResult.objectsDetected && visionResult.objectsDetected.length >= 3) {
        boost += 0.03; // +3% for detailed visual analysis
        evidenceItems.push('multiple elements');
      }
    } else if (visionResult.brandDetected && !visionBrandMatch) {
      // Vision detected different brand - penalty
      boost -= 0.08; // -8% for conflicting visual evidence
      evidenceItems.push(`vision detected "${visionResult.brandName}"`);
    } else if (!visionResult.brandDetected) {
      // No brand detected visually - small penalty
      boost -= 0.03; // -3% for no visual confirmation
      evidenceItems.push('no visual brand detected');
    }
  }

  const details = evidenceItems.length > 0 ? evidenceItems.join(', ') : 'no evidence';

  return { boost, details };
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
        const result = await categorizeAnswer(request);

        const aiSuggestions: AiSuggestions = {
          suggestions: result.suggestions,
          model: request.model || 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          preset_used: request.presetName,
          webContext: result.webContext,
          images: result.images,
        };

        return aiSuggestions;
      } catch (error) {
        console.error(`Failed to categorize answer: ${request.answer}`, error);
        // Return empty suggestions on error
        return {
          suggestions: [],
          model: request.model || 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          preset_used: request.presetName,
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
  // Get template: Use custom template if provided, otherwise use preset template
  let prompt: string;

  if (request.customTemplate) {
    // Use custom template from category
    prompt = request.customTemplate;
    console.log(`📝 Using custom template from category`);
  } else {
    // Use preset template from DefaultTemplates
    const presetTemplate = getTemplate(request.presetName as TemplatePreset);
    if (presetTemplate) {
      prompt = presetTemplate;
      console.log(`📝 Using preset template: "${request.presetName}"`);
    } else {
      // Fallback to default if preset not found
      prompt = DEFAULT_CATEGORIZATION_TEMPLATE;
      console.warn(`⚠️ Preset "${request.presetName}" not found, using DEFAULT_CATEGORIZATION_TEMPLATE`);
    }
  }

  // Replace placeholders
  prompt = prompt.replace(/\{name\}/g, request.categoryName);
  prompt = prompt.replace(/\{category\}/g, request.categoryName);
  prompt = prompt.replace(/\{searchTerm\}/g, request.categoryName); // searchTerm defaults to category name
  prompt = prompt.replace(/\{codes\}/g, formatCodes(request.codes));
  prompt = prompt.replace(/\{answer_lang\}/g, request.context.language || 'unknown');
  prompt = prompt.replace(/\{country\}/g, request.context.country || 'unknown');
  prompt = prompt.replace(/\{input\}/g, request.answer); // For some presets

  // Add answer section with both original and translation
  prompt += buildAnswerSection(request);

  // Add JSON format instructions if not present in the template
  // Check specifically for the "suggestions" array format
  if (!prompt.includes('"suggestions"')) {
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
