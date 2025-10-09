// ═══════════════════════════════════════════════════════════════
// 🌐 API Client for Express Backend
// ═══════════════════════════════════════════════════════════════

import type { FiltersState } from '../hooks/useFilters';

const API_BASE_URL = 'http://localhost:3001';

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
 * Fetch filtered answers from the API
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
  try {
    const requestBody = {
      search: filters.search || '',
      status: filters.status || [],
      codes: filters.codes || [],
      language: filters.language || '',
      country: filters.country || '',
      categoryId: categoryId,
    };

    console.log('🔍 Fetching filtered answers:', requestBody);

    const response = await fetch(`${API_BASE_URL}/api/answers/filter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: FilterResponse = await response.json();
    console.log(`✅ Received ${data.count} results (mode: ${data.mode})`);

    return data;
  } catch (error) {
    console.error('❌ Filter API error:', error);
    throw error;
  }
}

/**
 * Check API health status
 *
 * @returns Health status
 */
export async function checkAPIHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
}

/**
 * Test GPT integration
 *
 * @param messages - Chat messages
 * @param model - Model name (default: gpt-4o-mini)
 * @returns GPT response
 */
export async function testGPT(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o-mini'
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gpt-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 500,
        temperature: 0,
        top_p: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ GPT test failed:', error);
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────

/**
 * Check if API server is running
 *
 * @returns True if server is reachable
 */
export async function isAPIAvailable(): Promise<boolean> {
  try {
    await checkAPIHealth();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get API base URL (useful for dynamic configuration)
 *
 * @returns API base URL
 */
export function getAPIBaseURL(): string {
  return API_BASE_URL;
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
