const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

(async () => {
  // Find donatellabarbero
  const { data: model, error: modelErr } = await supabase
    .from('models')
    .select('id, username, first_name, last_name, profile_photo_url, user_id')
    .ilike('username', 'donatellabarbero')
    .single();

  if (modelErr || !model) {
    console.log('Model not found:', modelErr?.message);
    process.exit(1);
  }
  console.log('Model:', model.first_name, model.last_name, '(' + model.username + ')');
  console.log('Profile photo URL:', model.profile_photo_url || 'NONE');
  console.log('Model ID:', model.id);
  console.log('User ID:', model.user_id);

  // Get actor
  const { data: actor } = await supabase
    .from('actors')
    .select('id, type')
    .eq('user_id', model.user_id)
    .single();

  console.log('Actor ID:', actor?.id, 'Type:', actor?.type);

  // List storage buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.log('Error listing buckets:', bucketsErr.message);
  } else {
    console.log('\nBuckets:', buckets.map(b => `${b.name} (public:${b.public})`).join(', '));
  }

  // Try listing files in the avatars bucket for this actor
  if (actor?.id) {
    const { data: avatarFiles, error: avatarErr } = await supabase.storage
      .from('avatars')
      .list(actor.id);

    if (avatarErr) {
      console.log('\nAvatars bucket list error for actor folder:', avatarErr.message);
    } else {
      console.log('\nFiles in avatars/' + actor.id + ':', avatarFiles?.length || 0);
    }

    // Also check portfolio
    const { data: portfolioFiles, error: portfolioErr } = await supabase.storage
      .from('portfolio')
      .list(actor.id);

    if (portfolioErr) {
      console.log('Portfolio bucket list error:', portfolioErr.message);
    } else {
      console.log('Files in portfolio/' + actor.id + ':', portfolioFiles?.length || 0);
    }
  }

  // Try a test upload to avatars bucket
  if (actor?.id) {
    const testBuffer = Buffer.from('test');
    const testPath = `${actor.id}/test-upload-delete-me.txt`;
    const { error: testUploadErr } = await supabase.storage
      .from('avatars')
      .upload(testPath, testBuffer, { contentType: 'text/plain', upsert: true });

    if (testUploadErr) {
      console.log('\nTest upload to avatars FAILED:', testUploadErr.message);
    } else {
      console.log('\nTest upload to avatars SUCCEEDED');
      // Clean up test file
      await supabase.storage.from('avatars').remove([testPath]);
    }
  }

  // Check media_assets count for this actor
  if (actor?.id) {
    const { count } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', actor.id);
    console.log('\nMedia assets count:', count);

    const { data: avatarAssets } = await supabase
      .from('media_assets')
      .select('id, source, url, created_at')
      .eq('owner_id', actor.id)
      .eq('source', 'avatar')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Avatar media assets:', avatarAssets?.length || 0);
    if (avatarAssets?.length) console.log('Latest:', avatarAssets[0]);
  }
})();
