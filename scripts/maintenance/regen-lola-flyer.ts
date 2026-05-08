/**
 * Regenerate Lola Greiner's flyer for any event(s) where she has one,
 * forcing a re-render so the corrected (rotated) profile photo is used.
 *
 * Approach: bypass the server route (since it runs in the dev/prod app
 * context) and just delete her existing flyer rows + storage files. The
 * admin UI will regenerate on next visit, OR we can call the generate
 * endpoint via fetch if the dev server is running.
 *
 * Simpler: just delete the existing flyer rows + storage so the next
 * generate run picks her up. Admin can hit "Regenerate" or it will get
 * picked up on next batch run.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL_ID = '8852e24b-9c75-4ee1-bb46-233644b85c6b';

async function go() {
  const { data: flyers } = await (supabase as any)
    .from('flyers')
    .select('id, event_id, storage_path, public_url')
    .eq('model_id', MODEL_ID);
  console.log('Existing flyers for Lola:', JSON.stringify(flyers, null, 2));

  if (!flyers || flyers.length === 0) {
    console.log('No flyers — nothing to regenerate.');
    return;
  }

  const paths = flyers.map((f: any) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from('portfolio').remove(paths);
    if (error) console.warn('Storage remove warning:', error.message);
    else console.log('Removed', paths.length, 'storage files');
  }

  const ids = flyers.map((f: any) => f.id);
  const { error: delErr } = await (supabase as any).from('flyers').delete().in('id', ids);
  if (delErr) throw new Error(`Flyer delete failed: ${delErr.message}`);
  console.log('Deleted', ids.length, 'flyer row(s)');
  console.log('Next admin /admin/flyers visit + "Generate" will rebuild with the corrected photo.');
}

go().catch((e) => { console.error(e); process.exit(1); });
