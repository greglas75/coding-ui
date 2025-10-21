/**
 * Bull Queue Configuration for AI Codeframe Generation
 * Handles background processing of cluster-based codeframe generation
 */

import Bull from 'bull';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Python microservice URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Create Bull queue with persistence-optimized configuration
const codeframeQueue = new Bull('codeframe-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    // CRITICAL: maxRetriesPerRequest: null ensures jobs survive Redis reconnection
    // Without this, jobs may be lost if Redis restarts or connection drops
    maxRetriesPerRequest: null,
    // NOTE: enableReadyCheck removed - Bull doesn't support it for bclient/subscriber
    // Keep trying to reconnect
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    // Keep completed jobs for debugging (false = keep forever, or use number to keep last N)
    removeOnComplete: false, // Changed from 100 to false - keeps ALL completed jobs
    // Keep failed jobs for debugging
    removeOnFail: false, // Changed from 500 to false - keeps ALL failed jobs
  },
});

/**
 * Process a single cluster codeframe generation job
 */
codeframeQueue.process('generate-cluster', async (job) => {
  const { generation_id, cluster_id, cluster_texts, category_info, config } = job.data;

  console.log(`[Job ${job.id}] Processing cluster ${cluster_id} for generation ${generation_id}`);

  try {
    // Update job progress
    await job.progress(10);

    // Call Python microservice to generate codeframe
    console.log(`[Job ${job.id}] Calling Python service...`);
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/generate-codeframe`,
      {
        cluster_texts,
        category_name: category_info.name,
        category_description: category_info.description || '',
        target_language: config.target_language || 'en',
        existing_codes: config.existing_codes || [],
        hierarchy_preference: config.hierarchy_preference || 'adaptive',
      },
      {
        timeout: 120000, // 2 minutes timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    await job.progress(60);

    const codeframeResult = response.data;

    console.log(`[Job ${job.id}] Received codeframe from Python service`);
    console.log(`[Job ${job.id}] Theme: ${codeframeResult.theme.name}`);
    console.log(`[Job ${job.id}] Codes: ${codeframeResult.codes.length}`);
    console.log(`[Job ${job.id}] MECE Score: ${codeframeResult.mece_score}`);

    // Save cluster result to database
    await saveClusterResult(generation_id, cluster_id, codeframeResult, category_info);

    await job.progress(90);

    // Update generation progress
    await updateGenerationProgress(generation_id);

    await job.progress(100);

    console.log(`[Job ${job.id}] Cluster ${cluster_id} completed successfully`);

    return {
      success: true,
      cluster_id,
      generation_id,
      theme: codeframeResult.theme.name,
      n_codes: codeframeResult.codes.length,
      mece_score: codeframeResult.mece_score,
      cost_usd: codeframeResult.cost_usd,
    };
  } catch (error) {
    console.error(`[Job ${job.id}] Cluster ${cluster_id} failed:`, error.message);

    // Log failure to database
    await logClusterFailure(generation_id, cluster_id, error);

    throw error; // Bull will retry based on job options
  }
});

/**
 * Save cluster codeframe result to database
 */
async function saveClusterResult(generation_id, cluster_id, codeframeResult, category_info) {
  console.log(`Saving cluster ${cluster_id} result to database...`);

  // 1. Insert theme node into hierarchy
  const { data: themeNode, error: themeError } = await supabase
    .from('codeframe_hierarchy')
    .insert({
      generation_id,
      parent_id: null,
      level: 1,
      node_type: 'theme',
      name: codeframeResult.theme.name,
      description: codeframeResult.theme.description,
      confidence: codeframeResult.theme.confidence,
      cluster_id,
      cluster_size: codeframeResult.cluster_texts?.length || 0,
      display_order: cluster_id,
    })
    .select()
    .single();

  if (themeError) {
    console.error('Error inserting theme node:', themeError);
    throw themeError;
  }

  console.log(`Theme node created: ${themeNode.id}`);

  // 2. Insert code nodes (with recursive sub-codes support)
  const insertCodeNodes = async (codes, parent_id, level) => {
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

      const { data: codeNode, error: codeError } = await supabase
        .from('codeframe_hierarchy')
        .insert({
          generation_id,
          parent_id,
          level,
          node_type: 'code',
          name: code.name,
          description: code.description,
          confidence: code.confidence,
          example_texts: code.example_texts,
          frequency_estimate: code.frequency_estimate,
          display_order: i,
        })
        .select()
        .single();

      if (codeError) {
        console.error(`Error inserting code node ${code.name}:`, codeError);
        throw codeError;
      }

      console.log(`Code node created: ${codeNode.name} (${codeNode.id})`);

      // Recursively insert sub-codes
      if (code.sub_codes && code.sub_codes.length > 0) {
        await insertCodeNodes(code.sub_codes, codeNode.id, level + 1);
      }
    }
  };

  await insertCodeNodes(codeframeResult.codes, themeNode.id, 2);

  // 3. Update generation record with cluster stats
  const { error: updateError } = await supabase.rpc('increment_cluster_stats', {
    p_generation_id: generation_id,
    p_mece_score: codeframeResult.mece_score,
    p_cost_usd: codeframeResult.cost_usd,
    p_input_tokens: codeframeResult.usage.input_tokens,
    p_output_tokens: codeframeResult.usage.output_tokens,
  });

  if (updateError) {
    console.warn('Could not update cluster stats (RPC function may not exist):', updateError.message);
    // Non-critical, continue
  }

  console.log(`Cluster ${cluster_id} saved successfully`);
}

/**
 * Update generation progress and status
 */
async function updateGenerationProgress(generation_id) {
  console.log(`Updating generation ${generation_id} progress...`);

  // Get all hierarchy nodes for this generation
  const { data: nodes, error: nodesError } = await supabase
    .from('codeframe_hierarchy')
    .select('id, node_type, cluster_id')
    .eq('generation_id', generation_id);

  if (nodesError) {
    console.error('Error fetching hierarchy nodes:', nodesError);
    return;
  }

  // Count unique clusters (themes)
  const themes = nodes.filter((n) => n.node_type === 'theme');
  const codes = nodes.filter((n) => n.node_type === 'code');

  // Get total expected clusters from generation record
  const { data: generation, error: genError } = await supabase
    .from('codeframe_generations')
    .select('n_clusters, n_answers')
    .eq('id', generation_id)
    .single();

  if (genError) {
    console.error('Error fetching generation:', genError);
    return;
  }

  const n_completed_clusters = themes.length;
  const n_total_clusters = generation.n_clusters || 0;
  const all_clusters_complete = n_completed_clusters >= n_total_clusters;

  // Update generation record
  const { error: updateError } = await supabase
    .from('codeframe_generations')
    .update({
      n_themes: themes.length,
      n_codes: codes.length,
      status: all_clusters_complete ? 'completed' : 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', generation_id);

  if (updateError) {
    console.error('Error updating generation progress:', updateError);
  } else {
    console.log(
      `Generation ${generation_id}: ${n_completed_clusters}/${n_total_clusters} clusters complete`
    );
  }
}

/**
 * Log cluster failure to database
 */
async function logClusterFailure(generation_id, cluster_id, error) {
  console.log(`Logging failure for cluster ${cluster_id}...`);

  try {
    const { error: updateError } = await supabase
      .from('codeframe_generations')
      .update({
        status: 'failed',
        mece_warnings: {
          error: error.message,
          cluster_id,
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', generation_id);

    if (updateError) {
      console.error('Error logging failure:', updateError);
    }
  } catch (err) {
    console.error('Error in logClusterFailure:', err);
  }
}

/**
 * Event handlers for queue monitoring
 */
codeframeQueue.on('completed', (job, result) => {
  console.log(`✓ Job ${job.id} completed:`, result);
});

codeframeQueue.on('failed', (job, err) => {
  console.error(`✗ Job ${job.id} failed:`, err.message);
});

codeframeQueue.on('stalled', (job) => {
  console.warn(`⚠ Job ${job.id} stalled`);
});

codeframeQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queue...');
  await codeframeQueue.close();
  process.exit(0);
});

export { codeframeQueue };
