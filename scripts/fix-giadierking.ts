import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixGiadierking() {
  // Get model details
  const { data: model } = await supabase
    .from('models')
    .select('id, username, user_id, is_approved')
    .eq('username', 'giadierking')
    .single();

  console.log('Model:', model);
  if (!model) return;

  // Get actor
  const { data: actor } = await supabase
    .from('actors')
    .select('id')
    .eq('user_id', model.user_id)
    .single();

  console.log('Actor:', actor);
  if (!actor) return;

  // Get files from storage
  const { data: files } = await supabase.storage
    .from('portfolio')
    .list(model.id, { limit: 100 });

  const actualFiles = (files || []).filter(
    (f) => !f.name.startsWith('.') && f.name !== '.emptyFolderPlaceholder'
  );

  console.log(`\nFound ${actualFiles.length} files in storage:`);
  actualFiles.forEach((f) => console.log(`  - ${f.name}`));

  // Check existing media_assets
  const { data: existingMedia } = await supabase
    .from('media_assets')
    .select('storage_path')
    .eq('model_id', model.id);

  console.log(`\nExisting media_assets: ${existingMedia?.length || 0}`);

  const existingPaths = new Set(existingMedia?.map((m) => m.storage_path) || []);

  // Find orphaned files
  const orphaned = actualFiles.filter((f) => {
    const storagePath = `${model.id}/${f.name}`;
    return !existingPaths.has(storagePath);
  });

  console.log(`\nOrphaned files: ${orphaned.length}`);

  if (orphaned.length === 0) {
    console.log('No orphaned files to fix.');
    return;
  }

  // Create missing records
  console.log('\nCreating missing media_assets records...');

  for (const file of orphaned) {
    const storagePath = `${model.id}/${file.name}`;
    const { data: urlData } = supabase.storage
      .from('portfolio')
      .getPublicUrl(storagePath);

    const isVideo =
      file.name.endsWith('.mp4') ||
      file.name.endsWith('.mov') ||
      file.name.endsWith('.webm') ||
      file.name.endsWith('.MOV') ||
      file.name.endsWith('.MP4');

    const mimeType = isVideo
      ? file.name.toLowerCase().endsWith('.mp4')
        ? 'video/mp4'
        : file.name.toLowerCase().endsWith('.mov')
        ? 'video/quicktime'
        : 'video/webm'
      : file.name.endsWith('.png')
      ? 'image/png'
      : file.name.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

    const { error: insertError } = await supabase.from('media_assets').insert({
      owner_id: actor.id,
      model_id: model.id,
      type: isVideo ? 'video' : 'photo',
      asset_type: isVideo ? 'video' : 'portfolio',
      photo_url: !isVideo ? urlData.publicUrl : null,
      url: urlData.publicUrl,
      storage_path: storagePath,
      mime_type: mimeType,
    });

    if (insertError) {
      console.error(`Failed to create record for ${file.name}:`, insertError.message);
    } else {
      console.log(`✓ Created: ${file.name}`);
    }
  }

  // Verify
  const { data: finalMedia } = await supabase
    .from('media_assets')
    .select('id, url')
    .eq('model_id', model.id);

  console.log(`\nFinal media_assets count: ${finalMedia?.length || 0}`);
}

fixGiadierking();
