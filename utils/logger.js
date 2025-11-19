/**
 * Backend Logger Utility
 * Replaces console.log with structured logging
 *
 * Features:
 * - Structured JSON logging
 * - Environment-aware (dev vs prod)
 * - Performance tracking
 * - Request correlation
 */

const isProd = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════
// Core Logger
// ═══════════════════════════════════════════════════════════

class Logger {
  constructor(component = 'App') {
    this.component = component;
  }

  _log(level, message, meta = {}, error = null) {
    const entry = {
      level,
      time: new Date().toISOString(),
      component: this.component,
      msg: message,
      ...meta,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: isProd ? undefined : error.stack?.split('\n').slice(0, 3).join('\n'),
      };
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        if (!isProd) console.log(output);
        break;
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }

  info(message, meta = {}) {
    this._log('info', message, meta);
  }

  warn(message, meta = {}, error = null) {
    this._log('warn', message, meta, error);
  }

  error(message, meta = {}, error = null) {
    this._log('error', message, meta, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext) {
    const childLogger = new Logger(this.component);
    childLogger.defaultMeta = { ...this.defaultMeta, ...additionalContext };
    return childLogger;
  }

  /**
   * Measure execution time of async function
   */
  async time(label, fn, meta = {}) {
    const start = Date.now();
    this.debug(`${label} - started`, meta);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} - completed`, { ...meta, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} - failed`, { ...meta, durationMs: duration }, error);
      throw error;
    }
  }

  /**
   * Create a timer that can be ended manually
   */
  timer(label, meta = {}) {
    const start = Date.now();
    return {
      end: (message) => {
        const duration = Date.now() - start;
        this.info(message || `${label} completed`, { ...meta, durationMs: duration });
        return duration;
      },
      fail: (error, message) => {
        const duration = Date.now() - start;
        this.error(message || `${label} failed`, { ...meta, durationMs: duration }, error);
        return duration;
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════

/**
 * Create a logger for a specific component/module
 */
export function createLogger(component) {
  return new Logger(component);
}

/**
 * Create logger from request (Express middleware)
 */
export function requestLogger(req) {
  const logger = new Logger(req.path);
  logger.defaultMeta = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  };
  return logger;
}

// ═══════════════════════════════════════════════════════════
// Default Logger Instance
// ═══════════════════════════════════════════════════════════

const defaultLogger = new Logger('App');

export const logger = {
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  warn: (msg, meta, err) => defaultLogger.warn(msg, meta, err),
  error: (msg, meta, err) => defaultLogger.error(msg, meta, err),

  // Utilities
  time: (label, fn, meta) => defaultLogger.time(label, fn, meta),
  timer: (label, meta) => defaultLogger.timer(label, meta),
  child: (context) => defaultLogger.child(context),

  // Factory
  create: createLogger,
  fromRequest: requestLogger,
};

export default logger;
