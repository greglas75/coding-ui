interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  log(error: Error, errorInfo?: any, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    // Add to local logs
    this.logs.push(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error('🔴 Error logged:', errorLog);
    }

    // TODO: Send to external service (Sentry, LogRocket, etc.)
    // this.sendToService(errorLog);

    // Save to localStorage for debugging
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save error logs to localStorage');
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('error_logs');
  }

  // TODO: Implement sending to error tracking service (Sentry, custom API, etc.)
  // private async _sendToService(_errorLog: ErrorLog) {
  //   // Example: Sentry
  //   // Sentry.captureException(new Error(errorLog.message), {
  //   //   extra: errorLog
  //   // });

  //   // Example: Custom API
  //   // await fetch('/api/errors', {
  //   //   method: 'POST',
  //   //   body: JSON.stringify(errorLog)
  //   // });
  // }
}

export const errorLogger = new ErrorLogger();
