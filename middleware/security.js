/**
import logger from '../utils/logger.js';
 * Security Middleware
 *
 * Helmet, CORS, CSRF protection
 */
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const isProd = process.env.NODE_ENV === 'production';
const enableCsp = isProd || process.env.ENABLE_CSP === 'true';

/**
 * Configure Helmet security headers
 */
export function configureHelmet(port) {
  return helmet({
    contentSecurityPolicy: enableCsp
      ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", `http://localhost:${port}`],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginResourcePolicy: isProd ? { policy: "same-origin" } : false,
    crossOriginOpenerPolicy: isProd ? { policy: "same-origin" } : false,
  });
}

/**
 * Configure CORS
 */
export function configureCors(log) {
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : undefined;

  if (isProd && (!corsOrigins || corsOrigins.length === 0)) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  return cors({
    origin: isProd ? corsOrigins : '*',
    credentials: !isProd
  });
}

/**
 * Configure CSRF protection
 */
export async function configureCsrf(app, log) {
  const enableCsrf = isProd || process.env.ENABLE_CSRF !== 'false';

  log.info('CSRF protection status', {
    enabled: enableCsrf,
    isProd,
    envVar: process.env.ENABLE_CSRF,
  });

  if (!enableCsrf) {
    return;
  }

  app.use(cookieParser());

  try {
    const { doubleCsrf } = await import('csrf-csrf');
    const { doubleCsrfProtection } = doubleCsrf({
      getSecret: () => process.env.CSRF_SECRET || 'default-secret-change-in-production',
      cookieName: '__Host-psifi.x-csrf-token',
      cookieOptions: {
        httpOnly: true,
        sameSite: isProd ? 'strict' : 'lax',
        secure: isProd,
        path: '/',
      },
      size: 64,
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    });
    app.use(doubleCsrfProtection);
    log.info('✅ CSRF protection enabled');
  } catch (e) {
    if (isProd) {
      log.error('❌ CSRF required in production but failed to load', { id: 'startup' }, e);
      process.exit(1);
    }
    log.warn('⚠️  CSRF enabled but csrf-csrf not installed', { id: 'startup' });
  }
}

/**
 * API Authentication middleware
 */
export function authenticate(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', id: req.requestId });
  }

  if (isProd && process.env.API_ACCESS_TOKEN && token !== process.env.API_ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Forbidden', id: req.requestId });
  }

  req.user = { id: 'service-user' };
  next();
}

/**
 * Configure API authentication
 */
export function configureApiAuth(app, log) {
  const enableApiAuth = isProd || process.env.ENABLE_API_AUTH === 'true';

  if (enableApiAuth) {
    app.use('/api', authenticate);
    if (isProd) {
      log.info('🔒 API authentication REQUIRED (production mode)');
    } else {
      log.info('🔓 API authentication enabled (development mode)');
    }
  } else {
    log.warn('⚠️  API authentication DISABLED (development only!)');
  }
}
