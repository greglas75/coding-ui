/**
 * Python Service Client
 * Handles communication with Python microservice for ML operations
 */

import axios from 'axios';
import logger from '../../utils/logger.js';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const log = logger.create('PythonClient');

/**
 * Generate embeddings for answers
 */
export async function generateEmbeddings(answers) {
  const payload = {
    texts: answers.map(a => ({
      id: a.id,
      text: a.answer_text,
    })),
  };

  log.info('Requesting embeddings from Python service', { count: answers.length });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/embeddings`, payload, {
      timeout: 120000, // 2 minutes
    });

    if (response.status >= 400) {
      throw new Error(`Python service error: ${response.status}`);
    }

    const embeddings = response.data.embeddings;
    log.info('Embeddings generated', { count: embeddings.length });

    return embeddings;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Python service not available');
    }
    log.error('Embeddings generation failed', {}, error);
    throw error;
  }
}

/**
 * Cluster answers using HDBSCAN
 */
export async function clusterAnswers(answers, config) {
  const payload = {
    texts: answers.map(a => a.answer_text),
    answer_ids: answers.map(a => a.id),
    min_cluster_size: config.min_cluster_size || 5,
    min_samples: config.min_samples || 3,
  };

  log.info('Requesting clustering from Python service', {
    answers: answers.length,
    minClusterSize: payload.min_cluster_size,
  });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/cluster`, payload, {
      timeout: 180000, // 3 minutes
    });

    if (response.status >= 400) {
      throw new Error(`Clustering failed: ${response.status}`);
    }

    const result = response.data;
    log.info('Clustering complete', {
      clusters: result.n_clusters,
      noise: result.noise_count,
    });

    return result;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Python service not available');
    }
    log.error('Clustering failed', {}, error);
    throw error;
  }
}

/**
 * Generate code labels for a cluster using AI
 */
export async function generateClusterLabels(clusterTexts, categoryName, config) {
  const payload = {
    cluster_texts: clusterTexts,
    category_name: categoryName,
    anthropic_api_key: config.anthropic_api_key,
    model: config.model || 'claude-sonnet-4',
  };

  log.debug('Generating cluster labels', { texts: clusterTexts.length });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/generate-labels`, payload, {
      timeout: 60000, // 1 minute
    });

    return response.data;
  } catch (error) {
    log.error('Label generation failed', {}, error);
    throw error;
  }
}

/**
 * Extract brands from answers
 */
export async function extractBrands(answers, categoryName, config) {
  const payload = {
    answers: answers.map(a => ({
      id: a.id,
      text: a.answer_text,
    })),
    category_name: categoryName,
    anthropic_api_key: config.anthropic_api_key,
    google_api_key: config.google_api_key,
    google_cse_cx_id: config.google_cse_cx_id,
    pinecone_api_key: config.pinecone_api_key,
    model: config.model || 'claude-sonnet-4',
  };

  log.info('Requesting brand extraction', { answers: answers.length });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/extract-brands`, payload, {
      timeout: 600000, // 10 minutes for large batches
    });

    const result = response.data;
    log.info('Brand extraction complete', {
      brands: result.brands?.length || 0,
      assignments: result.assignments?.length || 0,
    });

    return result;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Python service not available');
    }
    log.error('Brand extraction failed', {}, error);
    throw error;
  }
}

/**
 * Assign answers to codes
 */
export async function assignAnswersToCodes(answers, codes, config) {
  const payload = {
    answers: answers.map(a => ({
      id: a.id,
      text: a.answer_text,
    })),
    codes: codes.map(c => ({
      code: c.code,
      label: c.label,
      description: c.description,
    })),
    anthropic_api_key: config.anthropic_api_key,
    model: config.model || 'claude-sonnet-4',
  };

  log.info('Requesting answer assignments', {
    answers: answers.length,
    codes: codes.length,
  });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/assign-codes`, payload, {
      timeout: 300000, // 5 minutes
    });

    return response.data.assignments;
  } catch (error) {
    log.error('Answer assignment failed', {}, error);
    throw error;
  }
}

export default {
  generateEmbeddings,
  clusterAnswers,
  generateClusterLabels,
  extractBrands,
  assignAnswersToCodes,
};
