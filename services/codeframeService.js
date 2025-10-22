/**
 * Codeframe Service - Business logic for AI codeframe generation
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { codeframeQueue } from './bullQueue.js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const MIN_ANSWERS_REQUIRED = 10; // Minimum answers needed for generation
const MIN_CLUSTER_SIZE = 5; // Minimum cluster size for HDBSCAN

class CodeframeService {
  /**
   * Start codeframe generation process
   * @param {number} categoryId - Category ID
   * @param {number[]} answerIds - Optional array of answer IDs (default: all uncategorized)
   * @param {object} config - Algorithm configuration (includes coding_type)
   * @param {string} userId - User email
   * @returns {Promise<object>} Generation info
   */
  async startGeneration(categoryId, answerIds, config, userId) {
    const codingType = config.coding_type || 'open-ended';
    console.log(`Starting codeframe generation for category ${categoryId} (type: ${codingType})`);

    // 1. Fetch category info
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, description')
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    // 2. Fetch answers
    const answers = await this.fetchAnswers(categoryId, answerIds);

    if (answers.length < MIN_ANSWERS_REQUIRED) {
      throw new Error(
        `Minimum ${MIN_ANSWERS_REQUIRED} answers required. Found: ${answers.length}`
      );
    }

    console.log(`Fetched ${answers.length} answers`);

    // 3. For Brand coding, skip clustering entirely
    let clusterResult;
    if (codingType === 'brand') {
      console.log('Brand coding detected - skipping clustering, using direct brand detection');
      // Create a single "cluster" with all answers for brand detection
      clusterResult = {
        n_clusters: 1,
        noise_count: 0,
        clusters: {
          '0': {
            texts: answers.map((a, idx) => ({
              id: a.id,
              text: a.answer_text,
              language: 'en', // TODO: detect language
            })),
            size: answers.length,
            confidence: 1.0,
          },
        },
      };
    } else {
      // 3a. Generate embeddings (or use cached)
      console.log('Generating/fetching embeddings...');
      await this.ensureEmbeddings(answers);

      // 3b. Call Python service to cluster answers
      console.log('Clustering answers...');
      clusterResult = await this.clusterAnswers(answers, config);

      console.log(
        `Clustering complete: ${clusterResult.n_clusters} clusters, ${clusterResult.noise_count} noise points`
      );
    }

    // 5. Create generation record in database
    const generation = await this.createGenerationRecord(
      categoryId,
      answers,
      clusterResult,
      config,
      userId
    );

    console.log(`Generation record created: ${generation.id}`);

    // 6. Queue background jobs for each cluster
    await this.queueClusterJobs(generation, clusterResult.clusters, category, config);

    console.log(`Queued ${clusterResult.n_clusters} cluster jobs`);

    // 7. Calculate estimated time (rough estimate)
    const estimatedTimeSeconds = Math.ceil(clusterResult.n_clusters * 5); // ~5 sec per cluster

    return {
      generation_id: generation.id,
      status: 'processing',
      n_clusters: clusterResult.n_clusters,
      n_answers: answers.length,
      estimated_time_seconds: estimatedTimeSeconds,
      poll_url: `/api/v1/codeframe/${generation.id}/status`,
    };
  }

  /**
   * Fetch answers for a category
   */
  async fetchAnswers(categoryId, answerIds = null) {
    let query = supabase
      .from('answers')
      .select('id, answer_text, category_id')
      .eq('category_id', categoryId)
      .not('answer_text', 'is', null)
      .neq('answer_text', '');

    // If specific answer IDs provided, filter by them
    if (answerIds && answerIds.length > 0) {
      query = query.in('id', answerIds);
    } else {
      // Default: only get uncategorized answers
      query = query.is('selected_code', null);
    }

    const { data: answers, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch answers: ${error.message}`);
    }

    return answers || [];
  }

  /**
   * Ensure embeddings exist for all answers (use cache or generate)
   */
  async ensureEmbeddings(answers) {
    const answerIds = answers.map((a) => a.id);

    // Check which embeddings already exist
    const { data: existingEmbeddings } = await supabase
      .from('answer_embeddings')
      .select('answer_id, text_hash')
      .in('answer_id', answerIds);

    const existingMap = new Map(
      (existingEmbeddings || []).map((e) => [e.answer_id, e.text_hash])
    );

    // Find answers that need embeddings
    const answersNeedingEmbeddings = answers.filter((a) => {
      const textHash = this.hashText(a.answer_text);
      const existingHash = existingMap.get(a.id);
      return !existingHash || existingHash !== textHash;
    });

    if (answersNeedingEmbeddings.length === 0) {
      console.log('All embeddings cached');
      return;
    }

    console.log(`Generating embeddings for ${answersNeedingEmbeddings.length} answers...`);

    // Generate embeddings via Python service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/embeddings`,
      {
        texts: answersNeedingEmbeddings.map((a) => ({
          id: a.id,
          text: a.answer_text,
        })),
      },
      {
        timeout: 60000, // 60 seconds (embeddings can take time)
        validateStatus: (status) => status < 500, // Don't throw on 4xx client errors
      }
    );

    // Check for 4xx errors
    if (response.status >= 400 && response.status < 500) {
      throw new Error(
        response.data?.error || `Python service returned ${response.status}: ${response.statusText}`
      );
    }

    const embeddings = response.data.embeddings;

    // Save to cache
    const embeddingRecords = embeddings.map((emb) => ({
      answer_id: emb.id,
      embedding_vector: emb.embedding, // Store as JSON array directly
      model_name: 'all-MiniLM-L6-v2',
      embedding_hash: this.hashText(
        answersNeedingEmbeddings.find((a) => a.id === emb.id).answer_text
      ),
    }));

    const { error } = await supabase.from('answer_embeddings').upsert(embeddingRecords, {
      onConflict: 'answer_id,model_name',
    });

    if (error) {
      console.error('Error saving embeddings to cache:', error);
      // Non-critical, continue
    }

    console.log('Embeddings cached');
  }

  /**
   * Cluster answers using Python service
   */
  async clusterAnswers(answers, config) {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/cluster`,
      {
        answer_ids: answers.map((a) => a.id),
        config: {
          min_cluster_size: config.min_cluster_size || MIN_CLUSTER_SIZE,
          min_samples: config.min_samples || 3,
        },
      },
      {
        timeout: 120000, // 2 minutes (clustering can be slow for large datasets)
        validateStatus: (status) => status < 500, // Don't throw on 4xx client errors
      }
    );

    // Check for 4xx errors
    if (response.status >= 400 && response.status < 500) {
      throw new Error(
        response.data?.error || `Python service returned ${response.status}: ${response.statusText}`
      );
    }

    return response.data;
  }

  /**
   * Create generation record in database
   */
  async createGenerationRecord(categoryId, answers, clusterResult, config, userId) {
    const { data: generation, error } = await supabase
      .from('codeframe_generations')
      .insert({
        category_id: categoryId,
        config: config,  // Renamed from algorithm_config to match schema
        n_answers: answers.length,
        n_clusters: clusterResult.n_clusters,
        status: 'processing',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create generation record: ${error.message}`);
    }

    return generation;
  }

  /**
   * Queue background jobs for each cluster
   */
  async queueClusterJobs(generation, clusters, category, config) {
    const jobs = [];

    for (const [clusterId, clusterData] of Object.entries(clusters)) {
      const job = await codeframeQueue.add('generate-cluster', {
        generation_id: generation.id,
        cluster_id: parseInt(clusterId),
        cluster_texts: clusterData.texts,
        category_info: {
          id: category.id,
          name: category.name,
          description: category.description,
        },
        config: {
          target_language: config.target_language || 'en',
          existing_codes: config.existing_codes || [],
          hierarchy_preference: config.hierarchy_preference || 'adaptive',
          anthropic_api_key: config.anthropic_api_key, // Pass API key from Settings
        },
      });

      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Get generation status
   */
  async getStatus(generationId) {
    const { data: generation, error } = await supabase
      .from('codeframe_generations')
      .select(
        `
        *,
        codeframe_hierarchy (
          id,
          node_type,
          name,
          confidence,
          cluster_id
        )
      `
      )
      .eq('id', generationId)
      .single();

    if (error || !generation) {
      throw new Error(`Generation ${generationId} not found`);
    }

    // Calculate progress
    const totalClusters = generation.n_clusters || 0;
    const hierarchy = generation.codeframe_hierarchy || [];
    const themes = hierarchy.filter((n) => n.node_type === 'theme');
    const completedClusters = themes.length;
    const progress = totalClusters > 0 ? Math.round((completedClusters / totalClusters) * 100) : 0;

    // Get hierarchy if completed
    let result = null;
    if (generation.status === 'completed') {
      result = await this.getHierarchy(generationId);
    }

    return {
      generation_id: generation.id,
      status: generation.status,
      progress,
      n_clusters: totalClusters,
      n_completed: completedClusters,
      n_failed: totalClusters - completedClusters,
      processing_time_ms: generation.processing_time_ms,
      mece_score: generation.mece_score,
      result,
    };
  }

  /**
   * Get hierarchy tree structure
   */
  async getHierarchy(generationId) {
    const { data: nodes, error } = await supabase
      .from('codeframe_hierarchy')
      .select('*')
      .eq('generation_id', generationId)
      .order('display_order');

    if (error) {
      throw new Error(`Failed to fetch hierarchy: ${error.message}`);
    }

    // Build tree structure
    const tree = this.buildHierarchyTree(nodes);

    return {
      generation_id: generationId,
      hierarchy: tree,
    };
  }

  /**
   * Build hierarchical tree from flat nodes
   */
  buildHierarchyTree(nodes) {
    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, children: [] }]));
    const rootNodes = [];

    for (const node of nodeMap.values()) {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  /**
   * Update hierarchy (merge, split, rename operations)
   */
  async updateHierarchy(generationId, action, params) {
    console.log(`Updating hierarchy for ${generationId}: ${action}`);

    switch (action) {
      case 'rename':
        return await this.renameNode(params.node_id, params.new_name);

      case 'merge':
        return await this.mergeNodes(params.node_ids, params.target_name);

      case 'move':
        return await this.moveNode(params.node_id, params.new_parent_id);

      case 'delete':
        return await this.deleteNode(params.node_id);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Rename a hierarchy node
   */
  async renameNode(nodeId, newName) {
    const { data, error } = await supabase
      .from('codeframe_hierarchy')
      .update({
        name: newName,
        is_edited: true,
        edit_history: supabase.sql`
          edit_history || jsonb_build_array(
            jsonb_build_object(
              'action', 'rename',
              'timestamp', NOW(),
              'old_name', name,
              'new_name', ${newName}
            )
          )
        `,
      })
      .eq('id', nodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rename node: ${error.message}`);
    }

    return { success: true, node: data };
  }

  /**
   * Merge multiple nodes into one
   */
  async mergeNodes(nodeIds, targetName) {
    // Get all nodes
    const { data: nodes, error: fetchError } = await supabase
      .from('codeframe_hierarchy')
      .select('*')
      .in('id', nodeIds);

    if (fetchError || !nodes || nodes.length === 0) {
      throw new Error('Nodes not found');
    }

    // Create merged node
    const firstNode = nodes[0];
    const { data: mergedNode, error: insertError } = await supabase
      .from('codeframe_hierarchy')
      .insert({
        generation_id: firstNode.generation_id,
        parent_id: firstNode.parent_id,
        level: firstNode.level,
        node_type: firstNode.node_type,
        name: targetName,
        description: `Merged from: ${nodes.map((n) => n.name).join(', ')}`,
        is_edited: true,
        edit_history: [
          {
            action: 'merge',
            timestamp: new Date().toISOString(),
            merged_nodes: nodes.map((n) => ({ id: n.id, name: n.name })),
          },
        ],
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create merged node: ${insertError.message}`);
    }

    // Update children to point to merged node
    for (const node of nodes) {
      await supabase
        .from('codeframe_hierarchy')
        .update({ parent_id: mergedNode.id })
        .eq('parent_id', node.id);
    }

    // Delete original nodes
    await supabase.from('codeframe_hierarchy').delete().in('id', nodeIds);

    return { success: true, merged_node: mergedNode };
  }

  /**
   * Move a node to a new parent
   */
  async moveNode(nodeId, newParentId) {
    const { data, error } = await supabase
      .from('codeframe_hierarchy')
      .update({
        parent_id: newParentId,
        is_edited: true,
      })
      .eq('id', nodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to move node: ${error.message}`);
    }

    return { success: true, node: data };
  }

  /**
   * Delete a node (and optionally its children)
   */
  async deleteNode(nodeId) {
    // Cascade delete will handle children
    const { error } = await supabase.from('codeframe_hierarchy').delete().eq('id', nodeId);

    if (error) {
      throw new Error(`Failed to delete node: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Apply codeframe to answers (assign codes)
   */
  async applyCodeframe(generationId, options) {
    const { auto_confirm_threshold = 0.9, overwrite_existing = false } = options;

    console.log(`Applying codeframe ${generationId}...`);

    // Get generation
    const { data: generation } = await supabase
      .from('codeframe_generations')
      .select('category_id, n_answers')
      .eq('id', generationId)
      .single();

    if (!generation) {
      throw new Error('Generation not found');
    }

    // Get all answers for this category
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('category_id', generation.category_id);

    const answerIds = answers.map(a => a.id);

    // Get hierarchy (codes only)
    const { data: codeNodes } = await supabase
      .from('codeframe_hierarchy')
      .select('id, name, code_id, embedding')
      .eq('generation_id', generationId)
      .eq('node_type', 'code');

    // Get answers with embeddings
    const { data: answerEmbeddings } = await supabase
      .from('answer_embeddings')
      .select('answer_id, embedding_vector')
      .in('answer_id', answerIds);

    // For each answer, find best matching code
    const assignments = [];
    for (const ansEmb of answerEmbeddings || []) {
      let bestMatch = null;
      let bestScore = -1;

      // Parse embedding_vector from database
      let embedding;
      try {
        if (typeof ansEmb.embedding_vector === 'string') {
          // Remove \x prefix if present and decode from hex
          if (ansEmb.embedding_vector.startsWith('\\x')) {
            const hex_str = ansEmb.embedding_vector.substring(2);
            const json_bytes = Buffer.from(hex_str, 'hex');
            embedding = JSON.parse(json_bytes.toString('utf-8'));
          } else {
            embedding = JSON.parse(ansEmb.embedding_vector);
          }
        } else if (Buffer.isBuffer(ansEmb.embedding_vector)) {
          embedding = JSON.parse(ansEmb.embedding_vector.toString('utf-8'));
        } else {
          embedding = ansEmb.embedding_vector;
        }
      } catch (e) {
        console.error(`Failed to parse embedding for answer ${ansEmb.answer_id}:`, e);
        continue;
      }

      for (const codeNode of codeNodes || []) {
        if (!codeNode.embedding) continue;

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(embedding, codeNode.embedding);

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = codeNode;
        }
      }

      // Auto-confirm if above threshold
      if (bestMatch && bestScore >= auto_confirm_threshold) {
        assignments.push({
          answer_id: ansEmb.answer_id,
          code_id: bestMatch.code_id,
          similarity: bestScore,
        });
      }
    }

    console.log(`Auto-confirmed ${assignments.length} assignments`);

    // Update generation status
    await supabase
      .from('codeframe_generations')
      .update({ status: 'applied' })
      .eq('id', generationId);

    return {
      success: true,
      total_answers: answerIds.length,
      assigned: assignments.length,
      pending: answerIds.length - assignments.length,
    };
  }

  /**
   * Helper: Hash text for cache invalidation
   */
  hashText(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Helper: Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

export default new CodeframeService();
