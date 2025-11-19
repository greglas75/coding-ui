/**
 * Codeframe Service - Main Orchestrator
 * Coordinates between data access, Python client, and business logic
 *
 * BEFORE: 1,006 lines god class
 * AFTER: ~200 lines orchestrator + 5 modules
 */

import logger from '../../utils/logger.js';
import * as dao from './dataAccess.js';
import * as pythonClient from './pythonClient.js';
import * as logic from './businessLogic.js';
import * as jobs from './jobHandlers.js';

const log = logger.create('CodeframeService');

class CodeframeService {
  /**
   * Start codeframe generation process
   */
  async startGeneration(categoryId, answerIds, config, userId) {
    const codingType = config.coding_type || 'open-ended';

    log.info('Starting codeframe generation', {
      categoryId,
      codingType,
      hasApiKeys: {
        anthropic: !!config.anthropic_api_key,
        google: !!config.google_api_key,
      },
    });

    // Validate API keys
    logic.validateApiKeys(config, codingType);

    // 1. Fetch category and answers
    const category = await dao.getCategory(categoryId);
    const answers = await dao.getAnswers(categoryId, answerIds, codingType);

    // 2. Validate minimum requirements
    logic.validateGenerationRequest(answers, codingType);

    log.info('Answers fetched and validated', { count: answers.length });

    // 3. Brand coding: direct extraction
    if (codingType === 'brand') {
      return await this._handleBrandCoding(category, answers, config, userId);
    }

    // 4. Standard coding: clustering + labeling
    return await this._handleStandardCoding(category, answers, config, userId);
  }

  /**
   * Handle brand coding type
   */
  async _handleBrandCoding(category, answers, config, userId) {
    log.info('Brand coding: creating generation record');

    // Create generation record
    const generation = await dao.createGeneration({
      categoryId: category.id,
      nClusters: 1,
      nAnswers: answers.length,
      config,
      userId,
    });

    // Start brand extraction in background
    jobs.runBrandExtractionInBackground(
      generation.id,
      answers,
      category,
      config
    ).catch(error => {
      log.error('Background brand extraction failed', {}, error);
    });

    // Return immediately for polling
    return {
      generation_id: generation.id,
      status: 'processing',
      n_clusters: 1,
      n_answers: answers.length,
      estimated_time_seconds: logic.estimateGenerationTime(1, answers.length, 'brand'),
      poll_url: `/api/v1/codeframe/${generation.id}/status`,
    };
  }

  /**
   * Handle standard clustering-based coding
   */
  async _handleStandardCoding(category, answers, config, userId) {
    // 1. Ensure embeddings exist
    await this._ensureEmbeddings(answers);

    // 2. Cluster answers
    log.info('Clustering answers');
    const clusterResult = await pythonClient.clusterAnswers(answers, config);

    log.info('Clustering complete', {
      clusters: clusterResult.n_clusters,
      noise: clusterResult.noise_count,
    });

    // 3. Create generation record
    const generation = await dao.createGeneration({
      categoryId: category.id,
      nClusters: clusterResult.n_clusters,
      nAnswers: answers.length,
      config,
      userId,
    });

    // 4. Queue cluster labeling jobs
    await jobs.queueClusterJobs(generation, clusterResult.clusters, category, config);

    log.info('Cluster jobs queued', { generationId: generation.id });

    // 5. Return status for polling
    return {
      generation_id: generation.id,
      status: 'processing',
      n_clusters: clusterResult.n_clusters,
      n_answers: answers.length,
      estimated_time_seconds: logic.estimateGenerationTime(
        clusterResult.n_clusters,
        answers.length,
        'standard'
      ),
      poll_url: `/api/v1/codeframe/${generation.id}/status`,
    };
  }

  /**
   * Ensure embeddings exist for all answers
   */
  async _ensureEmbeddings(answers) {
    const answerIds = answers.map(a => a.id);
    const existingEmbeddings = await dao.getExistingEmbeddings(answerIds);

    const answersNeedingEmbeddings = logic.findAnswersNeedingEmbeddings(
      answers,
      existingEmbeddings
    );

    if (answersNeedingEmbeddings.length === 0) {
      log.info('All embeddings cached');
      return;
    }

    log.info('Generating embeddings', { count: answersNeedingEmbeddings.length });

    const newEmbeddings = await pythonClient.generateEmbeddings(answersNeedingEmbeddings);

    // Add text hashes
    const embeddingsWithHash = newEmbeddings.map(emb => ({
      ...emb,
      text_hash: logic.calculateTextHash(
        answersNeedingEmbeddings.find(a => a.id === emb.answer_id).answer_text
      ),
    }));

    await dao.saveEmbeddings(embeddingsWithHash);
    log.info('Embeddings cached');
  }

  /**
   * Get generation status
   */
  async getStatus(generationId) {
    const generation = await dao.getGenerationWithHierarchy(generationId);

    if (generation.status === 'completed') {
      const hierarchy = logic.buildHierarchyTree(generation.codeframe_hierarchy || []);

      return {
        ...generation,
        hierarchy,
        ready: true,
      };
    }

    return generation;
  }

  /**
   * Get hierarchy tree
   */
  async getHierarchy(generationId) {
    const nodes = await dao.getHierarchyNodes(generationId);
    return logic.buildHierarchyTree(nodes);
  }

  /**
   * Update hierarchy
   */
  async updateHierarchy(generationId, action, params) {
    log.info('Updating hierarchy', { generationId, action });

    logic.validateHierarchyAction(action, params);

    switch (action) {
      case 'rename':
        await dao.updateHierarchyNode(params.node_id, {
          label: params.new_label,
          description: params.new_description,
        });
        break;

      case 'delete':
        await dao.deleteHierarchyNode(params.node_id);
        break;

      case 'add_child':
        await dao.insertHierarchyNodes([{
          generation_id: generationId,
          parent_id: params.parent_id,
          code: params.code,
          label: params.label,
          description: params.description,
          level: params.level || 1,
          confidence: 1.0,
        }]);
        break;

      case 'move':
        await dao.updateHierarchyNode(params.node_id, {
          parent_id: params.new_parent_id,
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return { success: true };
  }

  /**
   * Apply codeframe to answers
   */
  async applyCodeframe(generationId) {
    log.info('Applying codeframe', { generationId });

    const generation = await dao.getGenerationWithHierarchy(generationId);
    const answers = await dao.getAnswers(generation.category_id);
    const hierarchy = logic.buildHierarchyTree(generation.codeframe_hierarchy || []);

    return await jobs.applyCodeframe(generationId, answers, hierarchy);
  }
}

// Export singleton instance
export default new CodeframeService();
