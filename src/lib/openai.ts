/**
 * 🤖 OpenAI API Integration for Answer Categorization
 *
 * This service handles AI-powered categorization of survey answers
 * using OpenAI's GPT models with structured JSON output.
 */

import OpenAI from 'openai';
import { getTemplate, type TemplatePreset } from '../config/DefaultTemplates';
import { buildWebContextSection, googleImageSearch } from '../services/webContextProvider';
import type { AiCodeSuggestion, AiSuggestions } from '../types';
import { getAnthropicAPIKey, getGoogleGeminiAPIKey, getOpenAIAPIKey } from '../utils/apiKeys';
import { simpleLogger } from '../utils/logger';
import { openaiRateLimiter, retryWithBackoff } from './rateLimit';
import {
  validateBrandMultiSource,
  convertToAISuggestion,
  formatSourcesForDisplay,
  type MultiSourceValidationResult,
} from '../services/multiSourceValidator';

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
  visionModel?: string; // Gemini vision model for image analysis (e.g., "gemini-2.0-pro-exp")
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
  multiSourceResult?: MultiSourceValidationResult; // ADD: Full multi-source validation result
}

// ═══════════════════════════════════════════════════════════
// HELPER: Detect AI provider from model name
// ═══════════════════════════════════════════════════════════
function detectProvider(model: string): 'openai' | 'anthropic' | 'google' {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return 'openai';
}

// ═══════════════════════════════════════════════════════════
// HELPER: Get API key for provider
// ═══════════════════════════════════════════════════════════
function getProviderAPIKey(provider: 'openai' | 'anthropic' | 'google'): string {
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

// ═══════════════════════════════════════════════════════════
// HELPER: Run multi-source validation
// ═══════════════════════════════════════════════════════════
async function runMultiSourceValidation(
  request: CategorizeRequest
): Promise<MultiSourceValidationResult | null> {
  try {
    simpleLogger.info(`🚀 Using Multi-Source Brand Validation (6-Tier System)`);
    simpleLogger.info(`   Answer: "${request.answer}"`);
    simpleLogger.info(`   Category: "${request.categoryName}"`);
    simpleLogger.info(`   Language: "${request.context.language || 'en'}"`);

    const multiSourceResult = await validateBrandMultiSource(
      request.answer,
      request.categoryName,
      request.context.language || 'en'
    );

    simpleLogger.info(`✅ Multi-source validation complete:`);
    simpleLogger.info(`   Type: ${multiSourceResult.type}`);
    simpleLogger.info(`   Confidence: ${multiSourceResult.confidence}%`);
    if (
      multiSourceResult.tier !== undefined &&
      multiSourceResult.cost !== undefined &&
      multiSourceResult.time_ms !== undefined
    ) {
      simpleLogger.info(
        `   Tier: ${multiSourceResult.tier} (cost: $${multiSourceResult.cost.toFixed(5)}, time: ${multiSourceResult.time_ms}ms)`
      );
    }
    simpleLogger.info(`   UI Action: ${multiSourceResult.ui_action}`);

    return multiSourceResult;
  } catch (error) {
    simpleLogger.error('❌ Multi-source validation failed:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER: Build search query
// ═══════════════════════════════════════════════════════════
function buildSearchQuery(request: CategorizeRequest): string {
  const searchText = request.answerTranslation || request.answer;
  const searchLower = searchText.toLowerCase().trim();
  const categoryLower = request.categoryName.toLowerCase();
  const alreadyIncludesCategory = searchLower.startsWith(categoryLower);

  return alreadyIncludesCategory
    ? searchText.trim()
    : `${request.categoryName} ${searchText}`.trim();
}

// ═══════════════════════════════════════════════════════════
// HELPER: Fetch web context and images (fallback system)
// ═══════════════════════════════════════════════════════════
async function fetchWebContextAndImages(
  request: CategorizeRequest,
  localizedQuery: string
): Promise<{ webContext: WebContext[]; images: ImageResult[]; visionResult: any }> {
  let webContext: WebContext[] = [];
  let images: ImageResult[] = [];
  let visionResult: any = null;

  try {
    simpleLogger.info(`🌐 Fetching web context for: "${request.answer.substring(0, 50)}..."`);
    simpleLogger.info(`🔍 Search query: "${localizedQuery}"`);

    // Build web context section
    await buildWebContextSection(localizedQuery, {
      enabled: true,
      numResults: 6,
    });

    // Get raw results for modal
    const { googleSearch } = await import('../services/webContextProvider');
    webContext = await googleSearch(localizedQuery, { numResults: 6 });
    simpleLogger.info(`✅ Found ${webContext.length} web results`);

    // Fetch related images
    simpleLogger.info(`🖼️ Fetching related images...`);
    images = await googleImageSearch(localizedQuery, 6);
    simpleLogger.info(`✅ Found ${images.length} images`);

    // Vision AI analysis (if configured)
    if (images.length > 0 && request.visionModel) {
      simpleLogger.info(`👁️ Analyzing images with ${request.visionModel}...`);
      try {
        const { analyzeImagesWithGemini } = await import('../services/geminiVision');
        const brandNames = request.codes.map((c: any) => c.name);
        visionResult = await analyzeImagesWithGemini(
          images,
          request.answer,
          brandNames,
          request.visionModel
        );
        simpleLogger.info('✅ Vision analysis result:', visionResult);
      } catch (visionError) {
        simpleLogger.warn('⚠️ Vision analysis failed:', visionError);
      }
    }
  } catch (error) {
    simpleLogger.warn('⚠️ Web context fetch failed, continuing without it:', error);
  }

  return { webContext, images, visionResult };
}

// ═══════════════════════════════════════════════════════════
// HELPER: Build response from multi-source result
// ═══════════════════════════════════════════════════════════
function buildMultiSourceResponse(
  multiSourceResult: MultiSourceValidationResult,
  request: CategorizeRequest
): CategorizeResponse {
  // Convert multi-source result to AI suggestion
  const suggestion = convertToAISuggestion(multiSourceResult, request.codes);
  const suggestions: AiCodeSuggestion[] = suggestion ? [suggestion] : [];

  // Format sources for display
  const sourcesDisplay = formatSourcesForDisplay(multiSourceResult);

  // Build reasoning with sources breakdown
  let enhancedReasoning = multiSourceResult.reasoning;
  enhancedReasoning += `\n\n📊 Sources Checked:`;
  if (sourcesDisplay.pinecone) enhancedReasoning += `\n• Pinecone: ${sourcesDisplay.pinecone}`;
  if (sourcesDisplay.googleSearch)
    enhancedReasoning += `\n• Google Search: ${sourcesDisplay.googleSearch}`;
  if (sourcesDisplay.visionAI) enhancedReasoning += `\n• Vision AI: ${sourcesDisplay.visionAI}`;
  if (sourcesDisplay.knowledgeGraph)
    enhancedReasoning += `\n• Knowledge Graph: ${sourcesDisplay.knowledgeGraph}`;
  if (sourcesDisplay.embeddings)
    enhancedReasoning += `\n• Embeddings: ${sourcesDisplay.embeddings}`;

  enhancedReasoning += `\n\n💰 Cost: $${multiSourceResult.cost.toFixed(5)} | ⏱️ Time: ${multiSourceResult.time_ms}ms | 🏆 Tier: ${multiSourceResult.tier}`;

  // Update reasoning in suggestion
  if (suggestions.length > 0 && suggestions[0]) {
    suggestions[0].reasoning = enhancedReasoning;
  }

  simpleLogger.info(`✅ Returning ${suggestions.length} suggestions from multi-source validation`);

  return {
    suggestions,
    reasoning: enhancedReasoning,
    webContext: [],
    images: [],
    multiSourceResult,
  };
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
export async function categorizeAnswer(request: CategorizeRequest): Promise<CategorizeResponse> {
  const { model = 'gpt-4o-mini' } = request;

  // ✅ Detect provider and get API key
  const provider = detectProvider(model);
  simpleLogger.info(`🔍 Detected provider: ${provider} for model: ${model}`);

  const apiKey = getProviderAPIKey(provider);

  // Create OpenAI client (only needed for OpenAI provider)
  const openai =
    provider === 'openai'
      ? new OpenAI({
          apiKey: apiKey!,
          dangerouslyAllowBrowser: true,
        })
      : null;

  // Add to rate limiter queue and retry with exponential backoff
  return openaiRateLimiter.add(
    () =>
      retryWithBackoff(
        async () => {
          try {
            // ═══════════════════════════════════════════════════════════
            // Step 1: Multi-Source Brand Validation (6-Tier System)
            // ═══════════════════════════════════════════════════════════
            const multiSourceResult = await runMultiSourceValidation(request);

            // Format vision result from multi-source validation
            let visionResult: any = null;
            if (multiSourceResult?.sources?.vision_ai) {
              const v = multiSourceResult.sources.vision_ai;
              visionResult = {
                brandDetected: v.dominant_brand !== undefined,
                brandName: v.dominant_brand || '',
                confidence: v.dominant_frequency || 0,
                reasoning: `Vision AI analyzed ${v.images_analyzed} images. ${v.dominant_brand ? `Dominant brand: ${v.dominant_brand} (${((v.dominant_frequency || 0) * 100).toFixed(0)}% frequency)` : 'No dominant brand detected'}`,
                objectsDetected: [],
              };
            }

            // Build search query for fallback
            const localizedQuery = buildSearchQuery(request);

            // ═══════════════════════════════════════════════════════════
            // FALLBACK: Old Web Context System (for non-brand or if multi-source fails)
            // ═══════════════════════════════════════════════════════════
            let webContext: WebContext[] = [];
            let images: ImageResult[] = [];

            if (!multiSourceResult) {
              simpleLogger.info(`📝 Using traditional web context system`);
              const result = await fetchWebContextAndImages(request, localizedQuery);
              webContext = result.webContext;
              images = result.images;
              visionResult = result.visionResult;
            }

            // ═══════════════════════════════════════════════════════════
            // EARLY RETURN: If Multi-Source Result Available
            // ═══════════════════════════════════════════════════════════
            if (multiSourceResult) {
              simpleLogger.info(`🎯 Using multi-source result directly (skipping OpenAI call)`);
              return buildMultiSourceResponse(multiSourceResult, request);
            }

            // ═══════════════════════════════════════════════════════════
            // Step 2: Build the system prompt with web context
            // ═══════════════════════════════════════════════════════════
            const systemPrompt = buildSystemPrompt(request);

            // Use model from request or default to gpt-4o-mini
            const modelToUse = request.model || 'gpt-4o-mini';

            simpleLogger.info(`🤖 Calling OpenAI API for categorization (model: ${modelToUse})...`);

            // GPT-5 and some other models don't support custom temperature
            const supportsCustomTemperature = !modelToUse.toLowerCase().startsWith('gpt-5');

            // Build user message with PRIORITY for user text meaning
            let userMessage = `User's response: "${request.answer}"`;

            // ⚠️ CRITICAL: Check if user text is generic BEFORE adding Vision AI
            const isGenericText =
              request.answer.toLowerCase().includes('multiple') ||
              request.answer.toLowerCase().includes('various') ||
              request.answer.toLowerCase().includes('more than one') ||
              request.answerTranslation?.toLowerCase().includes('multiple') ||
              request.answerTranslation?.toLowerCase().includes('various') ||
              request.answerTranslation?.toLowerCase().includes('more than one');

            // 🔍 Check for mixed brands in web context (even if not generic text)
            const hasMixedBrands = webContext.length > 0 && webContext.length >= 3;
            let mixedBrandsWarning = '';
            if (hasMixedBrands) {
              const uniqueDomains = new Set(webContext.map(r => r.url.split('/')[2]).slice(0, 3));
              if (uniqueDomains.size >= 2) {
                mixedBrandsWarning = `\n\n⚠️ MIXED BRANDS DETECTED: Web results show ${uniqueDomains.size} different brands. This suggests generic/multiple brand response rather than specific brand.`;
              }
            }

            if (isGenericText) {
              userMessage += `\n\n⚠️ IMPORTANT: User text indicates GENERIC response (multiple brands/various options). IGNORE specific brand detections and choose GENERIC codes instead.`;
            } else if (mixedBrandsWarning) {
              userMessage += mixedBrandsWarning;
            }

            // Add web context summary for better matching
            if (webContext.length > 0) {
              userMessage += `\n\n🌐 WEB SEARCH CONTEXT (${webContext.length} results found):`;
              webContext.forEach((result, idx) => {
                userMessage += `\n${idx + 1}. ${result.title} - ${result.snippet.substring(0, 100)}...`;
              });
            }

            // Add Vision AI context ONLY if not generic text
            if (visionResult?.brandDetected && !isGenericText) {
              userMessage += `\n\n🎯 VISION AI DETECTED: "${visionResult.brandName}" (${(visionResult.confidence * 100).toFixed(0)}% confidence)`;
              userMessage += `\nVision Analysis: ${visionResult.reasoning}`;
              if (visionResult.objectsDetected?.length > 0) {
                userMessage += `\nObjects in images: ${visionResult.objectsDetected.join(', ')}`;
              }
            } else if (visionResult?.brandDetected && isGenericText) {
              userMessage += `\n\n🎯 VISION AI DETECTED: "${visionResult.brandName}" (${(visionResult.confidence * 100).toFixed(0)}% confidence) - IGNORED due to generic user text`;
            }

            // ═══════════════════════════════════════════════════════════
            // Step 3: Call appropriate AI provider
            // ═══════════════════════════════════════════════════════════

            let content: string;

            if (provider === 'anthropic') {
              // Call Claude API
              content = await callClaudeAPI(modelToUse, systemPrompt, userMessage);
              simpleLogger.info('📄 Raw Claude response:', content.substring(0, 500));
            } else if (provider === 'google') {
              // Call Gemini API
              content = await callGeminiAPI(modelToUse, systemPrompt, userMessage);
              simpleLogger.info('📄 Raw Gemini response:', content.substring(0, 500));
            } else {
              // Call OpenAI API (default)
              const requestParams: any = {
                model: modelToUse,
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt,
                  },
                  {
                    role: 'user',
                    content: userMessage,
                  },
                ],
                response_format: { type: 'json_object' }, // Enforce JSON output
              };

              // Only add temperature if the model supports it
              if (supportsCustomTemperature) {
                requestParams.temperature = 0.3; // Low temperature for consistent, focused responses
              }

              const response = await openai!.chat.completions.create(requestParams);
              content = response.choices[0].message.content || '';

              if (!content) {
                throw new Error('Empty response from OpenAI');
              }

              simpleLogger.info('📄 Raw OpenAI response:', content.substring(0, 500));
            }

            // Extract JSON from Claude responses (handle markdown + extra text)
            let cleanContent = content;

            // Try to extract JSON from markdown code blocks
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              cleanContent = jsonMatch[1].trim();
            } else {
              // Fallback: clean markdown formatting
              cleanContent = content
                .replace(/```json\s*/g, '')
                .replace(/```\s*$/g, '')
                .trim();
            }

            let result: CategorizeResponse;
            try {
              result = JSON.parse(cleanContent);
            } catch (parseError) {
              const errorMessage =
                parseError instanceof Error ? parseError.message : String(parseError);
              simpleLogger.error('❌ JSON Parse Error:', {
                originalContent: content.substring(0, 200),
                cleanContent: cleanContent.substring(0, 200),
                error: errorMessage,
              });
              throw new Error(`Invalid JSON response from AI: ${errorMessage}`);
            }

            // Validate response structure
            if (!result.suggestions || !Array.isArray(result.suggestions)) {
              simpleLogger.error('❌ Invalid response structure:', JSON.stringify(result, null, 2));
              simpleLogger.error('Expected format: { suggestions: [...] }');
              throw new Error('Invalid response format from OpenAI - missing suggestions array');
            }

            // Validate each suggestion
            const validatedSuggestions = result.suggestions.map(suggestion => ({
              code_id: String(suggestion.code_id || 'unknown'),
              code_name: String(suggestion.code_name || 'Unknown'),
              confidence: Math.max(0, Math.min(1, Number(suggestion.confidence) || 0)), // Clamp between 0-1
              reasoning: String(suggestion.reasoning || 'No reasoning provided'),
            }));

            simpleLogger.info(`✅ OpenAI returned ${validatedSuggestions.length} suggestions`);

            // ═══════════════════════════════════════════════════════════
            // Step 2.4: FILTER OUT NEGATIVE CONFIDENCE SUGGESTIONS
            // ═══════════════════════════════════════════════════════════
            const filteredSuggestions = validatedSuggestions.filter(
              suggestion => suggestion.confidence > 0
            );

            if (filteredSuggestions.length !== validatedSuggestions.length) {
              const hiddenCount = validatedSuggestions.length - filteredSuggestions.length;
              simpleLogger.info(`🚫 Filtered out ${hiddenCount} suggestions with confidence ≤ 0`);
            }

            // ═══════════════════════════════════════════════════════════
            // Step 2.5: Vision AI Fallback - Use Vision AI if no OpenAI suggestions
            // ═══════════════════════════════════════════════════════════
            let suggestionsToBoost = filteredSuggestions;

            if (
              filteredSuggestions.length === 0 &&
              visionResult?.brandDetected &&
              visionResult.confidence > 0.7
            ) {
              // Vision AI detected a brand but OpenAI didn't match it
              // Try to find this brand in available codes (fuzzy match)
              const detectedBrand = visionResult.brandName.toLowerCase();
              const matchingCode = request.codes.find(
                code =>
                  code.name.toLowerCase() === detectedBrand ||
                  code.name.toLowerCase().includes(detectedBrand) ||
                  detectedBrand.includes(code.name.toLowerCase())
              );

              if (matchingCode) {
                simpleLogger.info(
                  `🎯 Vision AI fallback: Using "${matchingCode.name}" from Vision AI (${(visionResult.confidence * 100).toFixed(0)}% confidence)`
                );
                suggestionsToBoost = [
                  {
                    code_id: matchingCode.id,
                    code_name: matchingCode.name,
                    confidence: Math.min(0.95, visionResult.confidence * 0.95), // High confidence for Vision AI matches
                    reasoning: `Vision AI detected "${visionResult.brandName}" in product images with ${(visionResult.confidence * 100).toFixed(0)}% confidence. ${visionResult.reasoning}`,
                  },
                ];
              }
            }

            // ═══════════════════════════════════════════════════════════
            // Step 3: Boost confidence with web evidence validation
            // ═══════════════════════════════════════════════════════════
            const boostedSuggestions = suggestionsToBoost.map(suggestion => {
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

              simpleLogger.info(
                `📊 Evidence boost for "${suggestion.code_name}": ${(evidenceScore.boost * 100).toFixed(1)}% (${evidenceScore.details})`
              );

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
              visionResult: visionResult || undefined, // Gemini Vision API analysis
              categoryName: request.categoryName, // Category name (e.g., "Toothpaste", "Brand")
              multiSourceResult: multiSourceResult || undefined, // ✅ Multi-source 6-tier validation results
            };

            simpleLogger.info('📊 Returning AI result:', {
              suggestionsCount: finalResult.suggestions.length,
              webContextCount: finalResult.webContext?.length || 0,
              imagesCount: finalResult.images?.length || 0,
              searchQuery: finalResult.searchQuery,
            });

            return finalResult;
          } catch (error: any) {
            // Enhanced error handling for common OpenAI errors
            simpleLogger.error('❌ OpenAI API error:', error);

            // Rate limit error (429)
            if (error.status === 429) {
              const errorMessage = 'Rate limit reached. Please wait a moment and try again.';
              simpleLogger.error(`🚫 ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Authentication error (401)
            if (error.status === 401) {
              const errorMessage =
                'OpenAI API key is invalid. Please check your API key in Settings page.';
              simpleLogger.error(`🔑 ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Insufficient quota (403)
            if (error.status === 403) {
              const errorMessage = 'OpenAI account has insufficient quota. Please add credits.';
              simpleLogger.error(`💳 ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Bad request (400)
            if (error.status === 400) {
              const errorMessage = `Invalid request to OpenAI: ${error.message || 'Unknown error'}`;
              simpleLogger.error(`⚠️ ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Server error (500+)
            if (error.status >= 500) {
              const errorMessage =
                'OpenAI service is temporarily unavailable. Please try again later.';
              simpleLogger.error(`🔥 ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Network or other errors
            if (error.message?.includes('fetch')) {
              const errorMessage = 'Network error. Please check your internet connection.';
              simpleLogger.error(`📡 ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Generic error
            throw error;
          }
        },
        3,
        1000
      ) // Retry up to 3 times with exponential backoff starting at 1s
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
    let brandConsistency = 0;
    const totalResults = webContext.length;

    for (const result of webContext) {
      const url = result.url.toLowerCase();
      const title = result.title.toLowerCase();
      const snippet = result.snippet.toLowerCase();

      // Check if brand name appears in URL (strong evidence)
      if (url.includes(normalizedBrand)) {
        brandMentions++;
        brandConsistency++;

        // Check for official website (domain matches brand)
        if (url.includes(`.${normalizedBrand}.com`) || url.includes(`//${normalizedBrand}.`)) {
          hasOfficialSite = true;
        }
      }

      // Check if brand appears in title or snippet
      if (title.includes(normalizedBrand) || snippet.includes(normalizedBrand)) {
        brandMentions++;
        brandConsistency++;
      }

      // Check for e-commerce/retail sites
      const retailDomains = [
        'amazon',
        'walmart',
        'target',
        'ebay',
        'shopify',
        'carrefour',
        'allegro',
      ];
      if (retailDomains.some(domain => url.includes(domain))) {
        hasRetailSite = true;
      }
    }

    // Calculate boost from web results
    if (hasOfficialSite) {
      boost += 0.1; // +10% for official website
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

    // ═══════════════════════════════════════════════════════════
    // Brand Consistency Check (AGGRESSIVE - penalize mixed results)
    // ═══════════════════════════════════════════════════════════
    const consistencyRatio = brandConsistency / totalResults;

    if (consistencyRatio >= 0.8) {
      // High consistency - most/all results about the same brand
      boost += 0.15; // +15% for high brand consistency
      evidenceItems.push('high brand consistency across results');
    } else if (consistencyRatio >= 0.6) {
      // Medium-high consistency - majority results about the brand
      boost -= 0.1; // -10% for mixed brand results (penalty for 60-80%)
      evidenceItems.push('medium brand consistency - reduced confidence');
    } else if (consistencyRatio >= 0.4) {
      // Medium-low consistency - mixed results (like current case)
      boost -= 0.1; // -10% for mixed brand results
      evidenceItems.push('mixed brand results - reduced confidence');
    } else {
      // Low consistency - different brands dominate
      boost -= 0.2; // -20% for low brand consistency
      evidenceItems.push('multiple different brands dominate results');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Check Image Search Results with BRAND CONSISTENCY
  // ═══════════════════════════════════════════════════════════
  if (images.length > 0) {
    let productImagesFound = 0;
    let brandConsistencyImages = 0;
    const totalImages = images.length;

    for (const image of images) {
      const imageUrl = image.link.toLowerCase();
      const imageTitle = image.title.toLowerCase();

      // Check if brand name appears in image URL or title
      if (imageUrl.includes(normalizedBrand) || imageTitle.includes(normalizedBrand)) {
        productImagesFound++;
        brandConsistencyImages++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Image Brand Consistency Analysis (same logic as Web Context)
    // ═══════════════════════════════════════════════════════════
    const imageConsistencyRatio = brandConsistencyImages / totalImages;

    if (imageConsistencyRatio >= 0.8) {
      // High consistency - most/all images about the same brand
      boost += 0.15; // +15% for high image brand consistency
      evidenceItems.push('high image brand consistency');
    } else if (imageConsistencyRatio >= 0.6) {
      // Medium-high consistency - majority images about the brand
      boost -= 0.1; // -10% for mixed brand images (penalty for 60-80%)
      evidenceItems.push('medium image brand consistency - reduced confidence');
    } else if (imageConsistencyRatio >= 0.4) {
      // Medium-low consistency - mixed brand images (like current case)
      boost -= 0.1; // -10% for mixed brand images
      evidenceItems.push('mixed brand images - reduced confidence');
    } else if (imageConsistencyRatio < 0.4) {
      // Low consistency - different brands dominate images
      boost -= 0.2; // -20% for low image brand consistency
      evidenceItems.push('multiple different brands in images');
    }

    // Traditional boost for product images (reduced impact)
    if (productImagesFound >= 4) {
      boost += 0.05; // +5% for many product images (reduced from +10%)
      evidenceItems.push('many product images');
    } else if (productImagesFound >= 2) {
      boost += 0.02; // +2% for some product images (reduced from +5%)
      evidenceItems.push('product images');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Penalty for lack of evidence
  // ═══════════════════════════════════════════════════════════
  if (webContext.length === 0 && images.length === 0) {
    boost = -0.1; // -10% if no web evidence at all
    evidenceItems.push('no web evidence found');
  } else if (webContext.length === 0) {
    boost -= 0.05; // -5% if no search results
    evidenceItems.push('no search results');
  } else if (images.length === 0) {
    // No penalty for missing images alone
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Vision AI Analysis (Gemini) with BRAND CONSISTENCY 👁️
  // ═══════════════════════════════════════════════════════════
  if (visionResult) {
    const visionBrandMatch = visionResult.brandName.toLowerCase() === brandName.toLowerCase();

    if (visionResult.brandDetected && visionBrandMatch) {
      // ✅ FIRST: Check for mixed brands BEFORE adding any boost
      let hasMixedBrands = false;
      const detectedBrands = new Set();

      if (visionResult.objectsDetected && visionResult.objectsDetected.length > 0) {
        visionResult.objectsDetected.forEach((obj: string) => {
          const objLower = obj.toLowerCase();
          if (objLower.includes('sensodyne')) detectedBrands.add('sensodyne');
          if (objLower.includes('oral-b') || objLower.includes('oralb'))
            detectedBrands.add('oral-b');
          if (objLower.includes('parodontax')) detectedBrands.add('parodontax');
          if (objLower.includes('crest')) detectedBrands.add('crest');
          if (objLower.includes('colgate')) detectedBrands.add('colgate');
          if (objLower.includes('burts') || objLower.includes("burt's"))
            detectedBrands.add('burts');
        });

        if (detectedBrands.size > 1) {
          hasMixedBrands = true;
        }
      }

      // ✅ If mixed brands detected - IGNORE Vision AI completely
      if (hasMixedBrands) {
        boost -= 0.15; // -15% penalty for mixed brands in Vision AI
        evidenceItems.push(
          `vision AI ignored due to ${detectedBrands.size} different brands detected (mixed results)`
        );
      } else {
        // ✅ Calculate Vision AI consistency threshold
        const totalObjects = visionResult.objectsDetected?.length || 0;
        const brandObjects =
          visionResult.objectsDetected?.filter((obj: string) =>
            obj.toLowerCase().includes(brandName.toLowerCase())
          ).length || 0;

        const consistencyRatio = totalObjects > 0 ? brandObjects / totalObjects : 0;

        // ✅ Only if Vision AI is consistent (80%+ same brand) - add boost
        if (consistencyRatio >= 0.8) {
          if (visionResult.confidence >= 0.8) {
            boost += 0.15; // +15% for high confidence vision match
            evidenceItems.push('strong visual confirmation');
          } else if (visionResult.confidence >= 0.6) {
            boost += 0.1; // +10% for medium confidence
            evidenceItems.push('visual match detected');
          } else if (visionResult.confidence >= 0.4) {
            boost += 0.05; // +5% for weak match
            evidenceItems.push('possible visual match');
          }

          // Bonus for multiple objects detected (only if consistent)
          if (visionResult.objectsDetected && visionResult.objectsDetected.length >= 3) {
            boost += 0.03; // +3% for detailed visual analysis
            evidenceItems.push('multiple elements');
          }
        } else {
          // ✅ Low consistency - ignore Vision AI
          boost -= 0.1; // -10% penalty for low consistency
          evidenceItems.push(
            `vision AI ignored - low consistency (${Math.round(consistencyRatio * 100)}% same brand)`
          );
        }
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
    requests.map(async request => {
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
        simpleLogger.error(`Failed to categorize answer: ${request.answer}`, error);
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
    simpleLogger.info(`📝 Using custom template from category`);
  } else {
    // Use preset template from DefaultTemplates
    const presetTemplate = getTemplate(request.presetName as TemplatePreset);
    if (presetTemplate) {
      prompt = presetTemplate;
      simpleLogger.info(`📝 Using preset template: "${request.presetName}"`);
    } else {
      // Fallback to default if preset not found
      prompt = DEFAULT_CATEGORIZATION_TEMPLATE;
      simpleLogger.warn(
        `⚠️ Preset "${request.presetName}" not found, using DEFAULT_CATEGORIZATION_TEMPLATE`
      );
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
- Generic terms without specific brands should have lower confidence

=== FUZZY MATCHING (CRITICAL) ===
- **ALWAYS USE FUZZY MATCHING**: Allow for typos, misspellings, and minor variations
- Examples: "mediplua" → "Mediplus", "sensodyne" → "Sensodyne", "collegiate" → "Colgate"
- Ignore case differences (e.g., "NIKE" matches "nike")
- Allow 1-2 character differences for short words, 2-3 for longer words
- Common typos: adjacent key swaps (e.g., "colaget" → "Colgate"), missing letters, extra letters
- Match phonetically similar spellings (e.g., "sencodyne" → "Sensodyne")
- **If answer is 70%+ similar to a code name, consider it a match**
- Calculate similarity: "collegiate" vs "Colgate" = 7 matching letters/positions = strong match
- Still require high confidence (>0.8) for fuzzy matches if web evidence confirms it

=== VISION AI EVIDENCE (USE THIS!) ===
- IF Vision AI detected a brand in product images, give it VERY HIGH weight
- Vision AI analyzes actual product packaging, logos, and brand imagery
- If Vision AI says "Colgate" with 100% confidence, prioritize this over text analysis
- Vision AI can correct user typos by identifying actual products in images
- Example: User writes "collegiate", Vision AI detects "Colgate" logo → TRUST Vision AI

=== WEB SEARCH CONTEXT (CRITICAL FOR TYPOS) ===
- Use web search results to understand context and find brands mentioned in results
- If web results mention a specific brand frequently, consider it even if user text has typos
- Examples:
  * User: "blank" → Web shows "BlanX toothpaste" results → Suggest "BlanX"
  * User: "crest" → Web shows "Crest Pro-Health" → Suggest "Crest"
- Look for brand names in:
  * Page titles (e.g., "Shop Toothpaste - BlanX")
  * Snippets (e.g., "BlanX whitening toothpaste...")
  * URLs (e.g., "lifesupplies.com/.../blanx")
- If 2+ web results mention the same brand, it's strong evidence
- **IMPORTANT**: You can suggest codes found in web search EVEN IF they don't exist in available codes list
  * If web search clearly identifies a brand (e.g., "BlanX") but it's not in available codes, still suggest it
  * User will be prompted to create the new code after confirmation
  * This allows discovering correct brand names with proper spelling from web evidence`;

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
/**
 * Map friendly model names to actual Anthropic API model IDs
 * ALL Anthropic models use HYPHENS everywhere (no dots!)
 * Example: claude-3-5-haiku-20241022 (NOT claude-3.5-haiku)
 */
function getAnthropicModelId(friendlyName: string): string {
  const modelMap: Record<string, string> = {
    // Haiku models
    'claude-haiku-4.5': 'claude-haiku-4-5', // ✅ Latest (Oct 15, 2025)
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
async function callClaudeAPI(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = getAnthropicAPIKey();

  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add it in Settings page.');
  }

  // Map friendly name to actual API model ID
  const actualModelId = getAnthropicModelId(model);

  simpleLogger.info(`🤖 Calling Anthropic API via proxy (model: ${model} → ${actualModelId})...`);

  // Call backend proxy instead of direct API
  const response = await fetch('http://localhost:3020/api/ai-proxy/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: actualModelId, // ✅ Use mapped model ID (claude-haiku-4.5 → claude-haiku-4-5)
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,
      max_tokens: 4096,
      apiKey, // Send API key to backend proxy
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
async function callGeminiAPI(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = getGoogleGeminiAPIKey();

  if (!apiKey) {
    throw new Error('Google Gemini API key not configured. Please add it in Settings page.');
  }

  simpleLogger.info(`🤖 Calling Google Gemini API via proxy (model: ${model})...`);

  // Call backend proxy instead of direct API
  const response = await fetch('http://localhost:3020/api/ai-proxy/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model, // Gemini models don't need mapping (they use different naming)
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
      apiKey, // Send API key to backend proxy
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
