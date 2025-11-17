/**
 * Debug script to check codeframe_hierarchy table
 * Run with: node debug-hierarchy.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phmxhtqljkrwftawxwjg.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobXhodHFsamtyd2Z0YXd4d2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2MzA1NzQsImV4cCI6MjA1NTIwNjU3NH0.RQN9fNxgRGOMWC9Jf5qRo4mfKCFCO-CzXMpbZ0GELik';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugHierarchy() {
  const generationId = '16055114-a73e-4d87-b622-85280a338b55';

  console.log(`\n🔍 Checking hierarchy for generation: ${generationId}\n`);

  // 1. Check generation record
  const { data: generation, error: genError } = await supabase
    .from('codeframe_generations')
    .select('*')
    .eq('id', generationId)
    .single();

  if (genError) {
    console.error('❌ Error fetching generation:', genError);
    return;
  }

  console.log('✅ Generation record:', {
    id: generation.id,
    status: generation.status,
    n_themes: generation.n_themes,
    n_codes: generation.n_codes,
    n_clusters: generation.n_clusters,
    completed_at: generation.completed_at
  });

  // 2. Check hierarchy nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('codeframe_hierarchy')
    .select('*')
    .eq('generation_id', generationId)
    .order('display_order');

  if (nodesError) {
    console.error('❌ Error fetching hierarchy:', nodesError);
    return;
  }

  console.log(`\n📊 Hierarchy nodes: ${nodes.length} total`);

  if (nodes.length === 0) {
    console.log('⚠️  NO HIERARCHY NODES FOUND! This is the problem.');
    console.log('   The generation completed but hierarchy was not saved to database.');
    return;
  }

  // Group by node type
  const themes = nodes.filter(n => n.node_type === 'theme');
  const codes = nodes.filter(n => n.node_type === 'code');

  console.log(`   - Themes: ${themes.length}`);
  console.log(`   - Codes: ${codes.length}`);

  console.log('\n🌳 Theme nodes:');
  themes.forEach(theme => {
    console.log(`   - "${theme.name}" (${theme.node_type})`);
    console.log(`     ID: ${theme.id}`);
    console.log(`     Confidence: ${theme.confidence}`);
  });

  console.log('\n📝 Code nodes (first 10):');
  codes.slice(0, 10).forEach((code, i) => {
    console.log(`   ${i + 1}. "${code.name}" (code_name: ${code.code_name})`);
    console.log(`      Parent: ${code.parent_id}`);
    console.log(`      Confidence: ${code.confidence}`);
    console.log(`      Mention count: ${code.cluster_size}`);
    console.log(`      Has embedding: ${!!code.embedding}`);
  });

  if (codes.length > 10) {
    console.log(`   ... and ${codes.length - 10} more codes`);
  }

  console.log('\n✅ Debug complete\n');
}

debugHierarchy().catch(console.error);
