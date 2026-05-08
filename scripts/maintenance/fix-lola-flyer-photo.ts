/**
 * One-off: Lola Greiner's profile photo has EXIF Orientation=6 (rotate 90 CW),
 * which causes her flyer (rendered via next/og + Satori) to look sideways
 * because Satori does not honor EXIF orientation. This script downloads her
 * photo, bakes the rotation into the pixels, strips EXIF, and re-uploads to
 * the same path so existing references continue to work.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import sharp from 'sharp';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL_USERNAME = 'lolagreiner';

async function go() {
  const { data: model, error } = await supabase
    .from('models')
    .select('id, username, first_name, profile_photo_url')
    .eq('username', MODEL_USERNAME)
    .single();
  if (error || !model) throw new Error(`Model not found: ${error?.message}`);

  console.log('Model:', model.first_name, model.username, model.id);
  console.log('Photo URL:', model.profile_photo_url);

  if (!model.profile_photo_url) throw new Error('No profile_photo_url');

  // Public URL pattern: .../object/public/<bucket>/<path>
  const m = model.profile_photo_url.match(/\/object\/public\/([^/]+)\/(.+?)(\?.*)?$/);
  if (!m) throw new Error(`Cannot parse storage path from URL`);
  const bucket = m[1];
  const objectPath = m[2];
  console.log('Bucket:', bucket, 'Path:', objectPath);

  // Download
  const res = await fetch(model.profile_photo_url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const inputBuf = Buffer.from(await res.arrayBuffer());
  console.log('Downloaded:', inputBuf.length, 'bytes');

  const meta = await sharp(inputBuf).metadata();
  console.log('Original meta:', {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    orientation: meta.orientation,
  });

  // Bake rotation in, strip EXIF, re-encode JPEG at high quality
  const rotated = await sharp(inputBuf)
    .rotate() // applies EXIF orientation
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  console.log('Rotated meta:', {
    width: rotated.info.width,
    height: rotated.info.height,
    bytes: rotated.data.length,
  });

  // Re-upload (overwrite)
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(objectPath, rotated.data, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  console.log('Re-uploaded ✓');

  // Cache-bust profile_photo_url
  const newUrl = model.profile_photo_url.split('?')[0] + `?v=${Date.now()}`;
  const { error: updErr } = await supabase
    .from('models')
    .update({ profile_photo_url: newUrl })
    .eq('id', model.id);
  if (updErr) throw new Error(`DB update failed: ${updErr.message}`);
  console.log('profile_photo_url cache-busted ✓');
  console.log('New URL:', newUrl);
}

go().catch((e) => {
  console.error(e);
  process.exit(1);
});
