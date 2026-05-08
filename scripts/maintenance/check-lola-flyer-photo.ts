import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function go() {
  const { data: models } = await supabase
    .from('models')
    .select('id, username, first_name, last_name, profile_photo_url')
    .or('first_name.ilike.lola,username.ilike.%lola%,last_name.ilike.lola');
  console.log('Lola candidates:', JSON.stringify(models, null, 2));

  if (!models || models.length === 0) return;
  for (const m of models) {
    if (!m.profile_photo_url) continue;
    console.log('\n---', m.first_name, m.username, '---');
    console.log('URL:', m.profile_photo_url);
    try {
      const res = await fetch(m.profile_photo_url);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log('Bytes:', buf.length, 'Content-Type:', res.headers.get('content-type'));

      // Manual EXIF Orientation parser for JPEG
      const orientation = readJpegOrientation(buf);
      console.log('EXIF Orientation:', orientation, orientationLabel(orientation));
    } catch (e: any) {
      console.log('Fetch error:', e.message);
    }
  }
}

function orientationLabel(o: number | null): string {
  if (o === null) return '(none)';
  return ({
    1: 'normal',
    2: 'flip horizontal',
    3: 'rotate 180',
    4: 'flip vertical',
    5: 'transpose',
    6: 'rotate 90 CW',
    7: 'transverse',
    8: 'rotate 270 CW (90 CCW)',
  } as any)[o] || 'unknown';
}

// Minimal JPEG EXIF Orientation reader
function readJpegOrientation(buf: Buffer): number | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const size = buf.readUInt16BE(i + 2);
    if (marker === 0xe1) {
      const start = i + 4;
      if (buf.toString('ascii', start, start + 4) === 'Exif') {
        const tiff = start + 6;
        const little = buf[tiff] === 0x49 && buf[tiff + 1] === 0x49;
        const get16 = (p: number) =>
          little ? buf.readUInt16LE(p) : buf.readUInt16BE(p);
        const get32 = (p: number) =>
          little ? buf.readUInt32LE(p) : buf.readUInt32BE(p);
        const ifd0 = tiff + get32(tiff + 4);
        const entries = get16(ifd0);
        for (let e = 0; e < entries; e++) {
          const entry = ifd0 + 2 + e * 12;
          const tag = get16(entry);
          if (tag === 0x0112) return get16(entry + 8);
        }
      }
      return null;
    }
    i += 2 + size;
  }
  return null;
}

go();
