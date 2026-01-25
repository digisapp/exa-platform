import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    mimetype?: string;
    size?: number;
  };
}

interface Model {
  id: string;
  username: string;
  user_id: string;
}

async function reconcileStorageMedia() {
  console.log('=== Storage-Database Reconciliation ===\n');

  // Get all models (handle pagination for large datasets)
  const allModels: Model[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error: modelsError } = await supabase
      .from('models')
      .select('id, username, user_id')
      .eq('is_approved', true)
      .range(offset, offset + batchSize - 1);

    if (modelsError) {
      console.error('Error fetching models:', modelsError);
      return;
    }

    if (!batch || batch.length === 0) break;
    allModels.push(...batch);
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  const models = allModels;
  console.log(`Found ${models.length} approved models\n`);

  const orphanedFiles: { modelId: string; username: string; files: StorageFile[] }[] = [];
  let totalOrphaned = 0;
  let totalReconciled = 0;

  for (const model of models || []) {
    // Get files from storage for this model
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('portfolio')
      .list(model.id, { limit: 100 });

    if (listError) {
      console.error(`Error listing files for ${model.username}:`, listError);
      continue;
    }

    // Filter out .emptyFolderPlaceholder and get actual files
    const actualFiles = (storageFiles || []).filter(
      (f) => !f.name.startsWith('.') && f.name !== '.emptyFolderPlaceholder'
    );

    if (actualFiles.length === 0) continue;

    // Get existing media_assets for this model
    const { data: existingMedia } = await supabase
      .from('media_assets')
      .select('storage_path')
      .eq('model_id', model.id);

    const existingPaths = new Set(existingMedia?.map((m) => m.storage_path) || []);

    // Find orphaned files (in storage but not in database)
    const orphaned = actualFiles.filter((f) => {
      const storagePath = `${model.id}/${f.name}`;
      return !existingPaths.has(storagePath);
    });

    if (orphaned.length > 0) {
      orphanedFiles.push({
        modelId: model.id,
        username: model.username,
        files: orphaned as StorageFile[],
      });
      totalOrphaned += orphaned.length;
      console.log(`${model.username}: ${orphaned.length} orphaned files`);
      orphaned.forEach((f) => console.log(`  - ${f.name}`));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Models with orphaned files: ${orphanedFiles.length}`);
  console.log(`Total orphaned files: ${totalOrphaned}\n`);

  if (totalOrphaned === 0) {
    console.log('No orphaned files found. All storage files have database records.');
    return;
  }

  // Ask for confirmation before creating records
  console.log('Creating missing media_assets records...\n');

  for (const { modelId, username, files } of orphanedFiles) {
    // Get actor ID for this model
    const { data: model } = await supabase
      .from('models')
      .select('user_id')
      .eq('id', modelId)
      .single();

    if (!model) {
      console.error(`Could not find model ${username}`);
      continue;
    }

    const { data: actor } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', model.user_id)
      .single();

    if (!actor) {
      console.error(`Could not find actor for ${username}`);
      continue;
    }

    for (const file of files) {
      const storagePath = `${modelId}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(storagePath);

      const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm');
      const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ||
                      file.name.endsWith('.png') || file.name.endsWith('.webp') || file.name.endsWith('.gif');

      const mimeType = isVideo
        ? file.name.endsWith('.mp4') ? 'video/mp4' : file.name.endsWith('.mov') ? 'video/quicktime' : 'video/webm'
        : file.name.endsWith('.png') ? 'image/png' : file.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      const { error: insertError } = await supabase.from('media_assets').insert({
        owner_id: actor.id,
        model_id: modelId,
        type: isVideo ? 'video' : 'photo',
        asset_type: isVideo ? 'video' : 'portfolio',
        photo_url: isImage ? urlData.publicUrl : null,
        url: urlData.publicUrl,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.metadata?.size || null,
      });

      if (insertError) {
        console.error(`Failed to create record for ${storagePath}:`, insertError.message);
      } else {
        console.log(`✓ Created: ${username}/${file.name}`);
        totalReconciled++;
      }
    }
  }

  console.log(`\n=== Reconciliation Complete ===`);
  console.log(`Successfully created ${totalReconciled} media_assets records`);
}

reconcileStorageMedia();
