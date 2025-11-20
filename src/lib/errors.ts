/**
 * Centralized error handling utilities
 *
 * Provides consistent error handling patterns across the application:
 * - Type-safe error guards
 * - Error transformation
 * - Logging integration
 * - User-friendly error messages
 */

import { toast } from 'sonner';
import { errorLogger } from './errorLogger';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// Error Types & Interfaces
// ═══════════════════════════════════════════════════════════════

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: ErrorContext;
  isOperational?: boolean; // true = expected error, false = programming error
}

export interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
  code?: string;
}

export interface SupabaseErrorLike {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ═══════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════

/**
 * Check if error is an axios-like error
 */
export function isAxiosError(error: unknown): error is AxiosErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'code' in error)
  );
}

/**
 * Check if error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    ('code' in error || 'details' in error)
  );
}

/**
 * Check if error is an abort error (cancelled request)
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return (
    error.message?.includes('Network Error') ||
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('ECONNREFUSED')
  );
}

// ═══════════════════════════════════════════════════════════════
// Error Message Extraction
// ═══════════════════════════════════════════════════════════════

/**
 * Extract user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  // Handle null/undefined
  if (!error) return fallback;

  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle Axios errors
  if (isAxiosError(error)) {
    // Try response data message first
    const responseMessage = error.response?.data?.message || error.response?.data?.error;
    if (responseMessage) return responseMessage;

    // Network errors
    if (isNetworkError(error)) {
      return 'Cannot connect to server. Please check your internet connection.';
    }

    // Rate limiting
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Authentication failed. Please check your credentials.';
    }

    // Server errors
    if (error.response?.status && error.response.status >= 500) {
      return 'Server error occurred. Please try again in a few moments.';
    }

    // Fall back to axios message
    if (error.message) return error.message;
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    const parts: string[] = [error.message];
    if (error.details) parts.push(error.details);
    if (error.hint) parts.push(`Hint: ${error.hint}`);
    return parts.join(' - ');
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle objects with message property
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }

  // Fallback
  return fallback;
}

/**
 * Extract error code from any error type
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isAxiosError(error)) {
    return error.code || error.response?.status?.toString();
  }

  if (isSupabaseError(error)) {
    return error.code;
  }

  if (error instanceof Error && 'code' in error) {
    return (error as { code: unknown }).code as string;
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════
// Error Handling Functions
// ═══════════════════════════════════════════════════════════════

export interface HandleErrorOptions {
  /** Show toast notification to user (default: true) */
  showToast?: boolean;
  /** Log error to console and error logger (default: true) */
  logError?: boolean;
  /** Custom fallback message */
  fallbackMessage?: string;
  /** Toast duration in milliseconds */
  toastDuration?: number;
  /** Additional context for logging */
  context?: ErrorContext;
  /** Silent mode - no toast or logging (useful for expected errors) */
  silent?: boolean;
}

/**
 * Central error handler - use this for all error handling
 *
 * @example
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, {
 *     context: { component: 'UserProfile', action: 'save' },
 *     fallbackMessage: 'Failed to save profile'
 *   });
 * }
 */
export function handleError(error: unknown, options: HandleErrorOptions = {}): void {
  const {
    showToast = true,
    logError = true,
    fallbackMessage = 'An unexpected error occurred',
    toastDuration = 5000,
    context,
    silent = false,
  } = options;

  // Silent mode
  if (silent) return;

  // Skip abort errors (cancelled requests)
  if (isAbortError(error)) {
    if (logError) {
      simpleLogger.info('⏹️ Request cancelled');
    }
    return;
  }

  const message = getErrorMessage(error, fallbackMessage);
  const code = getErrorCode(error);

  // Log error
  if (logError) {
    const contextStr = context?.component || context?.action || 'unknown';
    simpleLogger.error(`❌ Error in ${contextStr}:`, error);

    if (error instanceof Error) {
      errorLogger.log(error, undefined, context);
    }
  }

  // Show toast
  if (showToast) {
    toast.error(message, {
      duration: toastDuration,
      description: code ? `Error code: ${code}` : undefined,
    });
  }
}

/**
 * Wrap an async function with error handling
 *
 * @example
 * const saveUser = withErrorHandling(
 *   async (user: User) => {
 *     return await api.saveUser(user);
 *   },
 *   { context: { component: 'UserForm', action: 'save' } }
 * );
 */
export function withErrorHandling<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options: HandleErrorOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw so caller can handle if needed
    }
  }) as T;
}

/**
 * Try an async operation with error handling
 * Returns [error, data] tuple (similar to Go error handling)
 *
 * @example
 * const [error, user] = await tryAsync(
 *   () => api.getUser(userId),
 *   { fallbackMessage: 'Failed to load user' }
 * );
 *
 * if (error) {
 *   // Handle error
 *   return;
 * }
 *
 * // Use user data
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  options: HandleErrorOptions = {}
): Promise<[Error | null, T | null]> {
  try {
    const data = await fn();
    return [null, data];
  } catch (error) {
    handleError(error, options);
    const err = error instanceof Error ? error : new Error(getErrorMessage(error));
    return [err, null];
  }
}

// ═══════════════════════════════════════════════════════════════
// Error Factory Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Create an application error with context
 */
export function createAppError(
  message: string,
  code?: string,
  context?: ErrorContext,
  isOperational = true
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.context = context;
  error.isOperational = isOperational;
  return error;
}

/**
 * Create a validation error
 */
export function createValidationError(
  message: string,
  field?: string,
  context?: ErrorContext
): AppError {
  return createAppError(
    message,
    'VALIDATION_ERROR',
    { ...context, metadata: { ...context?.metadata, field } },
    true
  );
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  resource: string,
  id?: string | number,
  context?: ErrorContext
): AppError {
  return createAppError(
    `${resource} not found${id ? `: ${id}` : ''}`,
    'NOT_FOUND',
    { ...context, metadata: { ...context?.metadata, resource, id } },
    true
  );
}

/**
 * Create an unauthorized error
 */
export function createUnauthorizedError(
  message = 'Unauthorized',
  context?: ErrorContext
): AppError {
  const error = createAppError(message, 'UNAUTHORIZED', context, true);
  error.statusCode = 401;
  return error;
}
