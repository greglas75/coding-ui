// ═══════════════════════════════════════════════════════════════
// 📝 Centralized Logging System
// Supports: Console, Sentry, LogRocket, Custom Services
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/react';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

// ───────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────

interface LoggerConfig {
  enableConsole: boolean;
  enableSentry: boolean;
  enableLogRocket: boolean;
  minLevel: LogLevel;
  maxStoredLogs: number;
  persistLogs: boolean;
}

const config: LoggerConfig = {
  enableConsole: true,
  enableSentry: import.meta.env.PROD, // Only in production
  enableLogRocket: false, // Enable when LogRocket configured
  minLevel: import.meta.env.DEV ? 'debug' : 'info',
  maxStoredLogs: 1000,
  persistLogs: true,
};

// ───────────────────────────────────────────────────────────────
// Storage
// ───────────────────────────────────────────────────────────────

const logs: LogEntry[] = [];
const STORAGE_KEY = 'app-logs';

// Load persisted logs
if (config.persistLogs && typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      logs.push(...parsed.slice(-config.maxStoredLogs));
    }
  } catch (error) {
    console.warn('Failed to load persisted logs:', error);
  }
}

// Save logs to localStorage
function persistLogs() {
  if (!config.persistLogs || typeof window === 'undefined') return;

  try {
    const toStore = logs.slice(-config.maxStoredLogs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.warn('Failed to persist logs:', error);
  }
}

// ───────────────────────────────────────────────────────────────
// Level Utilities
// ───────────────────────────────────────────────────────────────

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.minLevel];
}

// ───────────────────────────────────────────────────────────────
// Console Formatting
// ───────────────────────────────────────────────────────────────

const levelEmojis: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '💀',
};

const levelColors: Record<LogLevel, string> = {
  debug: 'color: #6B7280',
  info: 'color: #3B82F6',
  warn: 'color: #F59E0B',
  error: 'color: #EF4444',
  fatal: 'color: #DC2626; font-weight: bold',
};

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const emoji = levelEmojis[level];
  const contextStr = context?.component ? `[${context.component}]` : '';
  const actionStr = context?.action ? `{${context.action}}` : '';

  return `${emoji} ${contextStr}${actionStr} ${message}`;
}

// ───────────────────────────────────────────────────────────────
// Core Logging Function
// ───────────────────────────────────────────────────────────────

function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  if (!shouldLog(level)) return;

  // Create log entry
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error,
  };

  // Store log
  logs.push(entry);
  if (logs.length > config.maxStoredLogs) {
    logs.shift();
  }
  persistLogs();

  // Console output
  if (config.enableConsole) {
    const formatted = formatMessage(level, message, context);
    const style = levelColors[level];

    switch (level) {
      case 'debug':
        console.debug(`%c${formatted}`, style, context?.extra || '');
        break;
      case 'info':
        console.info(`%c${formatted}`, style, context?.extra || '');
        break;
      case 'warn':
        console.warn(`%c${formatted}`, style, context?.extra || '');
        if (error) console.warn(error);
        break;
      case 'error':
      case 'fatal':
        console.error(`%c${formatted}`, style, context?.extra || '');
        if (error) console.error(error);
        break;
    }
  }

  // Sentry integration
  if (config.enableSentry && (level === 'error' || level === 'fatal')) {
    try {
      Sentry.captureException(error || new Error(message), {
        level: level === 'fatal' ? 'fatal' : 'error',
        tags: {
          component: context?.component,
          action: context?.action,
          ...context?.tags,
        },
        contexts: {
          custom: context?.extra,
        },
      });
    } catch (sentryError) {
      console.error('Failed to send to Sentry:', sentryError);
    }
  }

  // LogRocket integration (future)
  if (config.enableLogRocket) {
    try {
      // TODO: Integrate with LogRocket
      // LogRocket.log(level, message, context);
    } catch (logRocketError) {
      console.error('Failed to send to LogRocket:', logRocketError);
    }
  }
}

// ───────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────

/**
 * Log debug message (development only)
 */
export function logDebug(message: string, context?: LogContext) {
  log('debug', message, context);
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: LogContext) {
  log('info', message, context);
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: LogContext, error?: Error) {
  log('warn', message, context, error);
}

/**
 * Log error message
 */
export function logError(message: string, context?: LogContext, error?: Error) {
  log('error', message, context, error);
}

/**
 * Log fatal error (critical)
 */
export function logFatal(message: string, context?: LogContext, error?: Error) {
  log('fatal', message, context, error);
}

// ───────────────────────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────────────────────

/**
 * Get all stored logs
 */
export function getLogs(): LogEntry[] {
  return [...logs];
}

/**
 * Get logs by level
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return logs.filter(log => log.level === level);
}

/**
 * Get recent logs
 */
export function getRecentLogs(count: number = 50): LogEntry[] {
  return logs.slice(-count);
}

/**
 * Clear all logs
 */
export function clearLogs() {
  logs.length = 0;
  if (config.persistLogs && typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify(logs, null, 2);
}

/**
 * Export logs as CSV
 */
export function exportLogsCSV(): string {
  const headers = ['Timestamp', 'Level', 'Component', 'Action', 'Message'];
  const rows = logs.map(log => [
    log.timestamp,
    log.level,
    log.context?.component || '',
    log.context?.action || '',
    log.message,
  ]);

  return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
}

/**
 * Download logs as file
 */
export function downloadLogs(format: 'json' | 'csv' = 'json') {
  const content = format === 'json' ? exportLogs() : exportLogsCSV();
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `app-logs-${new Date().toISOString()}.${format}`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Configure logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>) {
  Object.assign(config, newConfig);
}

/**
 * Get logger configuration
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return { ...config };
}

// ───────────────────────────────────────────────────────────────
// Performance Logging
// ───────────────────────────────────────────────────────────────

/**
 * Log API call
 */
export function logAPICall(
  method: string,
  endpoint: string,
  duration: number,
  status: number,
  success: boolean
) {
  const level: LogLevel = success ? 'info' : 'error';
  const emoji = success ? '✅' : '❌';

  log(level, `${emoji} API ${method} ${endpoint} (${status}) - ${duration}ms`, {
    component: 'API Client',
    action: `${method} ${endpoint}`,
    tags: {
      method,
      endpoint,
      status: String(status),
    },
    extra: {
      duration,
      success,
    },
  });
}

/**
 * Log component render
 */
export function logRender(component: string, duration: number, renderCount?: number) {
  if (duration > 16) {
    logWarn(`Slow render: ${duration.toFixed(2)}ms`, {
      component,
      action: 'render',
      extra: { duration, renderCount },
    });
  } else if (import.meta.env.DEV) {
    logDebug(`Render: ${duration.toFixed(2)}ms`, {
      component,
      action: 'render',
      extra: { duration, renderCount },
    });
  }
}

// ───────────────────────────────────────────────────────────────
// Breadcrumb Tracking (for Sentry)
// ───────────────────────────────────────────────────────────────

/**
 * Add breadcrumb for user action tracking
 */
export function addBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  if (config.enableSentry) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  // Also log locally
  logDebug(message, {
    action: category,
    extra: data,
  });
}

// ───────────────────────────────────────────────────────────────
// Initialize
// ───────────────────────────────────────────────────────────────

export function initLogger() {
  console.log('📝 Logger initialized', {
    console: config.enableConsole,
    sentry: config.enableSentry,
    logRocket: config.enableLogRocket,
    minLevel: config.minLevel,
  });

  // Set up global error handler
  if (typeof window !== 'undefined') {
    window.addEventListener('error', event => {
      logError(
        'Uncaught error',
        {
          component: 'Global',
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
        event.error
      );
    });

    window.addEventListener('unhandledrejection', event => {
      logError(
        'Unhandled promise rejection',
        {
          component: 'Global',
          extra: {
            reason: event.reason,
          },
        },
        event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      );
    });
  }

  logInfo('Application started', {
    component: 'App',
    extra: {
      environment: import.meta.env.MODE,
      timestamp: new Date().toISOString(),
    },
  });
}

// ───────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────

/**
 * Create logger for specific component
 */
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      logDebug(message, { component: componentName, extra }),

    info: (message: string, extra?: Record<string, unknown>) =>
      logInfo(message, { component: componentName, extra }),

    warn: (message: string, extra?: Record<string, unknown>) =>
      logWarn(message, { component: componentName, extra }),

    error: (message: string, error?: Error, extra?: Record<string, unknown>) =>
      logError(message, { component: componentName, extra }, error),

    fatal: (message: string, error?: Error, extra?: Record<string, unknown>) =>
      logFatal(message, { component: componentName, extra }, error),
  };
}

/**
 * Measure and log function execution time
 */
export async function logAsync<T>(
  message: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = performance.now();

  try {
    logDebug(`${message} - started`, context);
    const result = await fn();
    const duration = performance.now() - start;

    logInfo(`${message} - completed in ${duration.toFixed(0)}ms`, {
      ...context,
      extra: { ...context?.extra, duration },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    logError(
      `${message} - failed after ${duration.toFixed(0)}ms`,
      {
        ...context,
        extra: { ...context?.extra, duration },
      },
      error instanceof Error ? error : new Error(String(error))
    );

    throw error;
  }
}

/**
 * Create timer for performance logging
 */
export function createTimer(label: string, context?: LogContext) {
  const start = performance.now();

  return {
    end: (message?: string) => {
      const duration = performance.now() - start;
      logInfo(message || `${label} completed`, {
        ...context,
        extra: { ...context?.extra, duration, label },
      });
      return duration;
    },

    fail: (error: Error, message?: string) => {
      const duration = performance.now() - start;
      logError(
        message || `${label} failed`,
        {
          ...context,
          extra: { ...context?.extra, duration, label },
        },
        error
      );
      return duration;
    },
  };
}

// ───────────────────────────────────────────────────────────────
// Export default logger object
// ───────────────────────────────────────────────────────────────

export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  fatal: logFatal,

  // Utilities
  getLogs,
  getLogsByLevel,
  getRecentLogs,
  clearLogs,
  exportLogs,
  exportLogsCSV,
  downloadLogs,

  // Configuration
  configure: configureLogger,
  getConfig: getLoggerConfig,

  // Helpers
  createComponentLogger,
  logAsync,
  createTimer,
  addBreadcrumb,

  // Performance
  logAPICall,
  logRender,

  // Initialization
  init: initLogger,
};

// Auto-initialize
if (typeof window !== 'undefined') {
  initLogger();
}

// ───────────────────────────────────────────────────────────────
// Simplified API for migration from console.log
// ───────────────────────────────────────────────────────────────

/**
 * Simple logger interface that only logs in development
 * Production: Errors go to Sentry, other logs are suppressed
 */
export const simpleLogger = {
  info: (msg: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.info(msg, ...args);
    }
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.warn(msg, ...args);
    }
  },
  error: (msg: string, ...args: unknown[]) => {
    if (import.meta.env.PROD) {
      // Extract error object if present
      const error = args.find(arg => arg instanceof Error);
      Sentry.captureException(error || new Error(msg));
    } else {
      console.error(msg, ...args);
    }
  },
  log: (msg: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(msg, ...args);
    }
  },
};

export default logger;
