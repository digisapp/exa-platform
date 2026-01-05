const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
  // Search models
  const { data: models } = await supabase
    .from('models')
    .select('id, username, first_name, last_name, email, is_approved, created_at')
    .or('first_name.ilike.%caroline%,last_name.ilike.%jaquish%,email.ilike.%caroline%,email.ilike.%jaquish%');

  console.log('Models found:', JSON.stringify(models, null, 2));

  // Search fans
  const { data: fans } = await supabase
    .from('fans')
    .select('id, display_name, email, created_at')
    .or('display_name.ilike.%caroline%,display_name.ilike.%jaquish%,email.ilike.%caroline%,email.ilike.%jaquish%');

  console.log('Fans found:', JSON.stringify(fans, null, 2));

  // Search auth users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const matchingUsers = users.filter(u =>
    u.email?.toLowerCase().includes('caroline') ||
    u.email?.toLowerCase().includes('jaquish')
  );
  console.log('Auth users found:', matchingUsers.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
}

search();
