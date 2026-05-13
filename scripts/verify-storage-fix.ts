/**
 * Final verification: confirm the 5 hero videos have correct cacheControl
 * metadata stored, so they'll be served correctly the moment Smart CDN is on.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const TARGETS = [
  { bucket: "examodels", prefix: "travel", name: "exa-aqua-newyork.mp4" },
  { bucket: "examodels", prefix: "travel", name: "exa-hair-spa.mp4" },
  { bucket: "examodels", prefix: "travel", name: "exa-hutong-miami.mp4" },
  { bucket: "examodels", prefix: "travel", name: "exa-pilates.mp4" },
  { bucket: "portfolio", prefix: "swimcrown", name: "jb-paris-crown.mp4" },
];

async function main() {
  console.log("Stored metadata.cacheControl for the 5 hero videos:\n");
  for (const t of TARGETS) {
    const { data, error } = await supabase.storage
      .from(t.bucket)
      .list(t.prefix, { search: t.name });
    if (error || !data?.[0]) {
      console.log(`  ✗ ${t.bucket}/${t.prefix}/${t.name}  NOT FOUND`);
      continue;
    }
    const m = data[0].metadata as any;
    const cc = m?.cacheControl;
    const ok = cc === "max-age=31536000";
    console.log(`  ${ok ? "✓" : "✗"} ${t.bucket}/${t.prefix}/${t.name}  cacheControl="${cc}"  size=${m?.size}`);
  }
}
main();
