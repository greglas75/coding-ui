import { createClient } from '@supabase/supabase-js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import multer from 'multer';
import OpenAI from 'openai';
import Papa from 'papaparse';
import path from 'path';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import pricingFetcher from './server/pricing/pricingFetcher.js';
import codeframeRoutes from './routes/codeframe.js';

const app = express();
const port = 3001;
const isProd = process.env.NODE_ENV === 'production';

// Structured logger (JSON) and request id middleware
const log = {
  info: (msg, meta) => console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', time: new Date().toISOString(), msg, ...meta })),
  error: (msg, meta, err) => {
    const safeErr = err ? {
      name: err.name,
      message: err.message,
      stack: isProd ? undefined : err.stack?.split('\n').slice(0, 2).join('\n'),
    } : undefined;
    console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), msg, ...meta, error: safeErr }));
  },
};

// In-memory ring buffer for recent logs to expose via debug endpoint (visible in Cursor)
const ringLogs = [];
const MAX_LOGS = 500;
function pushLog(entry) {
  ringLogs.push(entry);
  if (ringLogs.length > MAX_LOGS) ringLogs.shift();
}
['log','info','warn','error'].forEach((m) => {
  const orig = console[m] instanceof Function ? console[m].bind(console) : console.log.bind(console);
  console[m] = (...args) => {
    try {
      pushLog({ level: m === 'log' ? 'info' : m, time: new Date().toISOString(), text: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') });
    } catch (_) {}
    return orig(...args);
  };
});

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('x-request-id', req.requestId);
  if (!isProd) {
    log.info('request', { id: req.requestId, method: req.method, path: req.path });
  }
  next();
});

// Multer configuration for file uploads
const strictUpload = process.env.STRICT_UPLOAD_VALIDATION === 'true';
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.csv', '.xlsx', '.xls'];
    const allowedMime = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (strictUpload) {
      if (!allowedExt.includes(ext) || !allowedMime.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
      }
      return cb(null, true);
    }
    if (!allowedExt.includes(ext)) {
      return cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
    cb(null, true);
  }
});

// ✅ SECURITY: Walidacja magic bytes (zawartości pliku, nie tylko rozszerzenia)
async function validateFileContent(filePath) {
  try {
    const { fileTypeFromFile } = await import('file-type');
    const fileType = await fileTypeFromFile(filePath);

    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip' // .xlsx to ZIP z XML
    ];

    // CSV nie ma magic bytes, więc jeśli fileType jest null, sprawdzamy rozszerzenie
    if (!fileType) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.csv') {
        return true; // CSV jest OK (brak magic bytes to normalne)
      }
      throw new Error('Cannot determine file type');
    }

    if (!allowedMimeTypes.includes(fileType.mime)) {
      throw new Error(`Invalid file content type: ${fileType.mime}. Only CSV/Excel allowed.`);
    }

    return true;
  } catch (error) {
    log.error('File validation failed', {}, error);
    throw error;
  }
}

// Middleware
// Security headers (ENABLE_CSP or auto-on in production)
const enableCsp = process.env.ENABLE_CSP === 'true' || isProd;
app.use(helmet({
  contentSecurityPolicy: enableCsp ? {
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
    }
  } : false
}));

// CORS - in prod require explicit list (fail-fast if missing)
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : undefined;
if (isProd && (!corsOrigins || corsOrigins.length === 0)) {
  throw new Error('CORS_ORIGINS must be set in production');
}
app.use(cors({ origin: corsOrigins || true }));

// JSON body size limit - gated
if (process.env.JSON_LIMIT) {
  app.use(express.json({ limit: process.env.JSON_LIMIT }));
} else {
  app.use(express.json());
}

// ✅ SECURITY: CSRF protection - ZAWSZE w produkcji
if (isProd || process.env.ENABLE_CSRF !== 'false') {
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
        path: '/'
      },
      size: 64,
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
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

// ✅ SECURITY: Rate limiting - ZAWSZE włączone
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: isProd ? 100 : 300, // Bardziej restrykcyjne w produkcji
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.'
});
app.use(globalLimiter);
log.info(`✅ Rate limiting enabled: ${isProd ? 100 : 300} req/min`);

// Specjalny rate limiter dla kosztownych operacji (upload, AI)
const uploadRateLimitMiddleware = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minut
  max: 20,
  message: 'Upload rate limit exceeded. Please wait before uploading again.'
});

const aiRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 10, // Tylko 10 AI requestów na minutę
  message: 'AI rate limit exceeded. Please wait before trying again.'
});

// Optional API auth - gated
function authenticate(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized', id: req.requestId });
  if (isProd && process.env.API_ACCESS_TOKEN && token !== process.env.API_ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Forbidden', id: req.requestId });
  }
  req.user = { id: 'service-user' };
  next();
}
// ✅ SECURITY: ZAWSZE wymuszaj autentykację w produkcji
if (isProd) {
  app.use('/api', authenticate);
  log.info('🔒 API authentication REQUIRED (production mode)');
} else {
  // W developmencie opcjonalnie (domyślnie włączone)
  if (process.env.ENABLE_API_AUTH !== 'false') {
    app.use('/api', authenticate);
    log.warn('🔓 API authentication enabled (development mode)');
  } else {
    log.warn('⚠️  API authentication DISABLED (development only!)');
  }
}

// ✅ SECURITY: Debug logs endpoint TYLKO w development
if (!isProd && process.env.ENABLE_DEBUG_LOGS !== 'false') {
  app.get('/api/debug/logs', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    return res.json({ id: req.requestId, logs: ringLogs.slice(-limit) });
  });
  log.info('⚠️  Debug logs endpoint enabled (development only)');
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// GPT Test endpoint - z AI rate limiting
app.post('/api/gpt-test', aiRateLimitMiddleware, async (req, res) => {
  const startTime = Date.now();

  try {
    const { model, messages, max_completion_tokens, temperature, top_p } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: messages array is required'
      });
    }

    const requestedModel = model || 'gpt-4o-mini';

    log.info('[GPT Test] Request', {
      id: req.requestId,
      model: requestedModel,
      messageCount: messages.length,
      maxTokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      topP: top_p ?? 0.1
    });

    // Demo mode - return mock response
    if (process.env.OPENAI_API_KEY === 'demo-key' || !process.env.OPENAI_API_KEY) {
      log.info('[GPT Test] Running in DEMO mode (no API key)', { id: req.requestId });

      const mockResponse = {
        id: "chatcmpl-demo",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              brand: "Demo Brand",
              confidence: 0.95,
              note: "This is a DEMO response. Set OPENAI_API_KEY environment variable for real GPT responses."
            }, null, 2)
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const elapsed = Date.now() - startTime;
      log.info('[GPT Test] Demo response sent', { id: req.requestId, timeMs: elapsed });

      res.status(200).json(mockResponse);
      return;
    }

    // Production mode - call OpenAI API
    log.info('[GPT Test] Calling OpenAI API', { id: req.requestId, model: requestedModel });

    const completion = await client.chat.completions.create({
      model: requestedModel,
      messages: messages,
      max_completion_tokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      top_p: top_p ?? 0.1,
    });

    const elapsed = Date.now() - startTime;

    log.info('[GPT Test] Success', {
      id: req.requestId,
      model: completion.model,
      finishReason: completion.choices[0]?.finish_reason,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
      timeMs: elapsed
    });

    res.status(200).json(completion);
  } catch (error) {
    const elapsed = Date.now() - startTime;

    log.error('[GPT Test] Failed', { id: req.requestId, timeMs: elapsed }, error);
    const safe = isProd ? { error: 'Internal server error', id: req.requestId } : { error: error.message, type: error.constructor.name, timeMs: elapsed, id: req.requestId };
    res.status(500).json(safe);
  }
});

// Answers filter endpoint
app.post('/api/answers/filter', async (req, res) => {
  try {
    const filterSchema = z.object({
      search: z.string().max(200).optional().nullable(),
      types: z.array(z.string()).max(10).optional(),
      status: z.string().max(50).optional().nullable(),
      codes: z.array(z.string().max(100)).max(50).optional(),
      language: z.string().max(10).optional().nullable(),
      country: z.string().max(50).optional().nullable(),
      categoryId: z.number().int().positive().optional(),
    });

    const parseResult = filterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters', id: req.requestId });
    }

    const { search, types, status, codes, language, country, categoryId } = parseResult.data;

    log.info('[Filter] Request', {
      id: req.requestId,
      filters: {
        hasSearch: Boolean(search?.trim()),
        typesCount: Array.isArray(types) ? types.length : 0,
        hasStatus: Boolean(status),
        codesCount: Array.isArray(codes) ? codes.length : 0,
        hasLanguage: Boolean(language),
        hasCountry: Boolean(country),
        hasCategoryId: Boolean(categoryId),
      }
    });

    // Check if Supabase is configured
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      // Mock mode - return demo data
      const mockData = [
        {
          id: 1,
          answer_text: 'Gucci',
          translation_en: 'Gucci',
          language: 'en',
          country: 'Poland',
          quick_status: 'Confirmed',
          general_status: 'whitelist',
          selected_code: 'Gucci',
          ai_suggested_code: 'Gucci',
          category_id: 1,
          coding_date: '2025-01-06T10:52:00Z',
          created_at: '2025-01-06T10:52:00Z',
        },
        {
          id: 2,
          answer_text: 'Dior perfume',
          translation_en: 'Dior perfume',
          language: 'en',
          country: 'Vietnam',
          quick_status: 'Confirmed',
          general_status: 'categorized',
          selected_code: 'Dior',
          ai_suggested_code: 'Dior',
          category_id: 1,
          coding_date: '2025-01-06T10:55:00Z',
          created_at: '2025-01-06T10:55:00Z',
        },
        {
          id: 3,
          answer_text: 'Nike shoes',
          translation_en: 'Nike shoes',
          language: 'en',
          country: 'USA',
          quick_status: null,
          general_status: 'uncategorized',
          selected_code: null,
          ai_suggested_code: 'Nike',
          category_id: 1,
          coding_date: null,
          created_at: '2025-01-06T11:00:00Z',
        },
      ];

      const filtered = mockData.filter((item) => {
        if (search && !item.answer_text.toLowerCase().includes(search.toLowerCase())) return false;
        if (types?.length && !types.includes(item.general_status)) return false;
        if (status && item.quick_status !== status) return false;
        if (codes?.length && !codes.some(c => item.selected_code?.includes(c))) return false;
        if (language && item.language !== language) return false;
        if (country && item.country !== country) return false;
        if (categoryId && item.category_id !== categoryId) return false;
        return true;
      });

      console.log(`✅ Mock mode: ${filtered.length} results`);
      return res.status(200).json({
        success: true,
        count: filtered.length,
        results: filtered,
        mode: 'mock',
      });
    }

    // Build Supabase query
    let query = supabase
      .from('answers')
      .select('id, answer_text, translation, translation_en, language, country, quick_status, general_status, selected_code, ai_suggested_code, category_id, coding_date, created_at, updated_at')
      .order('id', { ascending: false })
      .limit(100);

    // Apply filters dynamically
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim() !== '') {
      query = query.ilike('answer_text', `%${search.trim()}%`);
    }

    if (types && Array.isArray(types) && types.length > 0) {
      query = query.in('general_status', types);
    }

    if (status && status.trim() !== '') {
      query = query.eq('quick_status', status);
    }

    if (language && language.trim() !== '') {
      query = query.eq('language', language);
    }

    if (country && country.trim() !== '') {
      query = query.eq('country', country);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      log.error('Supabase query failed', { id: req.requestId }, error);
      throw error;
    }

    // Filter by codes on the client side (since selected_code is comma-separated string)
    let results = data || [];
    if (codes && Array.isArray(codes) && codes.length > 0) {
      results = results.filter(item => {
        if (!item.selected_code) return false;
        return codes.some(code =>
          item.selected_code.toLowerCase().includes(code.toLowerCase())
        );
      });
    }

    log.info('[Filter] Results', { id: req.requestId, filtered: results.length, total: data?.length || 0 });

    res.status(200).json({
      success: true,
      count: results.length,
      results: results,
      mode: 'supabase',
    });

  } catch (err) {
    log.error('Filter endpoint error', { id: req.requestId }, err);
    const safe = isProd ? { success: false, error: 'Internal server error', id: req.requestId } : { success: false, error: err.message, id: req.requestId };
    res.status(500).json(safe);
  }
});

// File upload endpoint
app.post('/api/file-upload', uploadRateLimitMiddleware, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let uploadedFilePath = null;

  try {
    log.info('[File Upload] Request received', { id: req.requestId });

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        error: 'No file uploaded'
      });
    }

    uploadedFilePath = req.file.path;

    // ✅ SECURITY: Waliduj magic bytes (prawdziwa zawartość pliku)
    try {
      await validateFileContent(uploadedFilePath);
      log.info('[File Upload] File content validated (magic bytes OK)', { id: req.requestId });
    } catch (validationError) {
      log.error('[File Upload] File validation failed', { id: req.requestId }, validationError);
      // Usuń nieprawidłowy plik
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      return res.status(400).json({
        status: 'error',
        error: `File validation failed: ${validationError.message}`
      });
    }
    const originalName = path.basename(req.file.originalname).replace(/[\\/]/g, '');
    const fileExtension = path.extname(originalName).toLowerCase();
    const categoryId = req.body.category_id;

    log.info('[File Upload] File', {
      id: req.requestId,
      name: originalName,
      sizeKB: Number((req.file.size / 1024).toFixed(2)),
      extension: fileExtension,
      hasCategoryId: Boolean(categoryId)
    });

    // Validate category
    if (!categoryId) {
      return res.status(400).json({
        status: 'error',
        error: 'Category ID is required'
      });
    }

    let parsedRows = [];
    const errors = [];

    // Parse CSV
    if (fileExtension === '.csv') {
      log.info('[File Upload] Parsing CSV file...', { id: req.requestId });
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf8');

      const parseResult = Papa.parse(fileContent, {
        skipEmptyLines: true,
        delimiter: ',',
        transformHeader: header => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(err => {
          errors.push(`Row ${err.row}: ${err.message}`);
        });
      }

      parsedRows = parseResult.data.map((row, index) => {
        if (!Array.isArray(row) || row.length < 2) {
          errors.push(`Row ${index + 1}: Invalid format (need at least 2 columns)`);
          return null;
        }

        return {
          external_id: String(row[0] || '').trim(),
          answer_text: String(row[1] || '').trim(),
          language: row[2] ? String(row[2]).trim() : null,
          country: row[3] ? String(row[3]).trim() : null,
        };
      }).filter(Boolean);
    }
    // Parse Excel
    else if (['.xlsx', '.xls'].includes(fileExtension)) {
      log.info('[File Upload] Parsing Excel file...', { id: req.requestId });
      const fileBuffer = fs.readFileSync(uploadedFilePath);

      // ✅ ExcelJS (bezpieczny, zamiast xlsx)
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.worksheets[0];

      // Konwertuj do formatu JSON (array of arrays)
      const jsonData = [];
      worksheet.eachRow((row, rowNumber) => {
        // row.values ma wartości od indeksu 1, więc slice(1) daje nam właściwe dane
        jsonData.push(row.values.slice(1));
      });

      parsedRows = jsonData.map((row, index) => {
        if (!Array.isArray(row) || row.length < 2) {
          errors.push(`Row ${index + 1}: Invalid format (need at least 2 columns)`);
          return null;
        }

        return {
          external_id: String(row[0] || '').trim(),
          answer_text: String(row[1] || '').trim(),
          language: row[2] ? String(row[2]).trim() : null,
          country: row[3] ? String(row[3]).trim() : null,
        };
      }).filter(Boolean);
    } else {
      return res.status(415).json({
        status: 'error',
        error: 'Unsupported file format. Only CSV and Excel (.xlsx, .xls) are supported.'
      });
    }

    // Validate parsed rows
    const validRows = parsedRows.filter(row => {
      if (!row.external_id || !row.answer_text) {
        errors.push(`Row with ID "${row.external_id || 'unknown'}": Missing required fields`);
        return false;
      }
      return true;
    });

    const skipped = parsedRows.length - validRows.length;

    log.info('[File Upload] Parsing results', {
      id: req.requestId,
      total: parsedRows.length,
      valid: validRows.length,
      skipped,
      errors: errors.length
    });

    // Check if any valid rows
    if (validRows.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'No valid rows found in file',
        imported: 0,
        skipped: parsedRows.length,
        errors
      });
    }

    // Prepare data for Supabase insert
    const answersToInsert = validRows.map(row => ({
      answer_text: row.answer_text,
      language: row.language,
      country: row.country,
      category_id: parseInt(categoryId),
      general_status: 'uncategorized',
      created_at: new Date().toISOString(),
      // Store external_id in metadata if you have a jsonb column, or add a dedicated column
    }));

    log.info('[File Upload] Inserting to Supabase...', { id: req.requestId });

    // Insert to Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('answers')
      .insert(answersToInsert)
      .select();

    if (insertError) {
      log.error('[File Upload] Supabase insert failed', { id: req.requestId }, insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    const elapsed = Date.now() - startTime;
    log.info('[File Upload] Success', { id: req.requestId, inserted: insertedData.length, timeMs: elapsed });

    // Log import to history table
    try {
      const { error: historyError } = await supabase.from('file_imports').insert({
        file_name: originalName,
        category_id: parseInt(categoryId),
        rows_imported: insertedData.length,
        rows_skipped: skipped,
        user_email: req.headers['x-user-email'] || 'system',
        status: skipped === 0 ? 'success' : 'partial',
        file_size_kb: (req.file.size / 1024).toFixed(2),
        processing_time_ms: elapsed,
        created_at: new Date().toISOString()
      });

      if (historyError) {
        log.warn('[File Upload] Failed to log import history', { id: req.requestId, error: historyError.message });
      } else {
        log.info('[File Upload] Import logged to history', { id: req.requestId });
      }
    } catch (historyErr) {
      console.warn('⚠️ [File Upload] History logging error:', historyErr);
    }

    // Clean up uploaded file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      log.info('[File Upload] Temp file cleaned up', { id: req.requestId });
    }

    res.status(200).json({
      status: 'success',
      imported: insertedData.length,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Return max 10 errors
      totalErrors: errors.length,
      timeMs: elapsed
    });

  } catch (error) {
    log.error('[File Upload] Error', { id: req.requestId }, error);

    // Log failed import to history
    try {
      const elapsed = Date.now() - startTime;
      await supabase.from('file_imports').insert({
        file_name: req.file?.originalname || 'unknown',
        category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
        rows_imported: 0,
        rows_skipped: 0,
        user_email: req.headers['x-user-email'] || 'system',
        status: 'failed',
        error_message: error.message || 'Unknown error',
        file_size_kb: req.file ? (req.file.size / 1024).toFixed(2) : null,
        processing_time_ms: elapsed,
        created_at: new Date().toISOString()
      });
      log.info('[File Upload] Failed import logged to history', { id: req.requestId });
    } catch (historyErr) {
      log.warn('[File Upload] Failed to log error to history', { id: req.requestId });
    }

    // Clean up uploaded file on error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        log.error('Failed to cleanup temp file', { id: req.requestId }, cleanupError);
      }
    }

    res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
      imported: 0,
      skipped: 0,
      errors: [error.message]
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const payload = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    id: req.requestId,
  };
  if (!isProd) {
    payload.supabaseConfigured = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
  }
  res.json(payload);
});

// ═══════════════════════════════════════════════════════════════
// 💰 AI PRICING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai-pricing
 * Fetch AI model pricing data (with 24h cache)
 */
app.get('/api/ai-pricing', async (req, res) => {
  try {
    log.info('GET /api/ai-pricing', { id: req.requestId });

    const pricingData = await pricingFetcher.fetchPricing();

    // Add response metadata
    const response = {
      ...pricingData,
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    res.json(response);
  } catch (error) {
    log.error('Error in /api/ai-pricing', { id: req.requestId }, error);
    res.status(500).json({
      error: 'Failed to fetch pricing data',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai-pricing/refresh
 * Force refresh pricing data (clear cache)
 */
app.post('/api/ai-pricing/refresh', async (req, res) => {
  try {
    log.info('POST /api/ai-pricing/refresh - forcing cache refresh', { id: req.requestId });

    const pricingData = await pricingFetcher.forceRefresh();

    res.json({
      success: true,
      message: 'Pricing data refreshed successfully',
      data: pricingData,
    });
  } catch (error) {
    log.error('Error refreshing pricing', { id: req.requestId }, error);
    res.status(500).json({
      error: 'Failed to refresh pricing data',
      message: error.message,
    });
  }
});

// Mount codeframe routes
app.use('/api/v1/codeframe', codeframeRoutes);
log.info('✅ Codeframe routes mounted at /api/v1/codeframe');

app.listen(port, () => {
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST http://localhost:${port}/api/file-upload (File upload)`);
  console.log(`   - POST http://localhost:${port}/api/answers/filter (Filter answers)`);
  console.log(`   - POST http://localhost:${port}/api/gpt-test (GPT test)`);
  console.log(`   - GET  http://localhost:${port}/api/ai-pricing (AI pricing)`);
  console.log(`   - POST http://localhost:${port}/api/ai-pricing/refresh (Refresh pricing)`);
  console.log(`   - GET  http://localhost:${port}/api/health (Health check)`);
  console.log(`   - POST http://localhost:${port}/api/v1/codeframe/generate (AI Codeframe generation)`);
  console.log(`   - GET  http://localhost:${port}/api/v1/codeframe/:id/status (Codeframe status)`);
  console.log(`   - GET  http://localhost:${port}/api/v1/codeframe/:id/hierarchy (Codeframe hierarchy)`);
});
