import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigate() {
  // Get model
  const { data: model } = await supabase
    .from('models')
    .select('id, username, user_id, created_at')
    .eq('username', 'giadierking')
    .single();

  console.log('Model:', model);
  if (!model) return;

  // Get actor for this model
  const { data: actor } = await supabase
    .from('actors')
    .select('id, user_id, type')
    .eq('user_id', model.user_id)
    .single();

  console.log('Actor:', actor);

  // Check ALL media_assets for any reference to this model or actor
  console.log('\n--- Searching all media_assets ---');

  // By model_id
  const { data: byModelId, count: c1 } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('model_id', model.id);
  console.log(`By model_id (${model.id}):`, c1);

  // By owner_id = model.id
  const { data: byOwnerModelId, count: c2 } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('owner_id', model.id);
  console.log(`By owner_id = model.id:`, c2);

  // By owner_id = actor.id (if different)
  if (actor && actor.id !== model.id) {
    const { data: byOwnerActorId, count: c3 } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact' })
      .eq('owner_id', actor.id);
    console.log(`By owner_id = actor.id (${actor.id}):`, c3);
  }

  // Check storage bucket directly for any files
  console.log('\n--- Checking storage buckets ---');

  // Check portfolio bucket
  const { data: portfolioFiles } = await supabase.storage
    .from('portfolio')
    .list(model.id, { limit: 20 });
  console.log(`Files in portfolio/${model.id}:`, portfolioFiles?.length || 0);
  portfolioFiles?.forEach(f => console.log(`  - ${f.name}`));

  // Check with actor.id if different
  if (actor && actor.id !== model.id) {
    const { data: portfolioFilesActor } = await supabase.storage
      .from('portfolio')
      .list(actor.id, { limit: 20 });
    console.log(`Files in portfolio/${actor.id}:`, portfolioFilesActor?.length || 0);
    portfolioFilesActor?.forEach(f => console.log(`  - ${f.name}`));
  }

  // Check avatars bucket
  const { data: avatarFiles } = await supabase.storage
    .from('avatars')
    .list(model.id, { limit: 20 });
  console.log(`Files in avatars/${model.id}:`, avatarFiles?.length || 0);

  if (actor && actor.id !== model.id) {
    const { data: avatarFilesActor } = await supabase.storage
      .from('avatars')
      .list(actor.id, { limit: 20 });
    console.log(`Files in avatars/${actor.id}:`, avatarFilesActor?.length || 0);
    avatarFilesActor?.forEach(f => console.log(`  - ${f.name}`));
  }

  // Search by URL pattern in media_assets
  console.log('\n--- Searching by URL pattern ---');
  const { data: byUrl } = await supabase
    .from('media_assets')
    .select('id, url, model_id, owner_id, asset_type, created_at')
    .or(`url.ilike.%${model.id}%,url.ilike.%${actor?.id}%`);

  console.log('Media with model/actor ID in URL:', byUrl?.length || 0);
  byUrl?.forEach(m => {
    console.log(`  - model_id=${m.model_id}, owner_id=${m.owner_id}, type=${m.asset_type}`);
    console.log(`    URL: ${m.url?.substring(0, 80)}...`);
  });

  // Check if there's any media created around Jan 15
  console.log('\n--- Media created around Jan 15, 2026 ---');
  const { data: jan15Media } = await supabase
    .from('media_assets')
    .select('id, url, model_id, owner_id, created_at')
    .gte('created_at', '2026-01-14')
    .lte('created_at', '2026-01-16')
    .limit(20);

  console.log('Media from Jan 14-16:', jan15Media?.length || 0);
  jan15Media?.forEach(m => {
    console.log(`  - ${m.created_at} | model_id=${m.model_id}`);
  });
}

investigate();
