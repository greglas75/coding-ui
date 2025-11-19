/**
 * Main Categorization Function
 */

import OpenAI from 'openai';
import type { AiSuggestions } from '../../types';
import type { VisionAnalysisResult } from '../../services/geminiVision';
import { simpleLogger } from '../../utils/logger';
import { openaiRateLimiter, retryWithBackoff } from '../rateLimit';
import { callClaudeAPI, callGeminiAPI } from './apiCalls';
import { calculateEvidenceScore } from './evidence';
import { buildSystemPrompt } from './prompts';
import { detectProvider, getProviderAPIKey } from './provider';
import { buildSearchQuery, fetchWebContextAndImages } from './webContext';
import { buildMultiSourceResponse, runMultiSourceValidation } from './validation';
import type { CategorizeRequest, CategorizeResponse, ImageResult, WebContext } from './types';

/**
 * Categorize a single answer using OpenAI
 *
 * @param request - The categorization request with answer, codes, and context
 * @returns Array of AI suggestions with confidence scores
 */
export async function categorizeAnswer(request: CategorizeRequest): Promise<CategorizeResponse> {
  const { model = 'gpt-4o-mini' } = request;

  // Detect provider and get API key
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
            // Step 1: Multi-Source Brand Validation (6-Tier System)
            const multiSourceResult = await runMultiSourceValidation(request);

            // Format vision result from multi-source validation
            let visionResult: VisionAnalysisResult | null = null;
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

            // FALLBACK: Old Web Context System (for non-brand or if multi-source fails)
            let webContext: WebContext[] = [];
            let images: ImageResult[] = [];

            if (!multiSourceResult) {
              simpleLogger.info(`📝 Using traditional web context system`);
              const result = await fetchWebContextAndImages(request, localizedQuery);
              webContext = result.webContext;
              images = result.images;
              visionResult = result.visionResult;
            }

            // EARLY RETURN: If Multi-Source Result Available
            if (multiSourceResult) {
              simpleLogger.info(`🎯 Using multi-source result directly (skipping OpenAI call)`);
              return buildMultiSourceResponse(multiSourceResult, request);
            }

            // Step 2: Build the system prompt with web context
            const systemPrompt = buildSystemPrompt(request);

            // Use model from request or default to gpt-4o-mini
            const modelToUse = request.model || 'gpt-4o-mini';

            simpleLogger.info(`🤖 Calling OpenAI API for categorization (model: ${modelToUse})...`);

            // GPT-5 and some other models don't support custom temperature
            const supportsCustomTemperature = !modelToUse.toLowerCase().startsWith('gpt-5');

            // Build user message with PRIORITY for user text meaning
            let userMessage = `User's response: "${request.answer}"`;

            // CRITICAL: Check if user text is generic BEFORE adding Vision AI
            const isGenericText =
              request.answer.toLowerCase().includes('multiple') ||
              request.answer.toLowerCase().includes('various') ||
              request.answer.toLowerCase().includes('more than one') ||
              request.answerTranslation?.toLowerCase().includes('multiple') ||
              request.answerTranslation?.toLowerCase().includes('various') ||
              request.answerTranslation?.toLowerCase().includes('more than one');

            // Check for mixed brands in web context
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

            // Step 3: Call appropriate AI provider
            let content: string;

            if (provider === 'anthropic') {
              content = await callClaudeAPI(modelToUse, systemPrompt, userMessage);
              simpleLogger.info('📄 Raw Claude response:', content.substring(0, 500));
            } else if (provider === 'google') {
              content = await callGeminiAPI(modelToUse, systemPrompt, userMessage);
              simpleLogger.info('📄 Raw Gemini response:', content.substring(0, 500));
            } else {
              // Call OpenAI API (default)
              const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
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
                response_format: { type: 'json_object' },
                ...(supportsCustomTemperature ? { temperature: 0.3 } : {}),
              };

              const response = await openai!.chat.completions.create(requestParams);
              content = response.choices[0].message.content || '';

              if (!content) {
                throw new Error('Empty response from OpenAI');
              }

              simpleLogger.info('📄 Raw OpenAI response:', content.substring(0, 500));
            }

            // Extract JSON from responses (handle markdown + extra text)
            let cleanContent = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              cleanContent = jsonMatch[1].trim();
            } else {
              cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
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
              throw new Error('Invalid response format from OpenAI - missing suggestions array');
            }

            // Validate each suggestion
            const validatedSuggestions = result.suggestions.map(suggestion => ({
              code_id: String(suggestion.code_id || 'unknown'),
              code_name: String(suggestion.code_name || 'Unknown'),
              confidence: Math.max(0, Math.min(1, Number(suggestion.confidence) || 0)),
              reasoning: String(suggestion.reasoning || 'No reasoning provided'),
            }));

            simpleLogger.info(`✅ OpenAI returned ${validatedSuggestions.length} suggestions`);

            // Filter out negative confidence suggestions
            const filteredSuggestions = validatedSuggestions.filter(
              suggestion => suggestion.confidence > 0
            );

            if (filteredSuggestions.length !== validatedSuggestions.length) {
              const hiddenCount = validatedSuggestions.length - filteredSuggestions.length;
              simpleLogger.info(`🚫 Filtered out ${hiddenCount} suggestions with confidence ≤ 0`);
            }

            // Vision AI Fallback - Use Vision AI if no OpenAI suggestions
            let suggestionsToBoost = filteredSuggestions;

            if (
              filteredSuggestions.length === 0 &&
              visionResult?.brandDetected &&
              visionResult.confidence > 0.7
            ) {
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
                    confidence: Math.min(0.95, visionResult.confidence * 0.95),
                    reasoning: `Vision AI detected "${visionResult.brandName}" in product images with ${(visionResult.confidence * 100).toFixed(0)}% confidence. ${visionResult.reasoning}`,
                  },
                ];
              }
            }

            // Step 3: Boost confidence with web evidence validation
            const boostedSuggestions = suggestionsToBoost.map(suggestion => {
              const evidenceScore = calculateEvidenceScore(
                suggestion.code_name,
                webContext,
                images,
                visionResult
              );

              const originalConfidence = suggestion.confidence;
              const boostedConfidence = Math.min(1.0, suggestion.confidence + evidenceScore.boost);

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
            const finalResult: CategorizeResponse = {
              suggestions: boostedSuggestions,
              webContext: webContext.length > 0 ? webContext : undefined,
              images: images.length > 0 ? images : undefined,
              multiSourceResult: multiSourceResult || undefined,
            };

            simpleLogger.info('📊 Returning AI result:', {
              suggestionsCount: finalResult.suggestions.length,
              webContextCount: finalResult.webContext?.length || 0,
              imagesCount: finalResult.images?.length || 0,
            });

            return finalResult;
          } catch (error) {
            // Enhanced error handling for common OpenAI errors
            simpleLogger.error('❌ OpenAI API error:', error);

            // Type guard for error with status
            if (error && typeof error === 'object' && 'status' in error) {
              const status = (error as { status: number }).status;

              if (status === 429) {
                throw new Error('Rate limit reached. Please wait a moment and try again.');
              }

              if (status === 401) {
                throw new Error('OpenAI API key is invalid. Please check your API key in Settings page.');
              }

              if (status === 403) {
                throw new Error('OpenAI account has insufficient quota. Please add credits.');
              }

              if (status === 400) {
                const message = (error as { message?: string }).message;
                throw new Error(`Invalid request to OpenAI: ${message || 'Unknown error'}`);
              }

              if (status >= 500) {
                throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
              }
            }

            // Type guard for error with message
            if (error && typeof error === 'object' && 'message' in error) {
              const message = (error as { message: string }).message;
              if (message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection.');
              }
            }

            throw error;
          }
        },
        3,
        1000
      )
  );
}

/**
 * Batch categorize multiple answers
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

