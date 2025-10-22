import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://hoanegucluoshmpoxfnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYW5lZ3VjbHVvc2htcG94Zm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxODk0OTIsImV4cCI6MjA0OTc2NTQ5Mn0.ygSdE_mH0SqJ_5yw-RcXL54O33sfPjuq-cDW7ht7Wcs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying vision_model migration...');

    // Read migration file
    const migration = readFileSync('supabase/migrations/20250123000000_add_vision_model.sql', 'utf-8');

    // Execute via RPC (more reliable for DDL)
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migration
    });

    if (error) {
      console.error('❌ Migration failed:', error);

      // Fallback: try direct execution
      console.log('🔄 Trying direct execution...');
      const { error: directError } = await supabase.from('categories').select('vision_model').limit(1);

      if (directError && directError.message.includes('column "vision_model" does not exist')) {
        console.error('❌ Column does not exist. Please run SQL manually:');
        console.log('\n' + migration + '\n');
        process.exit(1);
      } else {
        console.log('✅ Column already exists!');
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Verify column exists
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('id, name, vision_model')
      .limit(1);

    if (testError) {
      console.error('❌ Verification failed:', testError.message);
    } else {
      console.log('✅ Column verified:', testData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applyMigration();
