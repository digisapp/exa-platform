const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Check if messages table exists and its columns
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error querying messages:', error);
  } else {
    console.log('Messages table query succeeded. Sample:', data);
  }

  // Try to get schema info
  const { data: schema, error: schemaError } = await supabase.rpc('get_table_columns', {
    table_name: 'messages'
  });

  if (schemaError) {
    console.log('Schema query error (expected):', schemaError.message);
  } else {
    console.log('Schema:', schema);
  }
}

checkSchema();
