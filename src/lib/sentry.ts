/**
 * 📊 Sentry Error Tracking Utilities
 *
 * Helper functions for Sentry integration.
 *
 * Benefits:
 * - Automatic error tracking in production
 * - User action breadcrumbs
 * - Performance monitoring
 * - Session replay for debugging
 */

// TODO: Install @sentry/react to enable error tracking
// import * as Sentry from '@sentry/react';
import { simpleLogger } from '../utils/logger';

interface SentryStub {
  addBreadcrumb: (breadcrumb: unknown) => void;
  captureException: (error: unknown, context?: unknown) => void;
  captureMessage: (message: string, options?: unknown) => void;
  setUser: (user: unknown) => void;
  setContext: (key: string, data: unknown) => void;
  startSpan: <T>(options: unknown, callback: () => T) => T;
}

const Sentry: SentryStub = {
  addBreadcrumb: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setContext: () => {},
  startSpan: (_options, callback) => callback(),
};

/**
 * Check if Sentry is initialized
 */
export function isSentryEnabled(): boolean {
  return false; // Disabled until @sentry/react is installed
  // return !!import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD;
}

/**
 * Add breadcrumb for user action
 *
 * Usage:
 * ```ts
 * trackAction('category', 'create', { categoryId: 123, name: 'Fashion' });
 * ```
 */
export function trackAction(
  category: string,
  action: string,
  data?: Record<string, unknown>
) {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category: `user-${category}`,
    message: `User ${action}`,
    level: 'info',
    data: data || {},
  });
}

/**
 * Track navigation
 */
export function trackNavigation(from: string, to: string) {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
  });
}

/**
 * Track API call
 */
export function trackAPICall(
  method: string,
  endpoint: string,
  status: 'success' | 'error',
  duration?: number
) {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: status === 'error' ? 'error' : 'info',
    data: {
      status,
      duration: duration ? `${duration}ms` : undefined,
    },
  });
}

/**
 * Track Supabase query
 */
export function trackSupabaseQuery(
  table: string,
  operation: string,
  status: 'success' | 'error',
  duration?: number
) {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category: 'database',
    message: `${operation} on ${table}`,
    level: status === 'error' ? 'error' : 'info',
    data: {
      table,
      operation,
      status,
      duration: duration ? `${duration}ms` : undefined,
    },
  });

  // Track slow queries (>3s)
  if (duration && duration > 3000) {
    Sentry.captureMessage(`Slow Supabase query: ${operation} on ${table}`, {
      level: 'warning',
      tags: {
        type: 'performance',
        table,
        operation,
      },
      extra: {
        duration,
      },
    });
  }
}

/**
 * Set user context
 */
export function setUserContext(user: {
  id: string;
  role?: string;
  [key: string]: unknown;
}) {
  if (!isSentryEnabled()) return;

  Sentry.setUser({
    id: user.id,
    // Don't send email or other PII
    role: user.role,
  });
}

/**
 * Set custom context (current category, filters, etc.)
 */
export function setCustomContext(key: string, data: Record<string, unknown>) {
  if (!isSentryEnabled()) return;

  Sentry.setContext(key, data);
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (!isSentryEnabled()) return;

  Sentry.setUser(null);
}

/**
 * Manually capture exception
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!isSentryEnabled()) {
    simpleLogger.error('Error (Sentry disabled):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message (for warnings, info)
 */
export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' = 'info',
  context?: Record<string, unknown>
) {
  if (!isSentryEnabled()) return;

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Start performance span
 *
 * Usage:
 * ```ts
 * const span = startSpan('load-category', () => {
 *   // ... do work ...
 * });
 * ```
 */
export function startSpan<T>(name: string, callback: () => T): T {
  if (!isSentryEnabled()) {
    return callback();
  }

  return Sentry.startSpan({ name }, callback);
}

/**
 * Track React Query errors
 */
export function trackQueryError(
  queryKey: string[],
  error: Error,
  retryCount: number
) {
  if (!isSentryEnabled()) return;

  Sentry.addBreadcrumb({
    category: 'react-query',
    message: `Query failed: ${queryKey.join('/')}`,
    level: 'error',
    data: {
      queryKey: queryKey.join('/'),
      error: error.message,
      retryCount,
    },
  });

  // Only capture if all retries exhausted
  if (retryCount >= 3) {
    Sentry.captureException(error, {
      tags: {
        type: 'react-query',
        queryKey: queryKey.join('/'),
      },
      extra: {
        retryCount,
      },
    });
  }
}
