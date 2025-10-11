import * as Sentry from '@sentry/react';
import { AlertTriangle, Bug, Home, RefreshCw, RotateCcw } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { logError, logFatal } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onReport?: (error: Error, errorInfo: any) => void;
  showReloadButton?: boolean;
  showReportButton?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  eventId?: string;
  isReporting?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to console
    console.error('🔴 Error caught by boundary:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);

    // Log to centralized logger
    const isFatal = error.message.toLowerCase().includes('fatal') ||
                     error.message.toLowerCase().includes('critical');

    if (isFatal) {
      logFatal('Component error boundary triggered', {
        component: 'ErrorBoundary',
        extra: {
          componentStack: errorInfo.componentStack,
          errorMessage: error.message,
        },
      }, error);
    } else {
      logError('Component error boundary triggered', {
        component: 'ErrorBoundary',
        extra: {
          componentStack: errorInfo.componentStack,
          errorMessage: error.message,
        },
      }, error);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to Sentry
    try {
      const eventId = Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: 'true',
        },
        level: isFatal ? 'fatal' : 'error',
      });

      console.log('📤 Error reported to Sentry:', eventId);
      this.setState({ errorInfo, eventId });
    } catch (sentryError) {
      console.error('Failed to report error to Sentry:', sentryError);
      this.setState({ errorInfo });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, eventId: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReport = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    this.setState({ isReporting: true });

    try {
      // Call custom report callback if provided
      if (this.props.onReport) {
        await this.props.onReport(this.state.error, this.state.errorInfo);
        console.log('✅ Error reported via custom callback');
      }

      // Show Sentry feedback dialog if available
      if (this.state.eventId) {
        Sentry.showReportDialog({
          eventId: this.state.eventId,
          title: 'Report a problem',
          subtitle: 'Help us improve by reporting this error',
          subtitle2: 'Our team will look into it as soon as possible.',
          labelName: 'Name',
          labelEmail: 'Email',
          labelComments: 'What happened?',
          labelClose: 'Close',
          labelSubmit: 'Submit',
        });
      }

      console.log('📧 Error report dialog shown');
    } catch (error) {
      console.error('Failed to show report dialog:', error);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <AlertTriangle
                size={64}
                className="mx-auto text-red-500 dark:text-red-400"
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {/* Error details (dev only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  Error Details:
                </p>
                <code className="text-xs text-red-700 dark:text-red-400 block overflow-auto">
                  {this.state.error.message}
                </code>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-red-700 dark:text-red-400 mt-2 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Reset component state and try again"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>

                {this.props.showReloadButton !== false && (
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    title="Reload the entire application"
                  >
                    <RotateCcw size={18} />
                    Reload App
                  </button>
                )}

                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Return to home page"
                >
                  <Home size={18} />
                  Go Home
                </button>
              </div>

              {/* Report Error Button */}
              {this.props.showReportButton !== false && this.state.eventId && (
                <button
                  onClick={this.handleReport}
                  disabled={this.state.isReporting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Report this error to our team"
                >
                  {this.state.isReporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Reporting...
                    </>
                  ) : (
                    <>
                      <Bug size={18} />
                      Report Error
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Event ID (for support) */}
            {this.state.eventId && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Error ID (for support):
                </p>
                <code className="text-xs font-mono text-gray-800 dark:text-gray-200 select-all">
                  {this.state.eventId}
                </code>
              </div>
            )}

            {/* Help text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              If this problem persists, please report it using the button above or contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
