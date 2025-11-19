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
    console.log('🔑 API keys in config:', {
      anthropic: !!config.anthropic_api_key,
      google: !!config.google_api_key,
      google_cx: !!config.google_cse_cx_id,
      pinecone: !!config.pinecone_api_key
    });

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
    const answers = await this.fetchAnswers(categoryId, answerIds, codingType);

    if (answers.length < MIN_ANSWERS_REQUIRED) {
      throw new Error(
        `Minimum ${MIN_ANSWERS_REQUIRED} answers required. Found: ${answers.length}`
      );
    }

    console.log(`Fetched ${answers.length} answers`);

    // 3. For Brand coding, use direct brand extraction (skip clustering)
    let clusterResult;
    if (codingType === 'brand') {
      console.log('Brand coding detected - using Python brand extraction endpoint');

      // Create generation record first (for status tracking)
      const initialGeneration = await this.createGenerationRecord(
        categoryId,
        answers,
        {
          n_clusters: 1,
          noise_count: 0,
          clusters: { '0': { texts: [], size: answers.length, confidence: 1.0 } }
        },
        config,
        userId
      );

      console.log(`Generation record created: ${initialGeneration.id}`);

      // Start Python brand extraction in BACKGROUND (don't wait)
      this.runBrandExtractionInBackground(
        initialGeneration.id,
        answers,
        category,
        config
      ).catch(error => {
        console.error(`\n❌ Background brand extraction failed:`, error.message);
      });

      // Return IMMEDIATELY with status 'processing' so frontend can poll
      const estimatedTimeSeconds = Math.ceil(answers.length * 1.5); // ~1.5 sec per answer

      return {
        generation_id: initialGeneration.id,
        status: 'processing',
        n_clusters: 1,
        n_answers: answers.length,
        estimated_time_seconds: estimatedTimeSeconds,
        poll_url: `/api/v1/codeframe/${initialGeneration.id}/status`,
      };
    }

    // For non-brand types, use clustering
    // 3a. Generate embeddings (or use cached)
    console.log('Generating/fetching embeddings...');
    await this.ensureEmbeddings(answers);

    // 3b. Call Python service to cluster answers
    console.log('Clustering answers...');
    clusterResult = await this.clusterAnswers(answers, config);

    console.log(
      `Clustering complete: ${clusterResult.n_clusters} clusters, ${clusterResult.noise_count} noise points`
    );

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
  async fetchAnswers(categoryId, answerIds = null, codingType = 'open-ended') {
    let query = supabase
      .from('answers')
      .select('id, answer_text, category_id, general_status, selected_code')
      .eq('category_id', categoryId)
      .not('answer_text', 'is', null)
      .neq('answer_text', '');

    // If specific answer IDs provided, filter by them
    if (answerIds && answerIds.length > 0) {
      query = query.in('id', answerIds);
    } else {
      // For ALL coding types: only get uncategorized answers
      // Skip: whitelisted, blacklisted, global_blacklisted, and already categorized
      query = query
        .is('selected_code', null)
        .or('general_status.is.null,general_status.eq.uncategorized');
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

    // Get real progress from database (updated by Python service during brand extraction)
    const progress = generation.progress_percent || 0;
    const currentStep = generation.current_step || 'Starting generation...';

    // Also calculate cluster-based progress for non-brand coding types
    const totalClusters = generation.n_clusters || 0;
    const hierarchy = generation.codeframe_hierarchy || [];
    const themes = hierarchy.filter((n) => n.node_type === 'theme');
    const completedClusters = themes.length;

    // Get hierarchy if completed
    let result = null;
    if (generation.status === 'completed') {
      result = await this.getHierarchy(generationId);
    }

    // Calculate status counts based on actual generation status
    const nFailed = generation.status === 'failed' ? 1 : 0;
    const nCompleted = generation.status === 'completed' ? completedClusters : 0;

    return {
      generation_id: generation.id,
      status: generation.status,
      progress,
      current_step: currentStep,
      n_clusters: totalClusters,
      n_completed: nCompleted,
      n_failed: nFailed,
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

  /**
   * Run brand extraction in background (async, don't wait)
   */
  async runBrandExtractionInBackground(generationId, answers, category, config) {
    try {
      console.log(`\n🚀 Starting background brand extraction for generation ${generationId}...`);
      console.log(`   Answers: ${answers.length}`);
      console.log(`   Category: ${category.name}`);

      const brandCodeframe = await this.buildBrandCodeframe(
        answers,
        category,
        config,
        generationId
      );

      console.log(`\n✅ Python response received:`, {
        has_codes: !!brandCodeframe.codes,
        n_codes: brandCodeframe.codes?.length || 0,
        theme_name: brandCodeframe.theme_name,
        processing_time: brandCodeframe.processing_time_ms
      });

      // Save brand codeframe result to database
      await this.saveBrandCodeframeResult(generationId, brandCodeframe);

      console.log(
        `\n🎉 Brand codeframe complete: ${brandCodeframe.total_brands_found} brands found, ` +
        `${brandCodeframe.verified_count} verified, ${brandCodeframe.review_count} review, ${brandCodeframe.spam_count} spam`
      );

    } catch (error) {
      console.error(`\n❌ Brand codeframe generation FAILED:`, error.message);
      console.error(`   Stack:`, error.stack);

      // Update generation status to failed
      await supabase
        .from('codeframe_generations')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', generationId);

      throw error;
    }
  }

  /**
   * Build brand codeframe using Python brand extraction endpoint
   */
  async buildBrandCodeframe(answers, category, config, generationId = null) {
    console.log('Calling Python brand codeframe builder...');
    console.log('Config keys received:', Object.keys(config));
    console.log('Pinecone API key present:', !!config.pinecone_api_key);
    console.log('Google API key present:', !!config.google_api_key);
    console.log('Anthropic API key present:', !!config.anthropic_api_key);

    const requestBody = {
      answers: answers.map(a => ({
        id: a.id,
        text: a.answer_text
      })),
      category_name: category.name,
      category_description: category.description || '',
      target_language: config.target_language || 'en',
      min_confidence: config.brand_min_confidence || null,
      enable_enrichment: config.brand_enable_enrichment !== false,
      generation_id: generationId,  // Add generation_id for progress tracking
      // Pass API keys from Settings (if provided)
      anthropic_api_key: config.anthropic_api_key || null,
      google_api_key: config.google_api_key || null,
      google_cse_cx_id: config.google_cse_cx_id || null,
      pinecone_api_key: config.pinecone_api_key || null
    };

    console.log('🔍 Request body API keys:', {
      anthropic: !!requestBody.anthropic_api_key,
      google: !!requestBody.google_api_key,
      google_cx: !!requestBody.google_cse_cx_id,
      pinecone: !!requestBody.pinecone_api_key,
      pinecone_value_length: requestBody.pinecone_api_key?.length || 0
    });

    try {
      // ✅ FIX: Add periodic health check during long-running operation
      // If Python crashes, we detect it quickly instead of waiting 10 minutes
      let healthCheckInterval;
      const checkHealth = async () => {
        try {
          await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      };

      // Poll health every 30 seconds during the operation
      healthCheckInterval = setInterval(async () => {
        const isHealthy = await checkHealth();
        if (!isHealthy) {
          clearInterval(healthCheckInterval);
          throw new Error('Python service died mid-processing - health check failed');
        }
        console.log('✅ Python service health check passed');
      }, 30000);

      try {
        const response = await axios.post(
          `${PYTHON_SERVICE_URL}/api/build_codeframe`,
          requestBody,
          {
            timeout: 600000, // 10 minutes timeout (brand extraction takes 3-8 min with 100+ answers)
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        // Clear health check interval on success
        clearInterval(healthCheckInterval);
        return response.data;
      } catch (error) {
        // Clear health check interval on error
        clearInterval(healthCheckInterval);
        throw error;
      }
    } catch (error) {
      console.error('Error calling brand codeframe builder:', error);
      throw new Error(
        `Failed to build brand codeframe: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Save brand codeframe result to database
   */
  async saveBrandCodeframeResult(generationId, brandCodeframe) {
    console.log(`\n🔍 ===== SAVING BRAND CODEFRAME RESULT =====`);
    console.log(`Generation ID: ${generationId}`);
    console.log(`Python response keys:`, Object.keys(brandCodeframe));
    console.log(`Verified brands:`, brandCodeframe.verified_brands?.length || 0);
    console.log(`Needs review:`, brandCodeframe.needs_review?.length || 0);
    console.log(`Spam/Invalid:`, brandCodeframe.spam_invalid?.length || 0);
    console.log(`Theme name:`, brandCodeframe.theme_name);
    console.log(`Processing time:`, brandCodeframe.processing_time_ms);

    // Combine all 3 groups into single array for DB storage
    const allBrands = [
      ...(brandCodeframe.verified_brands || []),
      ...(brandCodeframe.needs_review || []),
      ...(brandCodeframe.spam_invalid || [])
    ];

    if (allBrands.length === 0) {
      console.log('ℹ️  No brands found by AI - this is a valid result (AI did not identify any brand names in the answers)');
    } else {
      // Log first 3 brands
      console.log(`\n📝 First 3 brands (from all groups):`)
;
      allBrands.slice(0, 3).forEach((brand, i) => {
        console.log(`  ${i + 1}. ${brand.brand_name} (confidence: ${brand.confidence}, mentions: ${brand.mention_count})`);
      });
    }

    // Convert brand codes to hierarchy format
    const hierarchy = this.convertBrandCodesToHierarchy(brandCodeframe, generationId, allBrands);
    console.log(`\n🌳 Hierarchy nodes created: ${hierarchy.length} (1 theme + ${hierarchy.length - 1} codes)`);

    // Calculate statistics
    const totalCodes = allBrands.length;
    const processingTimeMs = brandCodeframe.processing_time_ms;

    // Update generation record
    console.log(`\n💾 Updating generation record...`);
    const { error: updateError } = await supabase
      .from('codeframe_generations')
      .update({
        status: 'completed',
        progress_percent: 100,
        n_clusters: 1,
        n_themes: 1,
        n_codes: totalCodes,
        processing_time_ms: processingTimeMs,
        completed_at: new Date().toISOString()
      })
      .eq('id', generationId);

    if (updateError) {
      console.error('❌ Failed to update generation:', updateError);
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }
    console.log(`✅ Generation record updated`);

    // Save hierarchy
    console.log(`\n💾 Saving ${hierarchy.length} nodes to codeframe_hierarchy...`);
    await this.saveHierarchyToDatabase(generationId, hierarchy);

    console.log(`✅ Brand codeframe result saved: ${totalCodes} brands`);
    console.log(`===== SAVE COMPLETE =====\n`);
  }

  /**
   * Save hierarchy nodes to database
   */
  async saveHierarchyToDatabase(generationId, hierarchy) {
    if (!hierarchy || hierarchy.length === 0) {
      console.log('No hierarchy to save');
      return;
    }

    const { error } = await supabase
      .from('codeframe_hierarchy')
      .insert(hierarchy);

    if (error) {
      throw new Error(`Failed to save hierarchy: ${error.message}`);
    }

    console.log(`Saved ${hierarchy.length} hierarchy nodes`);
  }

  /**
   * Convert brand codes to hierarchy format
   * @param {object} brandCodeframe - Brand codeframe response from Python
   * @param {string} generationId - Generation ID
   * @param {array} allBrands - Combined array of all brands from 3 groups
   */
  convertBrandCodesToHierarchy(brandCodeframe, generationId, allBrands) {
    const hierarchy = [];

    // Create root node (theme)
    const themeId = crypto.randomUUID();
    const themeNode = {
      id: themeId,
      generation_id: generationId,
      name: brandCodeframe.theme_name,
      description: brandCodeframe.theme_description,
      level: 1,
      node_type: 'theme',
      confidence: brandCodeframe.theme_confidence,
      cluster_size: null,
      cluster_id: null,
      parent_id: null,
      display_order: 0,
      is_auto_generated: true
    };

    hierarchy.push(themeNode);

    // Add brand codes from all groups
    allBrands.forEach((brandCode, index) => {
      // Log embedding status
      if (index === 0) {
        console.log(`First brand embedding check:`, {
          has_embedding: !!brandCode.embedding,
          embedding_type: typeof brandCode.embedding,
          embedding_length: brandCode.embedding ? brandCode.embedding.length : 0
        });
      }

      const codeNode = {
        id: crypto.randomUUID(),
        generation_id: generationId,
        name: brandCode.brand_name,
        code_name: brandCode.brand_name,
        description: brandCode.description,
        level: 2,
        node_type: 'code',
        confidence: brandCode.confidence,
        cluster_size: brandCode.mention_count,
        cluster_id: null,
        parent_id: themeId,
        display_order: index,
        is_auto_generated: true,
        frequency_estimate: brandCode.frequency_estimate,
        example_texts: JSON.stringify(brandCode.example_texts),
        embedding: brandCode.embedding ? JSON.stringify(brandCode.embedding) : null,
        validation_evidence: brandCode.validation_evidence ? JSON.stringify(brandCode.validation_evidence) : null,
        variants: brandCode.variants ? JSON.stringify(brandCode.variants) : null  // Add variants
      };

      hierarchy.push(codeNode);
    });

    return hierarchy;
  }
}

export default new CodeframeService();
