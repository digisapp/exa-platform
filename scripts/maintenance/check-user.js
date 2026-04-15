require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const email = process.argv[2] || 'myersisabella16@gmail.com';

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.log('User not found:', email);
    return;
  }

  console.log('User ID:', user.id);
  console.log('Email:', user.email);

  const { data: actor } = await supabase
    .from('actors')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('Actor type:', actor?.type);
  console.log('Actor ID:', actor?.id);

  const { data: model } = await supabase
    .from('models')
    .select('id, first_name, last_name, username')
    .eq('user_id', user.id)
    .single();

  console.log('Model record:', model);
}

check();
