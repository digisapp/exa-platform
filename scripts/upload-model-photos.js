const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const models = [
  { file: '/Users/examodels/Desktop/sydney-lint.png',   firstName: 'sydney',  lastName: 'lint' },
  { file: '/Users/examodels/Desktop/ashley-flete.png',  firstName: 'ashley',  lastName: 'flete' },
  { file: '/Users/examodels/Desktop/ava-tortorici.png', firstName: 'ava',     lastName: 'tortorici' },
];

(async () => {
  for (const m of models) {
    const { data: model, error: findErr } = await supabase
      .from('models')
      .select('id, username, first_name, last_name, profile_photo_url')
      .ilike('first_name', m.firstName)
      .ilike('last_name', m.lastName)
      .single();

    if (findErr || !model) {
      console.log('NOT FOUND:', m.firstName, m.lastName, findErr ? findErr.message : '');
      continue;
    }

    console.log('Found:', model.first_name, model.last_name, '(' + model.username + ')');

    const fileBuffer = fs.readFileSync(m.file);
    const storagePath = model.id + '.png';

    const { error: uploadErr } = await supabase.storage
      .from('profile-pictures')
      .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      console.log('UPLOAD ERROR:', uploadErr.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(storagePath);

    const { error: updateErr } = await supabase
      .from('models')
      .update({ profile_photo_url: publicUrl })
      .eq('id', model.id);

    if (updateErr) {
      console.log('UPDATE ERROR:', updateErr.message);
    } else {
      console.log('Done:', model.first_name, model.last_name, '->', publicUrl);
    }
  }
})();
