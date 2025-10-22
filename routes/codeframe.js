/**
 * Codeframe API Routes
 * Endpoints for AI-powered codeframe generation
 */

import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import codeframeService from '../services/codeframeService.js';
import {
  validateRequest,
  generateCodeframeSchema,
  updateHierarchySchema,
  applyCodeframeSchema,
  formatErrorResponse,
  isCodeframeFeatureEnabled,
  checkPythonServiceHealth,
  getPythonServiceUrl,
  estimateGenerationCost,
} from '../utils/codeframeHelpers.js';

const router = express.Router();

// Rate limiter for codeframe generation (per-user)
const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 generations per minute PER USER
  message: {
    error: 'Too many codeframe generation requests. Please try again later.',
    retry_after_seconds: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Per-user rate limiting (not global!)
  keyGenerator: (req, res) => {
    // Use user ID/email if available, otherwise fall back to IP (IPv6-safe)
    return req.user?.email || req.session?.user?.email || ipKeyGenerator(req, res);
  },
});

// Rate limiter for other endpoints (per-user)
const standardRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,  // Per user
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: (req, res) => {
    // Per-user rate limiting (not global!)
    return req.user?.email || req.session?.user?.email || ipKeyGenerator(req, res);
  },
});

/**
 * Middleware: Check if codeframe feature is enabled
 */
function checkFeatureEnabled(req, res, next) {
  if (!isCodeframeFeatureEnabled()) {
    return res.status(503).json({
      error: 'AI Codeframe feature is currently disabled',
      status: 'disabled',
    });
  }
  next();
}

/**
 * Middleware: Verify Python service is available
 */
async function checkPythonService(req, res, next) {
  const isHealthy = await checkPythonServiceHealth(getPythonServiceUrl());

  if (!isHealthy) {
    return res.status(503).json({
      error: 'AI Codeframe service is temporarily unavailable',
      status: 'service_unavailable',
      message: 'The Python microservice is not responding. Please try again later.',
    });
  }

  next();
}

/**
 * POST /api/v1/codeframe/generate
 * Start codeframe generation (async)
 */
router.post(
  '/generate',
  checkFeatureEnabled,
  generationRateLimiter,
  // Skip Python health check - generation is async and will fail gracefully if Python is down
  async (req, res) => {
    try {
      // Validate request body
      const validatedData = validateRequest(generateCodeframeSchema, req.body);

      // Get user from session/auth
      const userId = req.user?.email || req.session?.user?.email || 'system';

      console.log(
        `[Codeframe] User ${userId} requesting generation for category ${validatedData.category_id}, type: ${validatedData.coding_type}`
      );

      // Start generation - pass full config (includes coding_type)
      const result = await codeframeService.startGeneration(
        validatedData.category_id,
        validatedData.answer_ids,
        {
          ...validatedData.algorithm_config,
          coding_type: validatedData.coding_type,
          target_language: validatedData.target_language,
          existing_codes: validatedData.existing_codes,
          anthropic_api_key: validatedData.anthropic_api_key, // Pass API key from Settings
        },
        userId
      );

      // Estimate cost
      const costEstimate = estimateGenerationCost(result.n_answers, result.n_clusters);

      // Return 202 Accepted
      res.status(202).json({
        ...result,
        cost_estimate: costEstimate,
      });
    } catch (error) {
      console.error('[Codeframe] Generation start failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * GET /api/v1/codeframe/:generation_id/status
 * Check generation status
 */
router.get('/:generation_id/status', checkFeatureEnabled, standardRateLimiter, async (req, res) => {
  try {
    const { generation_id } = req.params;

    console.log(`[Codeframe] Status check for generation ${generation_id}`);

    const status = await codeframeService.getStatus(generation_id);

    res.json(status);
  } catch (error) {
    console.error('[Codeframe] Status check failed:', error);

    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * GET /api/v1/codeframe/:generation_id/hierarchy
 * Get full hierarchy tree
 */
router.get(
  '/:generation_id/hierarchy',
  checkFeatureEnabled,
  standardRateLimiter,
  async (req, res) => {
    try {
      const { generation_id } = req.params;

      console.log(`[Codeframe] Hierarchy fetch for generation ${generation_id}`);

      const hierarchy = await codeframeService.getHierarchy(generation_id);

      res.json(hierarchy);
    } catch (error) {
      console.error('[Codeframe] Hierarchy fetch failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * PATCH /api/v1/codeframe/:generation_id/hierarchy
 * Update hierarchy (merge, split, rename, move, delete)
 */
router.patch(
  '/:generation_id/hierarchy',
  checkFeatureEnabled,
  standardRateLimiter,
  async (req, res) => {
    try {
      const { generation_id } = req.params;

      // Validate request body
      const validatedData = validateRequest(updateHierarchySchema, req.body);

      console.log(
        `[Codeframe] Hierarchy update for generation ${generation_id}: ${validatedData.action}`
      );

      const result = await codeframeService.updateHierarchy(generation_id, validatedData.action, {
        node_id: validatedData.node_id,
        node_ids: validatedData.node_ids,
        new_name: validatedData.new_name,
        new_parent_id: validatedData.new_parent_id,
        target_name: validatedData.target_name,
      });

      res.json(result);
    } catch (error) {
      console.error('[Codeframe] Hierarchy update failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * POST /api/v1/codeframe/:generation_id/apply
 * Apply generated codes to all answers
 */
router.post(
  '/:generation_id/apply',
  checkFeatureEnabled,
  standardRateLimiter,
  async (req, res) => {
    try {
      const { generation_id } = req.params;

      // Validate request body
      const validatedData = validateRequest(applyCodeframeSchema, req.body);

      console.log(`[Codeframe] Applying codeframe ${generation_id}`);

      const result = await codeframeService.applyCodeframe(generation_id, validatedData);

      // Return 202 Accepted (async process)
      res.status(202).json(result);
    } catch (error) {
      console.error('[Codeframe] Apply codeframe failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * DELETE /api/v1/codeframe/:generation_id
 * Delete a generation and its hierarchy
 */
router.delete(
  '/:generation_id',
  checkFeatureEnabled,
  standardRateLimiter,
  async (req, res) => {
    try {
      const { generation_id } = req.params;

      console.log(`[Codeframe] Deleting generation ${generation_id}`);

      // Note: CASCADE delete will handle hierarchy nodes
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { error } = await supabase
        .from('codeframe_generations')
        .delete()
        .eq('id', generation_id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Generation deleted successfully',
      });
    } catch (error) {
      console.error('[Codeframe] Delete generation failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * GET /api/v1/codeframe/category/:category_id/generations
 * List all generations for a category
 */
router.get(
  '/category/:category_id/generations',
  checkFeatureEnabled,
  standardRateLimiter,
  async (req, res) => {
    try {
      const { category_id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      console.log(`[Codeframe] Listing generations for category ${category_id}`);

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: generations, error } = await supabase
        .from('codeframe_generations')
        .select('*')
        .eq('category_id', category_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        generations: generations || [],
        count: generations?.length || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error('[Codeframe] List generations failed:', error);

      const { statusCode, body } = formatErrorResponse(error);
      res.status(statusCode).json(body);
    }
  }
);

/**
 * GET /api/v1/codeframe/health
 * Health check for codeframe service
 */
router.get('/health', async (req, res) => {
  try {
    const pythonServiceHealthy = await checkPythonServiceHealth(getPythonServiceUrl());
    const featureEnabled = isCodeframeFeatureEnabled();

    const status = {
      status: pythonServiceHealthy && featureEnabled ? 'healthy' : 'degraded',
      feature_enabled: featureEnabled,
      python_service: pythonServiceHealthy ? 'healthy' : 'unavailable',
      python_service_url: getPythonServiceUrl(),
      timestamp: new Date().toISOString(),
    };

    const httpStatus = status.status === 'healthy' ? 200 : 503;

    res.status(httpStatus).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

export default router;
