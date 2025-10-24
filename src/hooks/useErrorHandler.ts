import * as Sentry from '@sentry/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { errorLogger } from '../lib/errorLogger';
import { logError as loggerError, simpleLogger } from '../utils/logger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
  reportToSentry?: boolean;
  context?: string;
  tags?: Record<string, string>;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    logError: shouldLogError = true,
    fallbackMessage = 'An error occurred',
    onError,
    reportToSentry = true,
    context: defaultContext,
    tags = {},
  } = options;

  const [lastError, setLastError] = useState<Error | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const handleError = useCallback((error: unknown, contextOverride?: string) => {
    const err = error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error');

    const finalContext = contextOverride || defaultContext || 'unknown context';

    // Log error
    if (shouldLogError) {
      simpleLogger.error(`❌ Error in ${finalContext}:`, err);
      errorLogger.log(err, undefined, { context: finalContext });

      // Log to centralized logger
      loggerError(err.message, {
        component: finalContext,
        tags: tags,
        extra: {
          errorCount: errorCount + 1,
        },
      }, err);
    }

    // Report to Sentry
    if (reportToSentry) {
      try {
        const eventId = Sentry.captureException(err, {
          tags: {
            context: finalContext,
            ...tags,
          },
          level: 'error',
          contexts: {
            custom: {
              errorCount: errorCount + 1,
              timestamp: new Date().toISOString(),
            },
          },
        });
        simpleLogger.info('📤 Error reported to Sentry:', eventId);
      } catch (sentryError) {
        simpleLogger.error('Failed to report error to Sentry:', sentryError);
      }
    }

    // Show toast
    if (showToast) {
      toast.error(err.message || fallbackMessage, {
        description: import.meta.env.DEV ? `Context: ${finalContext}` : undefined,
        action: import.meta.env.DEV ? {
          label: 'Details',
          onClick: () => simpleLogger.info('Error details:', err),
        } : undefined,
      });
    }

    // Update state
    setLastError(err);
    setErrorCount(prev => prev + 1);

    // Call custom handler
    onError?.(err);

    return err;
  }, [showToast, shouldLogError, fallbackMessage, onError, reportToSentry, defaultContext, tags, errorCount]);

  const wrapAsync = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    contextOverride?: string
  ): T => {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, contextOverride);
        throw error;
      }
    }) as T;
  }, [handleError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const resetErrorCount = useCallback(() => {
    setErrorCount(0);
  }, []);

  return {
    handleError,
    wrapAsync,
    lastError,
    errorCount,
    clearError,
    resetErrorCount,
  };
}
