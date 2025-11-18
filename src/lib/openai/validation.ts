/**
 * Multi-Source Validation
 */

import {
  convertToAISuggestion,
  formatSourcesForDisplay,
  validateBrandMultiSource,
  type MultiSourceValidationResult,
} from '../../services/multiSourceValidator';
import { simpleLogger } from '../../utils/logger';
import type { CategorizeRequest, CategorizeResponse } from './types';
import type { AiCodeSuggestion } from '../../types';

/**
 * Run multi-source validation
 */
export async function runMultiSourceValidation(
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

/**
 * Build response from multi-source result
 */
export function buildMultiSourceResponse(
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

