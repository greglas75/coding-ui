// ═══════════════════════════════════════════════════════════════
// 🌐 API Client for Express Backend (Legacy - Use services/apiClient.ts)
// ═══════════════════════════════════════════════════════════════

import type { FiltersState } from '../hooks/useFilters';
import {
    checkAPIHealth as newCheckAPIHealth,
    fetchFilteredAnswers as newFetchFilteredAnswers,
    getAPIBaseURL as newGetAPIBaseURL,
    isAPIAvailable as newIsAPIAvailable,
    testGPT as newTestGPT
} from '../services/apiClient';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface FilteredAnswer {
  id: number;
  answer_text: string;
  translation?: string;
  translation_en?: string;
  language: string | null;
  country: string | null;
  quick_status: string | null;
  general_status: string | null;
  selected_code: string | null;
  ai_suggested_code: string | null;
  category_id: number | null;
  coding_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface FilterResponse {
  success: boolean;
  count: number;
  results: FilteredAnswer[];
  mode: 'mock' | 'supabase';
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  supabaseConfigured: boolean;
}

// ───────────────────────────────────────────────────────────────
// API Functions
// ───────────────────────────────────────────────────────────────

/**
 * Fetch filtered answers from the API (Legacy wrapper)
 *
 * @param filters - Filter state from useFilters hook
 * @param categoryId - Optional category ID to filter by
 * @returns Filtered answers
 *
 * @example
 * ```tsx
 * const { filters } = useFilters();
 * const results = await fetchFilteredAnswers(filters, 1);
 * console.log('Found:', results.count, 'answers');
 * ```
 */
export async function fetchFilteredAnswers(
  filters: Partial<FiltersState>,
  categoryId?: number
): Promise<FilterResponse> {
  // Use new apiClient with timeout, retry, and error handling
  return newFetchFilteredAnswers(filters, categoryId);
}

/**
 * Check API health status (Legacy wrapper)
 *
 * @returns Health status
 */
export async function checkAPIHealth(): Promise<HealthResponse> {
  // Use new apiClient with timeout, retry, and error handling
  return newCheckAPIHealth();
}

/**
 * Test GPT integration (Legacy wrapper)
 *
 * @param messages - Chat messages
 * @param model - Model name (default: gpt-4o-mini)
 * @returns GPT response
 */
export async function testGPT(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o-mini'
) {
  // Use new apiClient with timeout, retry, and error handling
  return newTestGPT(messages, model);
}

// ───────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────

/**
 * Check if API server is running (Legacy wrapper)
 *
 * @returns True if server is reachable
 */
export async function isAPIAvailable(): Promise<boolean> {
  // Use new apiClient with timeout, retry, and error handling
  return newIsAPIAvailable();
}

/**
 * Get API base URL (Legacy wrapper)
 *
 * @returns API base URL
 */
export function getAPIBaseURL(): string {
  // Use new apiClient configuration
  return newGetAPIBaseURL();
}

// ───────────────────────────────────────────────────────────────
// Export all
// ───────────────────────────────────────────────────────────────

export default {
  fetchFilteredAnswers,
  checkAPIHealth,
  testGPT,
  isAPIAvailable,
  getAPIBaseURL,
};
