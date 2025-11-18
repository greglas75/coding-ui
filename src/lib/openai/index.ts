/**
 * OpenAI API Integration - Main Entry Point
 * Re-exports all public APIs
 */

// Types
export type {
  CategorizeRequest,
  CategorizeResponse,
  WebContext,
  ImageResult,
} from './types';

// Main functions
export { categorizeAnswer, batchCategorizeAnswers } from './categorize';

// Configuration
export { validateOpenAIConfig, getOpenAIStatus, DEFAULT_CATEGORIZATION_TEMPLATE } from './config';

// Provider utilities
export { detectProvider, getProviderAPIKey } from './provider';

// Validation
export { runMultiSourceValidation, buildMultiSourceResponse } from './validation';

// Web context
export { buildSearchQuery, fetchWebContextAndImages } from './webContext';

// Evidence scoring
export { calculateEvidenceScore } from './evidence';

// Prompts
export { buildSystemPrompt, formatCodes, buildAnswerSection } from './prompts';

// API calls
export { callClaudeAPI, callGeminiAPI, getAnthropicModelId } from './apiCalls';

