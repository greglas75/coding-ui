/**
 * Types for OpenAI API Integration
 */

import type { AiCodeSuggestion } from '../../types';
import type { MultiSourceValidationResult } from '../../services/multiSourceValidator';

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
  multiSourceResult?: MultiSourceValidationResult; // Full multi-source validation result
}

