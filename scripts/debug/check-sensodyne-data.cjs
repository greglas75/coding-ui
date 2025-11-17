const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSensodyneData() {
  console.log('\n🔍 Checking all brands in latest generation...\n');

  // Get latest generation
  const { data: gens } = await supabase
    .from('codeframe_generations')
    .select('id, config')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  let genId = null;
  for (const gen of gens || []) {
    if (gen.config?.coding_type === 'brand') {
      genId = gen.id;
      break;
    }
  }

  if (!genId) {
    console.log('No brand generation found');
    return;
  }

  console.log(`Generation ID: ${genId}\n`);

  // Check ALL brands (ignore generation_id)
  const { data: brands } = await supabase
    .from('codeframe_hierarchy')
    .select('id, name, confidence, updated_at, generation_id')
    .order('updated_at', { ascending: false })
    .limit(20);

  console.log(`Total brands in codeframe_hierarchy: ${brands?.length || 0}\n`);

  // Check if brands are in generation result instead
  console.log('Checking codeframe_generations.result...\n');

  const { data: genData } = await supabase
    .from('codeframe_generations')
    .select('id, result')
    .eq('id', genId)
    .single();

  if (genData && genData.result) {
    console.log('Result structure:');
    console.log(JSON.stringify(genData.result, null, 2).substring(0, 1000));
  }

  return; // Exit early

  for (const brand of brands || []) {
    console.log(`- ${brand.name} (${brand.confidence}) - Updated: ${brand.updated_at}`);
  }

  // Show validation evidence for first brand with data
  if (brands && brands.length > 0) {
    const { data: fullBrand } = await supabase
      .from('codeframe_hierarchy')
      .select('*')
      .eq('id', brands[0].id)
      .single();

    console.log(`\n📦 Sample validation_evidence for ${fullBrand.name}:\n`);

    const evidence = typeof fullBrand.validation_evidence === 'string'
      ? JSON.parse(fullBrand.validation_evidence)
      : fullBrand.validation_evidence;

    console.log(JSON.stringify(evidence, null, 2).substring(0, 2000));
  }
}

checkSensodyneData();
