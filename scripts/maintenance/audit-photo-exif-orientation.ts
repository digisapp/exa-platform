/**
 * Scan every model's profile_photo_url AND every primary portrait
 * content_item for EXIF Orientation tags that aren't 1/none.
 *
 * Photos with orientation 2-8 render sideways/flipped in next/og (used by the
 * flyer renderer), since Satori does not honor EXIF orientation.
 *
 * Usage:
 *   npx tsx scripts/maintenance/audit-photo-exif-orientation.ts          # report only
 *   npx tsx scripts/maintenance/audit-photo-exif-orientation.ts --fix    # rotate-in-place
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

const FIX = process.argv.includes('--fix');
const CONCURRENCY = 6;

type Target = {
  source: 'profile_photo' | 'primary_portrait';
  modelId: string;
  username: string | null;
  firstName: string | null;
  bucket: string;
  storagePath: string;
  publicUrl: string;
  contentItemId?: string;
};

const ORIENT_LABELS: Record<number, string> = {
  1: 'normal',
  2: 'flip H',
  3: 'rotate 180',
  4: 'flip V',
  5: 'transpose',
  6: 'rotate 90 CW',
  7: 'transverse',
  8: 'rotate 270 CW',
};

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  // Public URL
  let m = url.match(/\/object\/public\/([^/]+)\/(.+?)(\?.*)?$/);
  if (m) return { bucket: m[1], path: m[2] };
  // Sign URL
  m = url.match(/\/object\/sign\/([^/]+)\/(.+?)(\?.*)?$/);
  if (m) return { bucket: m[1], path: m[2] };
  return null;
}

async function fetchAndCheck(t: Target): Promise<{
  ok: boolean;
  orientation: number | null;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}> {
  try {
    const { data: blob, error } = await supabase.storage
      .from(t.bucket)
      .download(t.storagePath);
    if (error) return { ok: false, orientation: null, error: error.message };
    const buf = Buffer.from(await blob.arrayBuffer());
    const meta = await sharp(buf).metadata();
    return {
      ok: true,
      orientation: (meta.orientation as number | undefined) ?? null,
      width: meta.width,
      height: meta.height,
      format: meta.format,
    };
  } catch (e: any) {
    return { ok: false, orientation: null, error: e.message };
  }
}

async function fixOne(t: Target): Promise<void> {
  const { data: blob } = await supabase.storage.from(t.bucket).download(t.storagePath);
  if (!blob) throw new Error('download failed');
  const buf = Buffer.from(await blob.arrayBuffer());
  const result = await sharp(buf)
    .rotate() // applies EXIF orientation
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  // Pick a safe contentType. We always re-encode to JPEG.
  const { error: upErr } = await supabase.storage
    .from(t.bucket)
    .upload(t.storagePath, result.data, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });
  if (upErr) throw new Error(upErr.message);

  // Update DB so dimensions are accurate AND public_url cache-busts
  if (t.source === 'profile_photo') {
    const newUrl =
      t.publicUrl.split('?')[0] + `?v=${Date.now()}`;
    await supabase
      .from('models')
      .update({
        profile_photo_url: newUrl,
        profile_photo_width: result.info.width,
        profile_photo_height: result.info.height,
      })
      .eq('id', t.modelId);
  } else if (t.source === 'primary_portrait' && t.contentItemId) {
    await (supabase as any)
      .from('content_items')
      .update({
        width: result.info.width,
        height: result.info.height,
      })
      .eq('id', t.contentItemId);
  }
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        await fn(items[idx]);
      } catch (e: any) {
        console.error('Worker error:', e.message);
      }
    }
  });
  await Promise.all(workers);
}

async function go() {
  console.log('Scanning model profile photos and primary portraits…');
  console.log('Mode:', FIX ? 'FIX' : 'REPORT ONLY');
  console.log();

  const { data: models } = await supabase
    .from('models')
    .select('id, username, first_name, profile_photo_url')
    .not('profile_photo_url', 'is', null);

  const { data: items } = await (supabase as any)
    .from('content_items')
    .select('id, model_id, media_url, media_type, is_primary')
    .eq('is_primary', true)
    .eq('media_type', 'image');

  const modelById = new Map((models || []).map((m: any) => [m.id, m]));

  const targets: Target[] = [];

  for (const m of models || []) {
    if (!m.profile_photo_url) continue;
    const parsed = parseStorageUrl(m.profile_photo_url);
    if (!parsed) {
      console.log(`SKIP profile_photo (non-storage URL): ${m.username} → ${m.profile_photo_url}`);
      continue;
    }
    targets.push({
      source: 'profile_photo',
      modelId: m.id,
      username: m.username,
      firstName: m.first_name,
      bucket: parsed.bucket,
      storagePath: parsed.path,
      publicUrl: m.profile_photo_url,
    });
  }

  for (const it of items || []) {
    const m: any = modelById.get(it.model_id);
    if (!m) continue;
    const url = it.media_url as string;
    let bucket = 'portfolio';
    let path = url;
    if (/^https?:\/\//i.test(url)) {
      const parsed = parseStorageUrl(url);
      if (!parsed) {
        console.log(`SKIP primary_portrait (non-storage URL): ${m.username} → ${url}`);
        continue;
      }
      bucket = parsed.bucket;
      path = parsed.path;
    }
    targets.push({
      source: 'primary_portrait',
      modelId: m.id,
      username: m.username,
      firstName: m.first_name,
      bucket,
      storagePath: path,
      publicUrl: url,
      contentItemId: it.id,
    });
  }

  console.log(`Scanning ${targets.length} photos (${(models || []).length} profile + ${(items || []).length} primary portrait)…`);
  console.log();

  const problems: { t: Target; orientation: number; w?: number; h?: number }[] = [];
  const errors: { t: Target; error: string }[] = [];

  await pool(targets, CONCURRENCY, async (t) => {
    const r = await fetchAndCheck(t);
    if (!r.ok) {
      errors.push({ t, error: r.error || 'unknown' });
      return;
    }
    if (r.orientation && r.orientation !== 1) {
      problems.push({ t, orientation: r.orientation, w: r.width, h: r.height });
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Photos with EXIF orientation ≠ 1: ${problems.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const p of problems) {
    const label = ORIENT_LABELS[p.orientation] || `?${p.orientation}`;
    console.log(
      `  [orientation ${p.orientation} = ${label}] ${p.t.source.padEnd(17)} ${p.t.firstName || ''} ${p.t.username || ''} (${p.w}×${p.h}) → ${p.t.bucket}/${p.t.storagePath}`,
    );
  }

  if (errors.length > 0) {
    console.log();
    console.log('Errors (file missing/unreadable):');
    for (const e of errors) {
      console.log(`  ${e.t.firstName || ''} ${e.t.username || ''}: ${e.error} (${e.t.bucket}/${e.t.storagePath})`);
    }
  }

  if (FIX && problems.length > 0) {
    console.log();
    console.log(`Fixing ${problems.length} photos…`);
    let fixed = 0;
    let failed = 0;
    await pool(
      problems.map((p) => p.t),
      CONCURRENCY,
      async (t) => {
        try {
          await fixOne(t);
          fixed++;
          console.log(`  ✓ ${t.firstName || ''} ${t.username || ''} (${t.source})`);
        } catch (e: any) {
          failed++;
          console.log(`  ✗ ${t.firstName || ''} ${t.username || ''}: ${e.message}`);
        }
      },
    );
    console.log();
    console.log(`Fixed: ${fixed}, Failed: ${failed}`);
  } else if (problems.length > 0) {
    console.log();
    console.log('Re-run with --fix to rotate-in-place and update DB.');
  }
}

go().catch((e) => {
  console.error(e);
  process.exit(1);
});
