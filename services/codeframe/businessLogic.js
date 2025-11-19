/**
 * Codeframe Business Logic
 * Core algorithms and validation logic
 */

import crypto from 'crypto';
import logger from '../../utils/logger.js';

const log = logger.create('CodeframeLogic');

export const MIN_ANSWERS_REQUIRED = 10;
export const MIN_CLUSTER_SIZE = 5;

/**
 * Validate generation can start
 */
export function validateGenerationRequest(answers, codingType) {
  if (answers.length < MIN_ANSWERS_REQUIRED) {
    throw new Error(
      `Minimum ${MIN_ANSWERS_REQUIRED} answers required. Found: ${answers.length}`
    );
  }

  log.info('Generation request validated', {
    answers: answers.length,
    codingType,
  });
}

/**
 * Calculate text hash for caching
 */
export function calculateTextHash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Determine which answers need embeddings
 */
export function findAnswersNeedingEmbeddings(answers, existingEmbeddings) {
  const embeddingMap = new Map(
    existingEmbeddings.map(e => [e.answer_id, e.text_hash])
  );

  return answers.filter(answer => {
    const currentHash = calculateTextHash(answer.answer_text);
    const cachedHash = embeddingMap.get(answer.id);
    return currentHash !== cachedHash;
  });
}

/**
 * Build hierarchy tree from flat nodes
 */
export function buildHierarchyTree(nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));

  const roots = [];

  for (const node of nodeMap.values()) {
    if (node.parent_id) {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // Orphaned node becomes root
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Estimate generation time
 */
export function estimateGenerationTime(nClusters, nAnswers, codingType) {
  if (codingType === 'brand') {
    return Math.ceil(nAnswers * 1.5); // ~1.5 sec per answer
  }
  return Math.ceil(nClusters * 5); // ~5 sec per cluster
}

/**
 * Validate hierarchy action parameters
 */
export function validateHierarchyAction(action, params) {
  switch (action) {
    case 'rename':
      if (!params.node_id || !params.new_label) {
        throw new Error('rename requires node_id and new_label');
      }
      break;

    case 'delete':
      if (!params.node_id) {
        throw new Error('delete requires node_id');
      }
      break;

    case 'add_child':
      if (!params.parent_id || !params.code || !params.label) {
        throw new Error('add_child requires parent_id, code, and label');
      }
      break;

    case 'move':
      if (!params.node_id || !params.new_parent_id) {
        throw new Error('move requires node_id and new_parent_id');
      }
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Filter high-confidence assignments for auto-coding
 */
export function filterHighConfidenceAssignments(assignments, threshold = 0.7) {
  return assignments.filter(a => a.confidence >= threshold);
}

/**
 * Group assignments by code
 */
export function groupAssignmentsByCode(assignments) {
  const grouped = new Map();

  for (const assignment of assignments) {
    if (!grouped.has(assignment.code)) {
      grouped.set(assignment.code, []);
    }
    grouped.get(assignment.code).push(assignment);
  }

  return grouped;
}

/**
 * Calculate cluster statistics
 */
export function calculateClusterStats(clusterResult) {
  const clusters = Object.values(clusterResult.clusters);

  return {
    total_clusters: clusterResult.n_clusters,
    noise_count: clusterResult.noise_count,
    avg_cluster_size: clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length,
    largest_cluster: Math.max(...clusters.map(c => c.size)),
    smallest_cluster: Math.min(...clusters.map(c => c.size)),
  };
}

/**
 * Validate API keys are present
 */
export function validateApiKeys(config, codingType) {
  const required = ['anthropic_api_key'];

  if (codingType === 'brand') {
    required.push('google_api_key', 'google_cse_cx_id');
  }

  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required API keys: ${missing.join(', ')}`);
  }
}

export default {
  MIN_ANSWERS_REQUIRED,
  MIN_CLUSTER_SIZE,
  validateGenerationRequest,
  calculateTextHash,
  findAnswersNeedingEmbeddings,
  buildHierarchyTree,
  estimateGenerationTime,
  validateHierarchyAction,
  filterHighConfidenceAssignments,
  groupAssignmentsByCode,
  calculateClusterStats,
  validateApiKeys,
};
