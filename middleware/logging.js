/**
 * Logging Middleware
 *
 * Structured JSON logging with request IDs
 */
import { randomUUID } from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Structured logger (JSON format)
 */
export const log = {
  info: (msg, meta) =>
    console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), msg, ...meta })),
  warn: (msg, meta) =>
    console.warn(JSON.stringify({ level: 'warn', time: new Date().toISOString(), msg, ...meta })),
  error: (msg, meta, err) => {
    const safeErr = err
      ? {
          name: err.name,
          message: err.message,
          stack: isProd ? undefined : err.stack?.split('\n').slice(0, 2).join('\n'),
        }
      : undefined;
    console.error(
      JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        msg,
        ...meta,
        error: safeErr,
      })
    );
  },
};

/**
 * In-memory ring buffer for recent logs
 */
const ringLogs = [];
const MAX_LOGS = 500;

function pushLog(entry) {
  ringLogs.push(entry);
  if (ringLogs.length > MAX_LOGS) ringLogs.shift();
}

/**
 * Intercept console methods to populate ring buffer
 */
export function setupLogBuffer() {
  ['log', 'info', 'warn', 'error'].forEach(m => {
    const orig =
      console[m] instanceof Function ? console[m].bind(console) : console.log.bind(console);
    console[m] = (...args) => {
      try {
        pushLog({
          level: m === 'log' ? 'info' : m,
          time: new Date().toISOString(),
          text: args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
        });
      } catch (_) {}
      return orig(...args);
    };
  });
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('x-request-id', req.requestId);
  if (!isProd) {
    log.info('request', { id: req.requestId, method: req.method, path: req.path });
  }
  next();
}

/**
 * Debug logs endpoint (development only)
 */
export function configureDebugLogs(app, log) {
  if (!isProd && process.env.ENABLE_DEBUG_LOGS !== 'false') {
    app.get('/api/debug/logs', (req, res) => {
      const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
      return res.json({ id: req.requestId, logs: ringLogs.slice(-limit) });
    });
    log.info('⚠️  Debug logs endpoint enabled (development only)');
  }
}
