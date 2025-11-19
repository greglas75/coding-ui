/**
 * Codeframe Data Access Layer
 * Handles all database operations for codeframe generation
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const log = logger.create('CodeframeDAO');

/**
 * Fetch category by ID
 */
export async function getCategory(categoryId) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, description')
    .eq('id', categoryId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch category ${categoryId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Category ${categoryId} not found`);
  }

  return data;
}

/**
 * Fetch answers for codeframe generation
 */
export async function getAnswers(categoryId, answerIds = null, codingType = 'open-ended') {
  let query = supabase
    .from('answers')
    .select('id, answer_text, category_id, general_status')
    .eq('category_id', categoryId);

  if (answerIds && answerIds.length > 0) {
    query = query.in('id', answerIds);
  } else {
    query = query.eq('general_status', 'uncategorized');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch answers: ${error.message}`);
  }

  return data || [];
}

/**
 * Get existing embeddings for answers
 */
export async function getExistingEmbeddings(answerIds) {
  const { data, error } = await supabase
    .from('answer_embeddings')
    .select('answer_id, text_hash, embedding')
    .in('answer_id', answerIds);

  if (error) {
    log.warn('Failed to fetch existing embeddings', {}, error);
    return [];
  }

  return data || [];
}

/**
 * Save embeddings to database
 */
export async function saveEmbeddings(embeddings) {
  const records = embeddings.map(emb => ({
    answer_id: emb.answer_id,
    text_hash: emb.text_hash,
    embedding: JSON.stringify(emb.embedding),
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('answer_embeddings')
    .upsert(records, { onConflict: 'answer_id' });

  if (error) {
    log.error('Failed to save embeddings', {}, error);
    throw error;
  }

  log.info('Embeddings saved', { count: records.length });
}

/**
 * Create generation record
 */
export async function createGeneration(data) {
  const { data: generation, error } = await supabase
    .from('codeframe_generations')
    .insert({
      category_id: data.categoryId,
      status: 'processing',
      n_clusters: data.nClusters,
      n_answers: data.nAnswers,
      config: data.config,
      created_by: data.userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generation record: ${error.message}`);
  }

  return generation;
}

/**
 * Update generation status
 */
export async function updateGenerationStatus(generationId, status, additionalData = {}) {
  const { error } = await supabase
    .from('codeframe_generations')
    .update({
      status,
      ...additionalData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', generationId);

  if (error) {
    log.error('Failed to update generation status', { generationId, status }, error);
    throw error;
  }
}

/**
 * Get generation with hierarchy
 */
export async function getGenerationWithHierarchy(generationId) {
  const { data, error } = await supabase
    .from('codeframe_generations')
    .select(`
      *,
      codeframe_hierarchy (
        id, code, label, description, parent_id, cluster_id, level, confidence
      )
    `)
    .eq('id', generationId)
    .single();

  if (error || !data) {
    throw new Error(`Generation ${generationId} not found`);
  }

  return data;
}

/**
 * Get hierarchy nodes for generation
 */
export async function getHierarchyNodes(generationId) {
  const { data, error } = await supabase
    .from('codeframe_hierarchy')
    .select('*')
    .eq('generation_id', generationId)
    .order('level', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch hierarchy: ${error.message}`);
  }

  return data || [];
}

/**
 * Update hierarchy node
 */
export async function updateHierarchyNode(nodeId, updates) {
  const { error } = await supabase
    .from('codeframe_hierarchy')
    .update(updates)
    .eq('id', nodeId);

  if (error) {
    throw new Error(`Failed to update node: ${error.message}`);
  }
}

/**
 * Delete hierarchy node
 */
export async function deleteHierarchyNode(nodeId) {
  const { error } = await supabase
    .from('codeframe_hierarchy')
    .delete()
    .eq('id', nodeId);

  if (error) {
    throw new Error(`Failed to delete node: ${error.message}`);
  }
}

/**
 * Insert hierarchy nodes
 */
export async function insertHierarchyNodes(nodes) {
  const { data, error } = await supabase
    .from('codeframe_hierarchy')
    .insert(nodes)
    .select();

  if (error) {
    throw new Error(`Failed to insert nodes: ${error.message}`);
  }

  return data;
}

/**
 * Apply codeframe: update answer assignments
 */
export async function applyCodeframeAssignments(assignments) {
  const updates = assignments.map(a => ({
    id: a.answer_id,
    selected_code: a.code,
    general_status: a.confidence > 0.7 ? 'auto-coded' : 'suggested',
  }));

  const { error } = await supabase
    .from('answers')
    .upsert(updates);

  if (error) {
    throw new Error(`Failed to apply assignments: ${error.message}`);
  }

  log.info('Applied codeframe assignments', { count: updates.length });
}

export default {
  getCategory,
  getAnswers,
  getExistingEmbeddings,
  saveEmbeddings,
  createGeneration,
  updateGenerationStatus,
  getGenerationWithHierarchy,
  getHierarchyNodes,
  updateHierarchyNode,
  deleteHierarchyNode,
  insertHierarchyNodes,
  applyCodeframeAssignments,
};
