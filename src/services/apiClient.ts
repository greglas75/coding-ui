// ═══════════════════════════════════════════════════════════════
// 🌐 Centralized API Client with Advanced Error Handling
// ═══════════════════════════════════════════════════════════════

import type { ZodSchema } from 'zod';
import { trackAPICall } from '../lib/performanceMonitor';
import { logAPICall, logError as loggerError } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  response?: Response;
  isRetryable?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  schema?: ZodSchema; // Zod schema for automatic validation
}

// ───────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000, // 10 seconds
  retries: 2,
  retryDelay: 1000, // 1 second base delay
  headers: {
    'Content-Type': 'application/json',
  },
};

// ───────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000; // Add jitter
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: ApiError): boolean {
  if (!error.status) return false;

  // Retry on network errors, timeouts, and 5xx server errors
  return (
    error.status >= 500 ||
    error.status === 408 || // Request Timeout
    error.status === 429 || // Too Many Requests
    error.name === 'AbortError' ||
    error.name === 'TypeError' // Network error
  );
}

/**
 * Create AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Log error with context
 */
function logError(error: ApiError, context: string, attempt?: number): void {
  const prefix = attempt ? `[Attempt ${attempt}]` : '';
  console.error(`❌ ${prefix} API Error in ${context}:`, {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    url: error.response?.url,
    retryable: error.isRetryable,
  });
}

// ───────────────────────────────────────────────────────────────
// Main API Client Class
// ───────────────────────────────────────────────────────────────

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generic HTTP request method with retry logic and optional Zod validation
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.retries,
      signal,
      schema,
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.config.headers, ...headers };

    let lastError: ApiError | null = null;
    const apiCallStart = performance.now(); // Track start time

    // Retry loop
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const controller = createTimeoutController(timeout);
        const combinedSignal = signal ?
          this.combineAbortSignals([controller.signal, signal]) :
          controller.signal;

        const requestBody = body ?
          (body instanceof FormData ? body : JSON.stringify(body)) :
          undefined;

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: combinedSignal,
        });

        // Handle HTTP errors
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Ignore JSON parsing errors, use status text
          }

          const error: ApiError = new Error(errorMessage);
          error.status = response.status;
          error.statusText = response.statusText;
          error.response = response;
          error.isRetryable = isRetryableError(error);

          if (attempt <= retries && error.isRetryable) {
            logError(error, `${method} ${endpoint}`, attempt);
            lastError = error;

            // Wait before retry
            const delay = calculateBackoffDelay(attempt, this.config.retryDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }

        // Parse response
        let data: T;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text/')) {
          data = (await response.text()) as unknown as T;
        } else {
          data = (await response.blob()) as unknown as T;
        }

        // Validate with Zod schema if provided
        if (schema) {
          try {
            data = schema.parse(data) as T;
            console.log('✅ Data validated with Zod schema');
          } catch (validationError) {
            console.error('❌ Zod validation failed:', validationError);
            const error: ApiError = new Error(`Data validation failed: ${validationError}`);
            error.status = 500;
            error.statusText = 'Validation Error';
            error.response = response;
            error.isRetryable = false;
            throw error;
          }
        }

        // Track API call performance
        const apiCallDuration = performance.now() - apiCallStart;
        trackAPICall({
          endpoint,
          method,
          duration: apiCallDuration,
          status: response.status,
          success: true,
          timestamp: Date.now(),
          size: response.headers.get('content-length') ? parseInt(response.headers.get('content-length')!) : undefined,
        });

        // Log to centralized logger
        logAPICall(method, endpoint, apiCallDuration, response.status, true);

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };

      } catch (error) {
        const apiError: ApiError = error instanceof Error ?
          error as ApiError :
          new Error(String(error));

        apiError.isRetryable = isRetryableError(apiError);

        if (attempt <= retries && apiError.isRetryable) {
          logError(apiError, `${method} ${endpoint}`, attempt);
          lastError = apiError;

          // Wait before retry
          const delay = calculateBackoffDelay(attempt, this.config.retryDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed or non-retryable error
        logError(apiError, `${method} ${endpoint}`, attempt);

        // Track failed API call
        const apiCallDuration = performance.now() - apiCallStart;
        trackAPICall({
          endpoint,
          method,
          duration: apiCallDuration,
          status: apiError.status || 0,
          success: false,
          timestamp: Date.now(),
        });

        // Log to centralized logger
        logAPICall(method, endpoint, apiCallDuration, apiError.status || 0, false);
        loggerError(`API call failed: ${apiError.message}`, {
          component: 'API Client',
          action: `${method} ${endpoint}`,
          tags: {
            method,
            endpoint,
            status: String(apiError.status || 0),
          },
        }, apiError);

        throw apiError;
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort());
      }
    });

    return controller.signal;
  }

  // ───────────────────────────────────────────────────────────────
  // HTTP Method Helpers
  // ───────────────────────────────────────────────────────────────

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  // ───────────────────────────────────────────────────────────────
  // Configuration Methods
  // ───────────────────────────────────────────────────────────────

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  /**
   * Update default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ApiClientConfig> {
    return { ...this.config };
  }
}

// ───────────────────────────────────────────────────────────────
// Default Instance
// ───────────────────────────────────────────────────────────────

export const apiClient = new ApiClient();

// ───────────────────────────────────────────────────────────────
// Convenience Functions
// ───────────────────────────────────────────────────────────────

/**
 * GET request using default client
 */
export async function get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  const response = await apiClient.get<T>(endpoint, options);
  return response.data;
}

/**
 * POST request using default client
 */
export async function post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
  const response = await apiClient.post<T>(endpoint, body, options);
  return response.data;
}

/**
 * PUT request using default client
 */
export async function put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
  const response = await apiClient.put<T>(endpoint, body, options);
  return response.data;
}

/**
 * DELETE request using default client
 */
export async function del<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  const response = await apiClient.delete<T>(endpoint, options);
  return response.data;
}

/**
 * PATCH request using default client
 */
export async function patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
  const response = await apiClient.patch<T>(endpoint, body, options);
  return response.data;
}

// ───────────────────────────────────────────────────────────────
// Legacy API Functions (for backward compatibility)
// ───────────────────────────────────────────────────────────────

import type { FiltersState } from '../hooks/useFilters';

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

export interface GPTTestRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_completion_tokens: number;
  temperature: number;
  top_p: number;
}

export interface GPTTestResponse {
  choices: Array<{ message: { content: string } }>;
  usage: { total_tokens: number };
}

export interface FileUploadResponse {
  status: 'success' | 'error';
  imported: number;
  skipped: number;
  totalErrors?: number;
  errors?: string[];
  error?: string;
}

/**
 * Fetch filtered answers from the API
 */
export async function fetchFilteredAnswers(
  filters: Partial<FiltersState>,
  categoryId?: number
): Promise<FilterResponse> {
  const requestBody = {
    search: filters.search || '',
    status: filters.status || [],
    codes: filters.codes || [],
    language: filters.language || '',
    country: filters.country || '',
    categoryId: categoryId,
  };

  console.log('🔍 Fetching filtered answers:', requestBody);

  try {
    const data = await post<FilterResponse>('/api/answers/filter', requestBody);
    console.log(`✅ Received ${data.count} results (mode: ${data.mode})`);
    return data;
  } catch (error) {
    console.error('❌ Filter API error:', error);
    throw error;
  }
}

/**
 * Check API health status
 */
export async function checkAPIHealth(): Promise<HealthResponse> {
  try {
    return await get<HealthResponse>('/api/health');
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
}

/**
 * Test GPT integration
 */
export async function testGPT(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o-mini'
): Promise<GPTTestResponse> {
  try {
    return await post<GPTTestResponse>('/api/gpt-test', {
      model,
      messages,
      max_completion_tokens: 500,
      temperature: 0,
      top_p: 0.1,
    });
  } catch (error) {
    console.error('❌ GPT test failed:', error);
    throw error;
  }
}

/**
 * Upload file to backend with Zod validation
 */
export async function uploadFile(file: File, categoryId: number): Promise<FileUploadResponse> {
  // Import schema dynamically to avoid circular dependencies
  const { FileUploadResponseSchema } = await import('../schemas/importPackageSchema');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category_id', categoryId.toString());

  try {
    return await post<FileUploadResponse>('/api/file-upload', formData, {
      headers: {}, // Don't set Content-Type for FormData
      schema: FileUploadResponseSchema,
    });
  } catch (error) {
    console.error('❌ File upload failed:', error);
    throw error;
  }
}

/**
 * Check if API server is running
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
 */
export function getAPIBaseURL(): string {
  return apiClient.getConfig().baseUrl;
}

// ───────────────────────────────────────────────────────────────
// Export all
// ───────────────────────────────────────────────────────────────

export default {
  apiClient,
  get,
  post,
  put,
  delete: del,
  patch,
  fetchFilteredAnswers,
  checkAPIHealth,
  testGPT,
  uploadFile,
  isAPIAvailable,
  getAPIBaseURL,
};
