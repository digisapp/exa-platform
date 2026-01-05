require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteAccounts() {
  const usernames = [
    'amber004icloudcom',
    'nicolearaque15icloudcom',
    'michellerhornycicloudcom',
    'sierraearly'
  ];

  for (const username of usernames) {
    console.log('\n=== Deleting:', username, '===');

    // Get model record
    const { data: model } = await supabase
      .from('models')
      .select('id, user_id, email')
      .eq('username', username)
      .single();

    if (!model) {
      console.log('Model not found, skipping');
      continue;
    }

    console.log('Model ID:', model.id);
    console.log('User ID:', model.user_id);
    console.log('Email:', model.email);

    // Delete gig applications
    const { data: gigApps } = await supabase
      .from('gig_applications')
      .delete()
      .eq('model_id', model.id)
      .select('id');
    console.log('Deleted gig applications:', gigApps?.length || 0);

    // Delete actor record if exists
    if (model.user_id) {
      const { data: actor } = await supabase
        .from('actors')
        .delete()
        .eq('user_id', model.user_id)
        .select('id');
      console.log('Deleted actor:', actor?.length || 0);

      // Delete auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(model.user_id);
      console.log('Deleted auth user:', authErr ? 'ERROR - ' + authErr.message : 'OK');
    }

    // Delete model record
    const { error: modelErr } = await supabase
      .from('models')
      .delete()
      .eq('id', model.id);
    console.log('Deleted model:', modelErr ? 'ERROR - ' + modelErr.message : 'OK');
  }

  console.log('\n=== ALL DONE ===');
}

deleteAccounts();
