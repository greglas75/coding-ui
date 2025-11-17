const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  // Get ANY sample answer
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('category_id', 2) // toothpaste
    .limit(3);

  if (answers && answers.length > 0) {
    console.log('\n📦 Sample answers structure:\n');
    console.log('Total columns:', Object.keys(answers[0]).join(', '));
    console.log('\nFirst answer:');
    console.log(JSON.stringify(answers[0], null, 2));
  } else {
    console.log('No answers found');
  }
}

check();
