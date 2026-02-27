const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

(async () => {
  const { data: model } = await supabase
    .from('models')
    .select('id, username, first_name, last_name')
    .ilike('username', 'donatellabarbero')
    .single();

  if (!model) { console.log('Model not found'); process.exit(1); }
  console.log('Found:', model.first_name, model.last_name);

  const fileBuffer = fs.readFileSync('/Users/examodels/Desktop/donatella-barbero.png');
  // Use timestamp to bust CDN cache
  const storagePath = `${model.id}-${Date.now()}.png`;

  const { error: uploadErr } = await supabase.storage
    .from('profile-pictures')
    .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: false });

  if (uploadErr) { console.log('Upload error:', uploadErr.message); process.exit(1); }

  const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(storagePath);

  const { error: updateErr } = await supabase
    .from('models')
    .update({ profile_photo_url: publicUrl })
    .eq('id', model.id);

  if (updateErr) {
    console.log('Update error:', updateErr.message);
  } else {
    console.log('Done:', publicUrl);
  }
})();
