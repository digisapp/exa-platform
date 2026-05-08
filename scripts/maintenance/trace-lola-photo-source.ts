import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function go() {
  const path = '8852e24b-9c75-4ee1-bb46-233644b85c6b/1778169330367.jpg';
  console.log('Looking up media_assets for path:', path);

  const { data: byPath } = await supabase
    .from('media_assets')
    .select('*')
    .eq('storage_path', path);
  console.log('By storage_path:', JSON.stringify(byPath, null, 2));

  const { data: byUrl } = await supabase
    .from('media_assets')
    .select('*')
    .ilike('url', '%1778169330367%');
  console.log('By URL match:', JSON.stringify(byUrl, null, 2));

  const { data: byContentItem } = await supabase
    .from('content_items' as any)
    .select('*')
    .ilike('media_url', '%1778169330367%');
  console.log('By content_items.media_url:', JSON.stringify(byContentItem, null, 2));

  // Actor id vs model id
  const { data: model } = await supabase
    .from('models')
    .select('id, user_id')
    .eq('id', '8852e24b-9c75-4ee1-bb46-233644b85c6b')
    .single();
  console.log('Model:', model);

  if (model?.user_id) {
    const { data: actor } = await supabase
      .from('actors')
      .select('*')
      .eq('user_id', model.user_id)
      .single();
    console.log('Actor:', actor);
    console.log('actor.id == model.id?', (actor as any)?.id === model.id);
  }
}

go().catch((e) => { console.error(e); process.exit(1); });
