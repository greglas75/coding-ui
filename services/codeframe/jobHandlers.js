/**
 * Background Job Handlers
 * Async processing for cluster labeling and brand extraction
 */

import logger from '../../utils/logger.js';
import { codeframeQueue } from '../bullQueue.js';
import * as dao from './dataAccess.js';
import * as pythonClient from './pythonClient.js';

const log = logger.create('CodeframeJobs');

/**
 * Queue cluster jobs for processing
 */
export async function queueClusterJobs(generation, clusters, category, config) {
  const jobs = [];

  for (const [clusterId, clusterData] of Object.entries(clusters)) {
    jobs.push(
      codeframeQueue.add('generate-cluster-labels', {
        generation_id: generation.id,
        cluster_id: clusterId,
        cluster_texts: clusterData.texts,
        category_name: category.name,
        config,
      })
    );
  }

  await Promise.all(jobs);
  log.info('Cluster jobs queued', { count: jobs.length, generationId: generation.id });
}

/**
 * Process cluster label generation (Bull job handler)
 */
export async function processClusterLabels(job) {
  const { generation_id, cluster_id, cluster_texts, category_name, config } = job.data;

  log.info('Processing cluster labels', { generationId: generation_id, clusterId: cluster_id });

  try {
    const result = await pythonClient.generateClusterLabels(
      cluster_texts,
      category_name,
      config
    );

    // Insert hierarchy nodes
    const nodes = result.codes.map((code, index) => ({
      generation_id,
      cluster_id,
      code: code.code,
      label: code.label,
      description: code.description,
      level: code.level,
      parent_id: code.parent_id,
      confidence: code.confidence,
    }));

    await dao.insertHierarchyNodes(nodes);

    log.info('Cluster labels saved', {
      generationId: generation_id,
      clusterId: cluster_id,
      codes: nodes.length,
    });

    return { success: true, codes: nodes.length };
  } catch (error) {
    log.error('Cluster label processing failed', {
      generationId: generation_id,
      clusterId: cluster_id,
    }, error);
    throw error;
  }
}

/**
 * Run brand extraction in background
 */
export async function runBrandExtractionInBackground(generationId, answers, category, config) {
  log.info('Starting background brand extraction', {
    generationId,
    answers: answers.length,
  });

  try {
    const result = await pythonClient.extractBrands(answers, category.name, config);

    // Save brand hierarchy
    const brandNodes = result.brands.map((brand, index) => ({
      generation_id: generationId,
      cluster_id: 0,
      code: `BRAND_${index + 1}`,
      label: brand.name,
      description: brand.description || `Brand: ${brand.name}`,
      level: 0,
      parent_id: null,
      confidence: brand.confidence || 0.9,
    }));

    await dao.insertHierarchyNodes(brandNodes);

    // Update generation status
    await dao.updateGenerationStatus(generationId, 'completed', {
      completed_at: new Date().toISOString(),
    });

    log.info('Brand extraction completed', {
      generationId,
      brands: brandNodes.length,
      assignments: result.assignments?.length || 0,
    });

    return { success: true, brands: brandNodes.length };
  } catch (error) {
    log.error('Brand extraction failed', { generationId }, error);

    // Mark as failed
    await dao.updateGenerationStatus(generationId, 'failed', {
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Apply codeframe: assign answers and mark as coded
 */
export async function applyCodeframe(generationId, answers, hierarchy) {
  log.info('Applying codeframe', { generationId, answers: answers.length });

  try {
    // Get all codes from hierarchy
    const codes = hierarchy.flatMap(node => {
      const allCodes = [node];
      if (node.children) {
        allCodes.push(...node.children);
      }
      return allCodes;
    });

    // Assign answers to codes using AI
    const assignments = await pythonClient.assignAnswersToCodes(
      answers,
      codes,
      {} // Config will be fetched from generation record
    );

    // Save assignments
    await dao.applyCodeframeAssignments(assignments);

    // Update generation as applied
    await dao.updateGenerationStatus(generationId, 'applied', {
      applied_at: new Date().toISOString(),
    });

    log.info('Codeframe applied', {
      generationId,
      assignments: assignments.length,
    });

    return {
      success: true,
      auto_coded: assignments.filter(a => a.confidence > 0.7).length,
      suggested: assignments.filter(a => a.confidence <= 0.7).length,
    };
  } catch (error) {
    log.error('Codeframe application failed', { generationId }, error);
    throw error;
  }
}

export default {
  queueClusterJobs,
  processClusterLabels,
  runBrandExtractionInBackground,
  applyCodeframe,
};
