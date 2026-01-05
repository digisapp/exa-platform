require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAccounts() {
  // Get all accounts with email in instagram field
  const { data } = await supabase
    .from('models')
    .select('id, username, first_name, email, instagram_name')
    .or('instagram_name.ilike.%gmail%,instagram_name.ilike.%icloud%,instagram_name.ilike.%yahoo%,instagram_name.ilike.%hotmail%,instagram_name.ilike.%outlook%');

  console.log('Fixing', data?.length, 'accounts...\n');

  for (const m of data || []) {
    // Verify email field has email
    if (!m.email) {
      console.log('WARNING:', m.username, '- no email in email field!');
      continue;
    }

    // Clear instagram field
    const { error } = await supabase
      .from('models')
      .update({ instagram_name: null })
      .eq('id', m.id);

    if (error) {
      console.log('ERROR:', m.username, '-', error.message);
    } else {
      console.log('Fixed:', m.username, '| Email:', m.email, '| Cleared IG:', m.instagram_name);
    }
  }

  console.log('\n=== DONE ===');
}

fixAccounts();
