/**
 * 🔍 Multi-Source Brand Validator - New 6-Tier Validation System
 *
 * Uses Python backend `/api/validate` endpoint with:
 * - Tier 0: Pinecone Vector Search (15-50ms, $0.00002)
 * - Tier 1: Dual Google Images Search (500ms, FREE)
 * - Tier 2: Vision AI Analysis (2-3s, $0.012)
 * - Tier 3: Knowledge Graph Verification (500ms, FREE)
 * - Tier 4: Embedding Similarity (100ms, $0.00002)
 * - Tier 5: Multi-Source Aggregation
 */

import {
  getGoogleCSEAPIKey,
  getGoogleCSECXID,
  getPineconeAPIKey,
  getOpenAIAPIKey
} from '../utils/apiKeys';
import { simpleLogger } from '../utils/logger';

// ✅ Use Vite proxy instead of direct connection to avoid CORS
// Vite config proxies /api/validate to http://localhost:8000
const API_BASE = '';  // Empty = use relative path through Vite proxy

/**
 * Validation types from Python backend
 * Must match ValidationType enum in python-service/validators/multi_source_validator.py
 */
export type ValidationType =
  | 'global_code'          // Global code matched (I don't know, None, etc.)
  | 'brand_match'          // Existing brand matched in Pinecone
  | 'category_error'       // User text exists but in different category
  | 'ambiguous_descriptor' // Term is product descriptor, not brand
  | 'clear_match'          // High confidence match from multiple sources
  | 'unclear';             // Low confidence, needs manual review

/**
 * UI actions from Python backend
 */
export type UIAction =
  | 'approve'             // Auto-approve
  | 'ask_user_choose'     // Show disambiguation options
  | 'review_category'     // Category error - suggest change
  | 'manual_review';      // Unclear - flag for manual review

/**
 * Disambiguation candidate
 */
export interface ValidationCandidate {
  brand: string;
  full_name: string;
  score: number;
  vision_frequency: number;
  kg_verified: boolean;
  embedding_similarity: number;
  pinecone_match: boolean;
}

/**
 * Multi-source validation result from Python backend
 */
export interface MultiSourceValidationResult {
  type: ValidationType;
  confidence: number; // 0-100
  reasoning: string;
  ui_action: UIAction;

  // Optional fields based on type
  brand?: string;
  brand_id?: string;
  descriptor?: string;
  candidates?: ValidationCandidate[];
  detected_entity?: string;
  detected_category?: string;
  expected_category?: string;

  // Source breakdown
  sources: {
    pinecone?: {
      match: boolean;
      similarity?: number;
      namespace?: string;
      is_global?: boolean;
    };
    google_search_a?: {
      results_count: number;
      pattern?: string;
    };
    google_search_b?: {
      results_count: number;
      pattern?: string;
    };
    vision_ai?: {
      images_analyzed: number;
      brands_detected?: Record<string, number>;
      dominant_brand?: string;
      dominant_frequency?: number;
    };
    knowledge_graph?: {
      user_text?: {
        verified: boolean;
        type?: string;
        category?: string;
      };
      candidates?: Record<string, { verified: boolean }>;
    };
    embeddings?: Record<string, number>;
  };

  // RAW DATA: Images, Web Results, Knowledge Graph Details
  image_urls?: Array<{
    url: string;
    title: string;
    thumbnail_url?: string;
    context_link: string;
    snippet?: string;
  }>;
  web_results?: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
  kg_details?: Record<string, {
    name: string;
    entity_type: string;
    category: string;
    description: string;
    verified: boolean;
    matches_user_category: boolean;
  }>;

  // Metrics
  cost: number;
  time_ms: number;
  tier: number;
}

/**
 * Request to Python backend /api/validate
 */
export interface MultiSourceValidationRequest {
  user_response: string;
  category: string;
  language?: string;
  user_id?: string;
  response_id?: string;

  // API keys from Settings (override environment variables)
  google_api_key?: string;
  google_cse_cx_id?: string;
  pinecone_api_key?: string;
  openai_api_key?: string;
}

/**
 * Validate brand using multi-source 6-tier system
 *
 * @param userResponse - User's answer text (e.g., "اكسترا", "Colgate")
 * @param category - Product category (e.g., "Toothpaste")
 * @param language - Language code (e.g., "ar", "en", "pl")
 * @returns Multi-source validation result with confidence, reasoning, and sources
 *
 * @example
 * ```typescript
 * const result = await validateBrandMultiSource("اكسترا", "Toothpaste", "ar");
 *
 * if (result.type === 'ambiguous_descriptor') {
 *   // Show disambiguation UI with result.candidates
 *   console.log('Multiple brands found:', result.candidates);
 * } else if (result.type === 'clear_match') {
 *   // Auto-approve
 *   console.log('Matched brand:', result.brand, 'confidence:', result.confidence);
 * }
 * ```
 */
export async function validateBrandMultiSource(
  userResponse: string,
  category: string,
  language: string = 'en'
): Promise<MultiSourceValidationResult> {
  simpleLogger.info(`🔍 Multi-source validation: "${userResponse}" | Category: ${category} | Language: ${language}`);

  try {
    // Get API keys from Settings
    const google_api_key = getGoogleCSEAPIKey();
    const google_cse_cx_id = getGoogleCSECXID();
    const pinecone_api_key = getPineconeAPIKey();
    const openai_api_key = getOpenAIAPIKey();

    simpleLogger.info('🔑 API Keys available:', {
      google: !!google_api_key,
      google_cx: !!google_cse_cx_id,
      pinecone: !!pinecone_api_key,
      openai: !!openai_api_key,
    });

    // Build request
    const request: MultiSourceValidationRequest = {
      user_response: userResponse,
      category,
      language,
      google_api_key,
      google_cse_cx_id,
      pinecone_api_key,
      openai_api_key,
    };

    // Call Python backend with 90 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds

    try {
      const response = await fetch(`${API_BASE}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Check content type to handle CORS errors properly
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;

        if (contentType?.includes('application/json')) {
          try {
            const errorJson = await response.json();
            errorMessage = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
          } catch {
            errorMessage = await response.text();
          }
        } else {
          // HTML or plain text (likely CORS or server error)
          const errorText = await response.text();
          errorMessage = errorText.substring(0, 200); // Limit error text length
        }

        throw new Error(`Multi-source validation failed: ${response.status} - ${errorMessage}`);
      }

      const result: MultiSourceValidationResult = await response.json();

      simpleLogger.info(`✅ Validation complete:`, {
        type: result.type,
        confidence: result.confidence,
        ui_action: result.ui_action,
        tier: result.tier,
        cost: result.cost,
        time_ms: result.time_ms,
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          simpleLogger.error('⏱️ Multi-source validation timeout (90s)', error);
          throw new Error('Validation timeout - request took longer than 90 seconds');
        }

        // Network errors (fetch failures, CORS, connection refused)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          simpleLogger.error('🌐 Network error - backend unreachable', error);
          throw new Error('Network error - check if backend is running on http://localhost:8000');
        }

        // Failed to fetch (CORS or connection refused)
        if (error.message.includes('Failed to fetch')) {
          simpleLogger.error('🚫 Failed to fetch - CORS or backend down', error);
          throw new Error('Cannot connect to backend - check CORS settings or if service is running');
        }
      }

      throw error;
    }
  } catch (error) {
    simpleLogger.error('❌ Multi-source validation failed:', error);
    throw error;
  }
}

/**
 * Convert multi-source validation result to AI suggestion format
 *
 * Maps the Python backend response to frontend AI suggestion structure
 */
export function convertToAISuggestion(
  result: MultiSourceValidationResult,
  codes: Array<{ id: string; name: string }>
): {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
  isNew?: boolean;
} | null {
  // Handle different validation types
  switch (result.type) {
    case 'global_code':
    case 'brand_match':
    case 'clear_match':
      // Find matching code
      const matchingCode = codes.find(
        c => c.name.toLowerCase() === result.brand?.toLowerCase()
      );

      if (!matchingCode && result.brand) {
        // Brand detected but not in code list - mark as new
        return {
          code_id: 'new',
          code_name: result.brand,
          confidence: result.confidence / 100, // Convert 0-100 to 0-1
          reasoning: result.reasoning,
          isNew: true,
        };
      }

      if (matchingCode) {
        return {
          code_id: matchingCode.id,
          code_name: matchingCode.name,
          confidence: result.confidence / 100, // Convert 0-100 to 0-1
          reasoning: result.reasoning,
        };
      }
      break;

    case 'ambiguous_descriptor':
      // For ambiguous, return highest scoring candidate
      if (result.candidates && result.candidates.length > 0) {
        const topCandidate = result.candidates[0];
        const matchingCode = codes.find(
          c => c.name.toLowerCase() === topCandidate.brand.toLowerCase()
        );

        if (matchingCode) {
          return {
            code_id: matchingCode.id,
            code_name: matchingCode.name,
            confidence: result.confidence / 100,
            reasoning: `${result.reasoning}\n\n⚠️ Ambiguous term detected. Top match: ${topCandidate.brand} (${(topCandidate.score * 100).toFixed(0)}% score)`,
          };
        }
      }
      break;

    case 'category_error':
      // Return negative confidence to indicate error
      return {
        code_id: 'error',
        code_name: result.detected_entity || 'Category Error',
        confidence: -1, // Negative confidence = error
        reasoning: `❌ ${result.reasoning}\n\nDetected: ${result.detected_entity} (${result.detected_category})\nExpected: ${result.expected_category}`,
      };

    case 'unclear':
      // Low confidence - return null (no suggestion)
      return null;
  }

  return null;
}

/**
 * Format sources breakdown for display in AI Insights modal
 */
export function formatSourcesForDisplay(result: MultiSourceValidationResult): {
  pinecone?: string;
  googleSearch?: string;
  visionAI?: string;
  knowledgeGraph?: string;
  embeddings?: string;
} {
  const display: Record<string, string> = {};

  // Pinecone
  if (result.sources.pinecone) {
    const p = result.sources.pinecone;
    if (p.match) {
      display.pinecone = `✅ Match found (${(p.similarity! * 100).toFixed(0)}% similarity)${p.is_global ? ' - Global code' : ''}`;
    } else {
      display.pinecone = '❌ No match found';
    }
  }

  // Google Search
  if (result.sources.google_search_a || result.sources.google_search_b) {
    const searchA = result.sources.google_search_a?.results_count || 0;
    const searchB = result.sources.google_search_b?.results_count || 0;
    display.googleSearch = `Search A: ${searchA} results | Search B: ${searchB} results`;
  }

  // Vision AI
  if (result.sources.vision_ai) {
    const v = result.sources.vision_ai;
    const brandsDetected = Object.keys(v.brands_detected || {}).length;
    if (brandsDetected > 0) {
      const topBrand = v.dominant_brand;
      const topFreq = ((v.dominant_frequency || 0) * 100).toFixed(0);
      display.visionAI = `✅ ${brandsDetected} brands detected | Top: ${topBrand} (${topFreq}%)`;
    } else {
      display.visionAI = '❌ No brands detected in images';
    }
  }

  // Knowledge Graph
  if (result.sources.knowledge_graph?.user_text) {
    const kg = result.sources.knowledge_graph.user_text;
    if (kg.verified) {
      display.knowledgeGraph = `✅ Verified entity: ${kg.type || 'unknown type'}${kg.category ? ` | Category: ${kg.category}` : ''}`;
    } else {
      display.knowledgeGraph = '❌ Entity not found';
    }
  }

  // Embeddings
  if (result.sources.embeddings) {
    const similarities = Object.entries(result.sources.embeddings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    if (similarities.length > 0) {
      display.embeddings = similarities
        .map(([brand, sim]) => `${brand}: ${(sim * 100).toFixed(0)}%`)
        .join(' | ');
    }
  }

  return display;
}
