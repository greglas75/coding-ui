/**
 * Sentiment Analysis API Routes
 * Endpoints for context-aware sentiment analysis
 */

import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import sentimentService from '../services/sentimentService.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Rate limiter for sentiment analysis operations (per-user)
const sentimentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 sentiment analyses per minute per user
  message: {
    error: 'Too many sentiment analysis requests. Please try again later.',
    retry_after_seconds: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.user?.email || req.session?.user?.email || ipKeyGenerator(req, res);
  },
});

/**
 * POST /api/v1/sentiment/analyze/:id
 *
 * Analyze sentiment for a single answer
 */
router.post('/analyze/:id', sentimentRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    // Fetch answer with category settings
    const { data: answer, error } = await supabase
      .from('answers')
      .select(
        `
        *,
        categories (
          sentiment_enabled,
          sentiment_mode
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Check if category has sentiment enabled
    if (!answer.categories.sentiment_enabled) {
      return res.status(400).json({
        error: 'Sentiment analysis not enabled for this category',
        message: 'Enable sentiment in category settings first',
      });
    }

    // Skip if already analyzed (unless force=true)
    if (answer.sentiment && !force) {
      return res.json({
        id: parseInt(id),
        sentiment: answer.sentiment,
        sentiment_score: answer.sentiment_score,
        sentiment_applicable: answer.sentiment_applicable,
        skipped: true,
        message: 'Already analyzed',
      });
    }

    // Analyze
    const analysis = await sentimentService.analyzeWithSentiment(
      answer.answer_text || answer.translation || '',
      answer.categories
    );

    // Update database
    await supabase
      .from('answers')
      .update({
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentiment_score,
        sentiment_confidence: analysis.sentiment_confidence,
        sentiment_applicable: analysis.sentiment_applicable,
        sentiment_reasoning: analysis.reasoning,
      })
      .eq('id', id);

    // Log AI usage if applicable
    if (answer.categories.sentiment_enabled && analysis.usage) {
      const cost = sentimentService.calculateCost(
        analysis.usage.input_tokens,
        analysis.usage.output_tokens
      );

      await supabase.from('ai_usage_logs').insert({
        feature_type: 'sentiment',
        answer_id: parseInt(id),
        category_id: answer.category_id,
        model: 'gpt-4o-mini',
        input_tokens: analysis.usage.input_tokens,
        output_tokens: analysis.usage.output_tokens,
        cost_usd: cost,
        metadata: {
          sentiment_applicable: analysis.sentiment_applicable,
          sentiment: analysis.sentiment,
          sentiment_score: analysis.sentiment_score,
        },
      });
    }

    res.json({
      id: parseInt(id),
      ...analysis,
      skipped: false,
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze sentiment',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/sentiment/batch-analyze
 *
 * Batch analyze sentiment for multiple answers
 */
router.post('/batch-analyze', sentimentRateLimiter, async (req, res) => {
  try {
    const { answer_ids, force = false } = req.body;

    if (!Array.isArray(answer_ids) || answer_ids.length === 0) {
      return res.status(400).json({
        error: 'answer_ids must be a non-empty array',
      });
    }

    // Limit batch size
    if (answer_ids.length > 500) {
      return res.status(400).json({
        error: 'Maximum 500 answers per batch',
      });
    }

    // Fetch answers with category settings
    const { data: answers, error } = await supabase
      .from('answers')
      .select(
        `
        id,
        answer_text,
        translation,
        sentiment,
        category_id,
        categories (
          sentiment_enabled,
          sentiment_mode
        )
      `
      )
      .in('id', answer_ids);

    if (error) throw error;

    // Filter: only analyze if category has sentiment enabled
    const eligibleAnswers = answers.filter((a) => a.categories?.sentiment_enabled);

    if (eligibleAnswers.length === 0) {
      return res.status(400).json({
        error: 'No answers eligible for sentiment analysis',
        message: 'Enable sentiment in category settings first',
      });
    }

    // Further filter: skip already analyzed (unless force)
    const toAnalyze = force
      ? eligibleAnswers
      : eligibleAnswers.filter((a) => !a.sentiment);

    if (toAnalyze.length === 0) {
      return res.json({
        processed: 0,
        skipped: answers.length,
        message: 'All answers already analyzed',
      });
    }

    // Analyze in batches
    const results = [];

    for (const answer of toAnalyze) {
      const analysis = await sentimentService.analyzeWithSentiment(
        answer.answer_text || answer.translation || '',
        answer.categories
      );

      // Update database
      await supabase
        .from('answers')
        .update({
          sentiment: analysis.sentiment,
          sentiment_score: analysis.sentiment_score,
          sentiment_confidence: analysis.sentiment_confidence,
          sentiment_applicable: analysis.sentiment_applicable,
          sentiment_reasoning: analysis.reasoning,
        })
        .eq('id', answer.id);

      // Log AI usage
      if (analysis.usage) {
        const cost = sentimentService.calculateCost(
          analysis.usage.input_tokens,
          analysis.usage.output_tokens
        );

        await supabase.from('ai_usage_logs').insert({
          feature_type: 'sentiment',
          answer_id: answer.id,
          category_id: answer.category_id,
          model: 'gpt-4o-mini',
          input_tokens: analysis.usage.input_tokens,
          output_tokens: analysis.usage.output_tokens,
          cost_usd: cost,
          metadata: {
            sentiment_applicable: analysis.sentiment_applicable,
            sentiment: analysis.sentiment,
            sentiment_score: analysis.sentiment_score,
          },
        });
      }

      results.push({
        id: answer.id,
        sentiment: analysis.sentiment,
        sentiment_applicable: analysis.sentiment_applicable,
      });

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    res.json({
      processed: results.length,
      skipped: answers.length - toAnalyze.length,
      ineligible: answers.length - eligibleAnswers.length,
      results,
    });
  } catch (error) {
    console.error('Batch sentiment error:', error);
    res.status(500).json({
      error: 'Failed to batch analyze sentiment',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/sentiment/mark-not-applicable
 *
 * Manually mark answers as not applicable for sentiment
 */
router.post('/mark-not-applicable', sentimentRateLimiter, async (req, res) => {
  try {
    const { answer_ids } = req.body;

    if (!Array.isArray(answer_ids) || answer_ids.length === 0) {
      return res.status(400).json({
        error: 'answer_ids must be a non-empty array',
      });
    }

    await supabase
      .from('answers')
      .update({
        sentiment_applicable: false,
        sentiment: null,
        sentiment_score: null,
        sentiment_confidence: null,
        sentiment_reasoning: 'Manually marked as not applicable by user',
      })
      .in('id', answer_ids);

    res.json({
      updated: answer_ids.length,
      message: 'Marked as not applicable',
    });
  } catch (error) {
    console.error('Mark not applicable error:', error);
    res.status(500).json({
      error: 'Failed to mark as not applicable',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/sentiment/mark-applicable
 *
 * Manually override and mark answers as applicable
 */
router.post('/mark-applicable', sentimentRateLimiter, async (req, res) => {
  try {
    const { answer_ids } = req.body;

    if (!Array.isArray(answer_ids) || answer_ids.length === 0) {
      return res.status(400).json({
        error: 'answer_ids must be a non-empty array',
      });
    }

    await supabase
      .from('answers')
      .update({
        sentiment_applicable: true,
      })
      .in('id', answer_ids);

    res.json({
      updated: answer_ids.length,
      message: 'Marked as applicable - re-analyze to calculate sentiment',
    });
  } catch (error) {
    console.error('Mark applicable error:', error);
    res.status(500).json({
      error: 'Failed to mark as applicable',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/sentiment/stats/:categoryId
 *
 * Get sentiment statistics for a category
 */
router.get('/stats/:categoryId', sentimentRateLimiter, async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Get overall stats using SQL function
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_sentiment_stats',
      { p_category_id: parseInt(categoryId) }
    );

    if (statsError) throw statsError;

    // Get by-code breakdown
    const { data: byCode, error: byCodeError } = await supabase.rpc(
      'get_sentiment_by_code',
      { p_category_id: parseInt(categoryId) }
    );

    if (byCodeError) throw byCodeError;

    const overall = stats[0] || {
      total_answers: 0,
      sentiment_applicable_count: 0,
      positive_count: 0,
      neutral_count: 0,
      negative_count: 0,
      mixed_count: 0,
    };

    res.json({
      overall: {
        total_answers: overall.total_answers,
        sentiment_applicable_count: overall.sentiment_applicable_count,
        sentiment_not_applicable_count: overall.sentiment_not_applicable_count,
        applicable_percentage: overall.applicable_percentage || 0,
        positive: {
          count: overall.positive_count,
          percentage:
            overall.total_answers > 0
              ? Math.round((overall.positive_count / overall.total_answers) * 100)
              : 0,
        },
        neutral: {
          count: overall.neutral_count,
          percentage:
            overall.total_answers > 0
              ? Math.round((overall.neutral_count / overall.total_answers) * 100)
              : 0,
        },
        negative: {
          count: overall.negative_count,
          percentage:
            overall.total_answers > 0
              ? Math.round((overall.negative_count / overall.total_answers) * 100)
              : 0,
        },
        mixed: {
          count: overall.mixed_count,
          percentage:
            overall.total_answers > 0
              ? Math.round((overall.mixed_count / overall.total_answers) * 100)
              : 0,
        },
        avg_sentiment_score: overall.avg_sentiment_score || 0.5,
      },
      by_code: byCode || [],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get sentiment stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/sentiment/cost-estimate
 *
 * Get cost estimate for sentiment analysis
 */
router.get('/cost-estimate', (req, res) => {
  const estimate = sentimentService.estimateCostDifference();

  res.json({
    ...estimate,
    notes: [
      'Sentiment adds ~20% to categorization cost',
      'Smart mode reduces cost by skipping non-applicable answers',
      'Cost is per-answer, one-time (results cached)',
    ],
  });
});

export default router;
