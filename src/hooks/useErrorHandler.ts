import { useCallback } from 'react';
import { toast } from 'sonner';
import { errorLogger } from '../lib/errorLogger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    logError = true,
    fallbackMessage = 'An error occurred',
    onError
  } = options;

  const handleError = useCallback((error: unknown, context?: string) => {
    const err = error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error');

    // Log error
    if (logError) {
      console.error(`Error in ${context || 'unknown context'}:`, err);
      errorLogger.log(err, undefined, { context });
    }

    // Show toast
    if (showToast) {
      toast.error(err.message || fallbackMessage);
    }

    // Call custom handler
    onError?.(err);

    return err;
  }, [showToast, logError, fallbackMessage, onError]);

  const wrapAsync = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T => {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        throw error;
      }
    }) as T;
  }, [handleError]);

  return { handleError, wrapAsync };
}
