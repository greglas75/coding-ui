import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import Papa from 'papaparse';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;

// Multer configuration for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// GPT Test endpoint
app.post('/api/gpt-test', async (req, res) => {
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
    
    console.log('🧪 [GPT Test] Request:', {
      model: requestedModel,
      messageCount: messages.length,
      maxTokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      topP: top_p ?? 0.1
    });
    
    // Demo mode - return mock response
    if (process.env.OPENAI_API_KEY === 'demo-key' || !process.env.OPENAI_API_KEY) {
      console.log('⚠️ [GPT Test] Running in DEMO mode (no API key)');
      
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
      console.log(`✅ [GPT Test] Demo response sent (${elapsed}ms)`);
      
      res.status(200).json(mockResponse);
      return;
    }
    
    // Production mode - call OpenAI API
    console.log(`🚀 [GPT Test] Calling OpenAI API with model: ${requestedModel}`);
    
    const completion = await client.chat.completions.create({
      model: requestedModel,
      messages: messages,
      max_completion_tokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      top_p: top_p ?? 0.1,
    });
    
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ [GPT Test] Success:`, {
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
    
    console.error(`❌ [GPT Test] Failed after ${elapsed}ms:`, {
      error: error.message,
      type: error.constructor.name,
      stack: error.stack?.split('\n')[0]
    });
    
    res.status(500).json({ 
      error: error.message,
      type: error.constructor.name,
      timeMs: elapsed
    });
  }
});

// Answers filter endpoint
app.post('/api/answers/filter', async (req, res) => {
  try {
    const { search, types, status, codes, language, country, categoryId } = req.body;

    console.log('🔍 Filter request:', { search, types, status, codes, language, country, categoryId });

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
      console.error('❌ Supabase query failed:', error);
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

    console.log(`✅ Filtered ${results.length} answers from ${data?.length || 0} total`);

    res.status(200).json({
      success: true,
      count: results.length,
      results: results,
      mode: 'supabase',
    });

  } catch (err) {
    console.error('❌ Filter endpoint error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      details: err.toString(),
    });
  }
});

// File upload endpoint
app.post('/api/file-upload', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let uploadedFilePath = null;

  try {
    console.log('📤 [File Upload] Request received');

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        error: 'No file uploaded'
      });
    }

    uploadedFilePath = req.file.path;
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    const categoryId = req.body.category_id;

    console.log('📂 [File Upload] File:', {
      name: originalName,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      extension: fileExtension,
      categoryId
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
      console.log('🔍 [File Upload] Parsing CSV file...');
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
      console.log('🔍 [File Upload] Parsing Excel file...');
      const fileBuffer = fs.readFileSync(uploadedFilePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ''
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

    console.log('📊 [File Upload] Parsing results:', {
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

    console.log('💾 [File Upload] Inserting to Supabase...');

    // Insert to Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('answers')
      .insert(answersToInsert)
      .select();

    if (insertError) {
      console.error('❌ [File Upload] Supabase insert failed:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ [File Upload] Success: ${insertedData.length} records inserted in ${elapsed}ms`);

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
        console.warn('⚠️ [File Upload] Failed to log import history:', historyError.message);
      } else {
        console.log('📝 [File Upload] Import logged to history');
      }
    } catch (historyErr) {
      console.warn('⚠️ [File Upload] History logging error:', historyErr);
    }

    // Clean up uploaded file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      console.log('🗑️ [File Upload] Temp file cleaned up');
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
    console.error('❌ [File Upload] Error:', error);

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
      console.log('📝 [File Upload] Failed import logged to history');
    } catch (historyErr) {
      console.warn('⚠️ [File Upload] Failed to log error to history:', historyErr);
    }

    // Clean up uploaded file on error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
  });
});

app.listen(port, () => {
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST http://localhost:${port}/api/file-upload (File upload)`);
  console.log(`   - POST http://localhost:${port}/api/answers/filter (Filter answers)`);
  console.log(`   - POST http://localhost:${port}/api/gpt-test (GPT test)`);
  console.log(`   - GET  http://localhost:${port}/api/health (Health check)`);
});
