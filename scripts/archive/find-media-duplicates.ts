import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform/.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function normEmail(e: string | null) {
  return (e ?? "").trim().toLowerCase();
}
function normHandle(h: string | null) {
  return (h ?? "").trim().toLowerCase().replace(/^@/, "");
}
function normPhone(p: string | null) {
  return (p ?? "").replace(/\D/g, "");
}
function normName(n: string | null) {
  return (n ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const { data, error } = await supabase
    .from("media_contacts")
    .select("id, name, email, phone, instagram_handle, media_company, status, notes, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = data ?? [];

  console.log(`Total rows: ${rows.length}\n`);

  const byEmail = new Map<string, any[]>();
  const byHandle = new Map<string, any[]>();
  const byPhone = new Map<string, any[]>();
  const byName = new Map<string, any[]>();

  for (const r of rows) {
    const e = normEmail(r.email);
    const h = normHandle(r.instagram_handle);
    const p = normPhone(r.phone);
    const n = normName(r.name);
    if (e) (byEmail.get(e) ?? byEmail.set(e, []).get(e))!.push(r);
    if (h) (byHandle.get(h) ?? byHandle.set(h, []).get(h))!.push(r);
    if (p) (byPhone.get(p) ?? byPhone.set(p, []).get(p))!.push(r);
    if (n) (byName.get(n) ?? byName.set(n, []).get(n))!.push(r);
  }

  function report(label: string, map: Map<string, any[]>) {
    const dupes = [...map.entries()].filter(([, v]) => v.length > 1);
    console.log(`=== Duplicates by ${label} ===`);
    console.log(`Groups: ${dupes.length}, extra rows: ${dupes.reduce((s, [, v]) => s + v.length - 1, 0)}`);
    for (const [key, group] of dupes) {
      console.log(`\n  [${label}=${key}] ${group.length} rows:`);
      for (const r of group) {
        console.log(`    - ${r.id}  ${r.created_at?.slice(0, 10)}  name="${r.name}"  email=${r.email ?? "-"}  ig=${r.instagram_handle ?? "-"}  phone=${r.phone ?? "-"}`);
      }
    }
    console.log("");
  }

  report("email", byEmail);
  report("instagram_handle", byHandle);
  report("phone", byPhone);
  report("name (normalized)", byName);

  // unique sets union (any of email/handle/phone match counts as dup candidate)
  const seenIds = new Set<string>();
  const dupGroups: any[][] = [];
  for (const maps of [byEmail, byHandle, byPhone]) {
    for (const [, group] of maps) {
      if (group.length <= 1) continue;
      if (group.every((r) => seenIds.has(r.id))) continue;
      dupGroups.push(group);
      for (const r of group) seenIds.add(r.id);
    }
  }
  const extraRows = dupGroups.reduce((s, g) => s + g.length - 1, 0);
  console.log(`\n=== Summary ===`);
  console.log(`Distinct duplicate groups (email | ig | phone match): ${dupGroups.length}`);
  console.log(`Extra duplicate rows to potentially merge/remove:     ${extraRows}`);
  console.log(`Net unique contacts after dedup:                      ${rows.length - extraRows}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
