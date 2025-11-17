// ═══════════════════════════════════════════════════════════════
// 🔍 Debug Category Save Issue
// Purpose: Debug why category model settings are not saving
// ═══════════════════════════════════════════════════════════════

// Check if we can access the browser console
console.log('🔍 Debug Category Save Issue');

// Check if Supabase client is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase client available');
} else {
  console.log('❌ Supabase client not available');
}

// Check if categories table exists and has the right columns
async function checkCategoriesTable() {
  try {
    const { data, error } = await supabase.from('categories').select('*').limit(1);

    if (error) {
      console.error('❌ Error accessing categories table:', error);
      return;
    }

    console.log('✅ Categories table accessible');
    console.log('📋 Sample category data:', data[0]);

    // Check if AI model columns exist
    const sample = data[0];
    const aiColumns = [
      'model',
      'openai_model',
      'claude_model',
      'gemini_model',
      'vision_model',
      'llm_preset',
      'gpt_template',
      'sentiment_enabled',
      'sentiment_mode',
    ];

    console.log('🔍 Checking AI model columns:');
    aiColumns.forEach(column => {
      if (sample && column in sample) {
        console.log(`✅ ${column}: ${sample[column]}`);
      } else {
        console.log(`❌ ${column}: MISSING`);
      }
    });
  } catch (error) {
    console.error('❌ Error checking categories table:', error);
  }
}

// Run the check
checkCategoriesTable();

// ═══════════════════════════════════════════════════════════════
// Instructions:
// 1. Open browser console (F12)
// 2. Paste this script
// 3. Check the output for missing columns
// 4. If columns are missing, run the SQL migration
// ═══════════════════════════════════════════════════════════════
