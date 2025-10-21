/**
 * Codes API Routes
 * Endpoints for basic code CRUD operations and bulk operations
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiter
const standardRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute per user
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/v1/codes/bulk-create
 * Create multiple codes at once
 */
router.post('/bulk-create', standardRateLimiter, async (req, res) => {
  try {
    const { category_id, code_names } = req.body;

    // Validate inputs
    if (!category_id) {
      return res.status(400).json({
        error: 'Missing required field: category_id'
      });
    }

    if (!code_names || !Array.isArray(code_names) || code_names.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid field: code_names (must be non-empty array)'
      });
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // Prepare codes for insertion
    const codesToInsert = code_names.map(name => ({
      name: name.trim(),
      is_whitelisted: false,
      created_at: new Date().toISOString(),
    }));

    // Insert codes
    const { data: newCodes, error: insertError } = await supabase
      .from('codes')
      .insert(codesToInsert)
      .select();

    if (insertError) {
      console.error('[Codes] Bulk insert failed:', insertError);
      return res.status(500).json({
        error: 'Failed to create codes',
        message: insertError.message
      });
    }

    // Assign codes to category
    const assignments = newCodes.map(code => ({
      category_id: category_id,
      code_id: code.id,
    }));

    const { error: assignError } = await supabase
      .from('category_codes')
      .insert(assignments);

    if (assignError) {
      console.error('[Codes] Category assignment failed:', assignError);
      // Rollback: Delete the codes we just created
      await supabase
        .from('codes')
        .delete()
        .in('id', newCodes.map(c => c.id));

      return res.status(500).json({
        error: 'Failed to assign codes to category',
        message: assignError.message
      });
    }

    res.status(201).json({
      success: true,
      created_count: newCodes.length,
      codes: newCodes,
      message: `Successfully created ${newCodes.length} codes for category "${category.name}"`
    });

  } catch (error) {
    console.error('[Codes] Bulk create error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/codes/ai-discover
 * Use AI to discover common themes/codes from answers
 */
router.post('/ai-discover', standardRateLimiter, async (req, res) => {
  try {
    const { category_id, limit = 100, min_frequency = 2 } = req.body;

    // Validate inputs
    if (!category_id) {
      return res.status(400).json({
        error: 'Missing required field: category_id'
      });
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // Get answers for this category
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('id, answer_text')
      .eq('category_id', category_id)
      .not('answer_text', 'is', null)
      .limit(parseInt(limit));

    if (answersError) {
      console.error('[Codes] Failed to fetch answers:', answersError);
      return res.status(500).json({
        error: 'Failed to fetch answers',
        message: answersError.message
      });
    }

    if (!answers || answers.length === 0) {
      return res.json({
        discovered_codes: [],
        message: 'No answers found in this category',
        answers_scanned: 0
      });
    }

    // Use Claude Haiku to discover themes
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const answerTexts = answers.map(a => a.answer_text).join('\n---\n');

    const prompt = `You are a qualitative research analyst. Analyze the following survey answers and identify BRAND NAMES and products mentioned.

Survey Category: ${category.name}
Number of Answers: ${answers.length}

ANSWERS:
${answerTexts}

INSTRUCTIONS:
1. Identify BRAND NAMES and specific products mentioned across these answers
2. Each brand should appear at least ${min_frequency} times
3. Return as JSON array with format: [{"name": "Brand Name", "frequency": 5, "type": "brand"}]
4. Maximum 30 brands
5. Order by frequency (most common first)
6. Focus on: clothing brands, tech brands, food brands, service providers, retailers
7. EXCLUDE: generic categories (e.g., "shoes", "pizza"), emotions, opinions

Return ONLY valid JSON array, no markdown formatting:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      temperature: 0.2,
      system: 'You are a brand identification specialist. Return ONLY a valid JSON array of objects with name, frequency, and type fields. No markdown code blocks, no explanations.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = response.content[0]?.text || '[]';

    // Parse JSON response
    let discoveredCodes = [];
    try {
      // Remove markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      discoveredCodes = Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('[Codes] Failed to parse AI response:', parseError);
      // Fallback to line-by-line parsing
      discoveredCodes = responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('-') && !line.match(/^\d+\./))
        .filter(line => line.length < 100)
        .slice(0, 30)
        .map(name => ({ name, frequency: 1, type: 'unknown' }));
    }

    res.json({
      success: true,
      discovered_codes: discoveredCodes,
      answers_scanned: answers.length,
      category_name: category.name,
      message: discoveredCodes.length > 0
        ? `Discovered ${discoveredCodes.length} potential codes`
        : 'No themes found. Try analyzing more answers or lowering min_frequency.'
    });

  } catch (error) {
    console.error('[Codes] AI discovery error:', error);
    res.status(500).json({
      error: 'AI discovery failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/codes/category/:category_id
 * Get all codes for a category
 */
router.get('/category/:category_id', standardRateLimiter, async (req, res) => {
  try {
    const { category_id } = req.params;

    const { data: codes, error } = await supabase
      .from('category_codes')
      .select(`
        code_id,
        codes (
          id,
          name,
          is_whitelisted
        )
      `)
      .eq('category_id', category_id);

    if (error) {
      console.error('[Codes] Failed to fetch category codes:', error);
      return res.status(500).json({
        error: 'Failed to fetch codes',
        message: error.message
      });
    }

    const formattedCodes = codes.map(cc => ({
      id: cc.codes.id,
      name: cc.codes.name,
      is_whitelisted: cc.codes.is_whitelisted,
    }));

    res.json({
      codes: formattedCodes,
      count: formattedCodes.length
    });

  } catch (error) {
    console.error('[Codes] Get category codes error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/codes/verify-brands
 * Verify brand names using Google Custom Search API
 */
router.post('/verify-brands', standardRateLimiter, async (req, res) => {
  try {
    const { codes } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid field: codes (must be non-empty array)'
      });
    }

    // Check if Google API credentials are configured
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_CX) {
      console.warn('[Codes] Google API not configured, skipping verification');
      return res.json({
        verified: codes.map(c => ({
          ...c,
          verified: true,
          confidence: 0.5,
          verification_source: 'skipped',
          official_name: c.name
        })),
        rejected: [],
        message: 'Google verification not configured - all brands accepted'
      });
    }

    const axios = (await import('axios')).default;
    const verified = [];
    const rejected = [];

    for (const code of codes) {
      const brandName = typeof code === 'string' ? code : code.name;

      try {
        // Search Google for the brand
        const searchUrl = 'https://www.googleapis.com/customsearch/v1';
        const searchResponse = await axios.get(searchUrl, {
          params: {
            key: process.env.GOOGLE_API_KEY,
            cx: process.env.GOOGLE_CSE_CX,
            q: `${brandName} official website brand`,
            num: 3
          },
          timeout: 5000
        });

        const searchResults = searchResponse.data.items || [];

        // Check for spelling corrections (suggests wrong/generic term)
        if (searchResponse.data.spelling?.correctedQuery) {
          rejected.push({
            ...(typeof code === 'object' ? code : {}),
            name: brandName,
            verified: false,
            confidence: 0,
            reason: `Did you mean: ${searchResponse.data.spelling.correctedQuery}?`
          });
          continue;
        }

        // Check if it's a category/generic term
        const categoryWords = [
          'pain relief', 'gum care', 'whitening', 'recommendation',
          'multiple', 'branded', 'unknown', 'options', 'extra',
          'care', 'relief', 'treatment', 'pharmacy', 'dental',
          'toothpaste', 'mouthwash', 'variants'
        ];

        const isLikelyCategory = categoryWords.some(word =>
          brandName.toLowerCase().includes(word)
        );

        if (isLikelyCategory) {
          rejected.push({
            ...(typeof code === 'object' ? code : {}),
            name: brandName,
            verified: false,
            confidence: 0,
            reason: 'Appears to be a category, not a brand'
          });
          continue;
        }

        // Verification criteria
        const hasOfficialWebsite = searchResults.some(item =>
          item.link && (
            item.link.includes(brandName.toLowerCase().replace(/\s+/g, '')) ||
            item.title.toLowerCase().includes(brandName.toLowerCase())
          )
        );

        const hasWikipedia = searchResults.some(item =>
          item.link && item.link.includes('wikipedia.org')
        );

        const hasBrandIndicators = searchResults.some(item =>
          item.snippet && (
            item.snippet.toLowerCase().includes('brand') ||
            item.snippet.toLowerCase().includes('company') ||
            item.snippet.toLowerCase().includes('official')
          )
        );

        // Try to get logo from Google Image Search
        let logoUrl = null;
        try {
          const imageResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: process.env.GOOGLE_API_KEY,
              cx: process.env.GOOGLE_CSE_CX,
              q: `${brandName} logo`,
              searchType: 'image',
              num: 1
            },
            timeout: 3000
          });

          const imageResults = imageResponse.data.items || [];
          if (imageResults.length > 0) {
            logoUrl = imageResults[0].link;
          }
        } catch (imgError) {
          // Image search is optional, continue without it
          console.warn(`[Codes] Image search failed for ${brandName}:`, imgError.message);
        }

        // Calculate confidence score
        let confidence = 0;
        const sources = [];

        if (hasOfficialWebsite) {
          confidence += 0.5;
          sources.push('official website');
        }

        if (hasWikipedia) {
          confidence += 0.3;
          sources.push('Wikipedia');
        }

        if (hasBrandIndicators) {
          confidence += 0.1;
          sources.push('brand indicators');
        }

        if (logoUrl) {
          confidence += 0.1;
          sources.push('logo found');
        }

        if (confidence >= 0.5) {
          // Get official name from search results
          const officialName = searchResults[0]?.title.split('-')[0].split('|')[0].trim() || brandName;

          verified.push({
            ...(typeof code === 'object' ? code : {}),
            name: brandName,
            official_name: officialName,
            verified: true,
            confidence: Math.min(confidence, 1.0),
            verification_source: sources.join(', '),
            website: searchResults[0]?.link || null,
            logo_url: logoUrl,
            snippet: searchResults[0]?.snippet || null
          });
        } else {
          rejected.push({
            ...(typeof code === 'object' ? code : {}),
            name: brandName,
            verified: false,
            confidence,
            reason: 'Low confidence - not enough brand indicators found'
          });
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (apiError) {
        console.error(`[Codes] Verification failed for "${brandName}":`, apiError.message);

        // If API error, accept with low confidence
        verified.push({
          ...(typeof code === 'object' ? code : {}),
          name: brandName,
          official_name: brandName,
          verified: true,
          confidence: 0.3,
          verification_source: 'api_error',
          error: apiError.message
        });
      }
    }

    res.json({
      success: true,
      verified,
      rejected,
      total: codes.length,
      verified_count: verified.length,
      rejected_count: rejected.length,
      message: `Verified ${verified.length}/${codes.length} brands`
    });

  } catch (error) {
    console.error('[Codes] Brand verification error:', error);
    res.status(500).json({
      error: 'Brand verification failed',
      message: error.message
    });
  }
});

export default router;
