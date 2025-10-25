/**
 * Helper utilities for codeframe generation
 */

import { z } from 'zod';

/**
 * Zod validation schemas
 */

// Schema for generate codeframe request
export const generateCodeframeSchema = z.object({
  coding_type: z.enum(['brand', 'open-ended', 'sentiment']).optional().default('open-ended'),
  category_id: z.number().int().positive('Category ID must be positive'),
  answer_ids: z.array(z.number().int()).optional(),
  algorithm_config: z
    .object({
      min_cluster_size: z.number().int().min(2).max(50).optional().default(5),
      min_samples: z.number().int().min(1).max(20).optional().default(3),
      hierarchy_preference: z.enum(['flat', 'two_level', 'three_level', 'adaptive']).optional().default('adaptive'),
    })
    .optional()
    .default({}),
  target_language: z.string().length(2).optional().default('en'),
  existing_codes: z.array(z.string()).optional().default([]),
  anthropic_api_key: z.string().optional(), // API key from Settings page
  google_api_key: z.string().optional(), // Google API key for brand validation
  google_cse_cx_id: z.string().optional(), // Google CSE CX ID for brand validation
  pinecone_api_key: z.string().optional(), // Pinecone API key for brand embeddings
});

// Schema for update hierarchy request
export const updateHierarchySchema = z.object({
  action: z.enum(['rename', 'merge', 'move', 'delete']),
  node_id: z.string().uuid().optional(),
  node_ids: z.array(z.string().uuid()).optional(),
  new_name: z.string().min(1).max(255).optional(),
  new_parent_id: z.string().uuid().optional(),
  target_name: z.string().min(1).max(255).optional(),
});

// Schema for apply codeframe request
export const applyCodeframeSchema = z.object({
  auto_confirm_threshold: z.number().min(0).max(1).optional().default(0.9),
  overwrite_existing: z.boolean().optional().default(false),
});

/**
 * Validate request body against schema
 * @param {object} schema - Zod schema
 * @param {object} data - Data to validate
 * @returns {object} Validated and parsed data
 * @throws {Error} Validation error
 */
export function validateRequest(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      const validationError = new Error(`Validation failed: ${errorMessage}`);
      validationError.statusCode = 400;
      validationError.validationErrors = error.errors;
      throw validationError;
    }
    throw error;
  }
}

/**
 * Check if Python service is available
 * @param {string} pythonServiceUrl - Python service URL
 * @returns {Promise<boolean>} True if service is healthy
 */
export async function checkPythonServiceHealth(pythonServiceUrl) {
  try {
    const response = await fetch(`${pythonServiceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Python service health check failed:', error.message);
    return false;
  }
}

/**
 * Calculate estimated cost for codeframe generation
 * @param {number} nAnswers - Number of answers
 * @param {number} nClusters - Expected number of clusters
 * @returns {object} Cost estimate
 */
export function estimateGenerationCost(nAnswers, nClusters) {
  // Claude Sonnet 4.5 pricing (as of Oct 2024)
  const INPUT_COST_PER_MILLION = 3.0; // USD
  const OUTPUT_COST_PER_MILLION = 15.0; // USD

  // Rough estimates based on average response sizes
  const avgInputTokensPerCluster = 3500; // Claude input tokens
  const avgOutputTokensPerCluster = 800; // Claude output tokens

  const totalInputTokens = nClusters * avgInputTokensPerCluster;
  const totalOutputTokens = nClusters * avgOutputTokensPerCluster;

  const inputCost = (totalInputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  const totalCost = inputCost + outputCost;

  return {
    n_answers: nAnswers,
    n_clusters: nClusters,
    estimated_input_tokens: totalInputTokens,
    estimated_output_tokens: totalOutputTokens,
    estimated_cost_usd: parseFloat(totalCost.toFixed(4)),
    breakdown: {
      input_cost_usd: parseFloat(inputCost.toFixed(4)),
      output_cost_usd: parseFloat(outputCost.toFixed(4)),
    },
  };
}

/**
 * Format generation status for API response
 * @param {object} generation - Generation record from database
 * @param {object} hierarchy - Optional hierarchy data
 * @returns {object} Formatted status
 */
export function formatGenerationStatus(generation, hierarchy = null) {
  const totalClusters = generation.n_clusters || 0;
  const completedClusters = generation.n_themes || 0;
  const progress = totalClusters > 0 ? Math.round((completedClusters / totalClusters) * 100) : 0;

  const status = {
    generation_id: generation.id,
    status: generation.status,
    progress,
    n_clusters: totalClusters,
    n_completed: completedClusters,
    n_failed: totalClusters - completedClusters,
    processing_time_ms: generation.processing_time_ms,
    created_at: generation.created_at,
    updated_at: generation.updated_at,
  };

  if (generation.status === 'completed') {
    status.result = {
      n_themes: generation.n_themes,
      n_codes: generation.n_codes,
      mece_score: generation.mece_score,
      total_cost_usd: generation.ai_cost_usd,
      ai_usage: {
        model: generation.ai_model,
        input_tokens: generation.ai_input_tokens,
        output_tokens: generation.ai_output_tokens,
      },
    };

    if (hierarchy) {
      status.result.hierarchy = hierarchy;
    }
  }

  if (generation.status === 'failed') {
    status.error = generation.mece_warnings || { message: 'Generation failed' };
  }

  return status;
}

/**
 * Format hierarchy tree for API response
 * @param {array} nodes - Flat array of hierarchy nodes
 * @returns {array} Hierarchical tree structure
 */
export function formatHierarchyTree(nodes) {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  // Create node map
  const nodeMap = new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      description: node.description,
      level: node.level,
      node_type: node.node_type,
      code_id: node.code_id,
      cluster_id: node.cluster_id,
      cluster_size: node.cluster_size,
      confidence: node.confidence,
      frequency_estimate: node.frequency_estimate,
      example_texts: node.example_texts,
      is_edited: node.is_edited,
      display_order: node.display_order,
      children: [],
    });
  });

  // Build tree structure
  const rootNodes = [];
  nodeMap.forEach((node, nodeId) => {
    const dbNode = nodes.find((n) => n.id === nodeId);
    if (dbNode.parent_id) {
      const parent = nodeMap.get(dbNode.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // Sort children by display_order
  const sortChildren = (node) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.display_order - b.display_order);
      node.children.forEach(sortChildren);
    }
  };

  rootNodes.forEach(sortChildren);

  return rootNodes;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Check if user has permission to access generation
 * @param {string} userId - User email
 * @param {object} generation - Generation record
 * @returns {boolean} True if user has access
 */
export function userHasAccess(userId, generation) {
  if (!userId || !generation) {
    return false;
  }

  return generation.created_by === userId;
}

/**
 * Format error for API response
 * @param {Error} error - Error object
 * @returns {object} Formatted error
 */
export function formatErrorResponse(error) {
  const statusCode = error.statusCode || 500;

  const response = {
    error: error.message || 'Internal server error',
    status: 'error',
  };

  // Include validation errors if present
  if (error.validationErrors) {
    response.validation_errors = error.validationErrors;
  }

  // Don't expose stack traces in production
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return {
    statusCode,
    body: response,
  };
}

/**
 * Calculate progress percentage
 * @param {number} completed - Completed items
 * @param {number} total - Total items
 * @returns {number} Progress percentage (0-100)
 */
export function calculateProgress(completed, total) {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/**
 * Generate job ID for tracking
 * @param {string} generationId - Generation UUID
 * @param {number} clusterId - Cluster ID
 * @returns {string} Job ID
 */
export function generateJobId(generationId, clusterId) {
  return `${generationId}-cluster-${clusterId}`;
}

/**
 * Check if feature is enabled
 * @returns {boolean} True if codeframe feature is enabled
 */
export function isCodeframeFeatureEnabled() {
  return process.env.ENABLE_CODEFRAME_FEATURE === 'true';
}

/**
 * Get Python service URL
 * @returns {string} Python service URL
 */
export function getPythonServiceUrl() {
  return process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
}
