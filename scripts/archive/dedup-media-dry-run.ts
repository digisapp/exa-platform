import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform/.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EXECUTE = process.argv.includes("--execute");

function normEmail(e: string | null) {
  return (e ?? "").trim().toLowerCase() || null;
}
function normHandle(h: string | null) {
  let v = (h ?? "").trim().toLowerCase();
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  v = v.replace(/^instagram\.com\//, "");
  v = v.replace(/[?/].*$/, ""); // strip query strings / trailing path
  v = v.replace(/^@/, "");
  return v || null;
}
function normPhone(p: string | null) {
  const v = (p ?? "").replace(/\D/g, "");
  return v || null;
}

type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  media_company: string | null;
  category: string | null;
  notes: string | null;
  status: string;
  title: string | null;
  website_url: string | null;
  created_at: string;
};

async function main() {
  const { data, error } = await supabase
    .from("media_contacts")
    .select("id, name, email, phone, instagram_handle, media_company, category, notes, status, title, website_url, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as Row[];

  // Build a union-find structure: merge any two rows that share at least 2 of {email, IG, phone}.
  const parent = new Map<string, string>();
  for (const r of rows) parent.set(r.id, r.id);
  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  }
  function union(a: string, b: string) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // For each signal, group rows; then within each group, only union pairs that ALSO share another signal.
  const signals: Array<keyof typeof normalizers> = ["email", "instagram_handle", "phone"];
  const normalizers = {
    email: (r: Row) => normEmail(r.email),
    instagram_handle: (r: Row) => normHandle(r.instagram_handle),
    phone: (r: Row) => normPhone(r.phone),
  };

  // Rule: same email OR same phone = duplicate. (IG handle alone is not enough — shared studio accounts exist.)
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const ea = normalizers.email(rows[i]);
      const eb = normalizers.email(rows[j]);
      const pa = normalizers.phone(rows[i]);
      const pb = normalizers.phone(rows[j]);
      const emailMatch = !!ea && !!eb && ea === eb;
      const phoneMatch = !!pa && !!pb && pa === pb;
      if (emailMatch || phoneMatch) union(rows[i].id, rows[j].id);
    }
  }

  // Build groups
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const root = find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(r);
  }
  const dupGroups = [...groups.values()].filter((g) => g.length > 1);

  console.log(`Total rows: ${rows.length}`);
  console.log(`Duplicate groups (>= 2 signals match): ${dupGroups.length}`);
  const toDelete: string[] = [];
  const updates: Array<{ id: string; patch: Record<string, any> }> = [];

  for (const group of dupGroups) {
    // Newest = highest created_at = keeper
    const sorted = [...group].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const keeper = sorted[0];
    const losers = sorted.slice(1);

    // Backfill any null/empty fields on keeper from older rows (newer wins; only fill what's missing)
    const fields = ["email", "phone", "instagram_handle", "media_company", "category", "title", "website_url"] as const;
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (!keeper[f] || (typeof keeper[f] === "string" && keeper[f]!.trim() === "")) {
        for (const l of losers) {
          if (l[f] && (typeof l[f] !== "string" || l[f]!.trim() !== "")) {
            patch[f] = l[f];
            break;
          }
        }
      }
    }

    // Status: if any row has a non-"new" status, prefer that
    const nonNewStatus = [keeper, ...losers].find((r) => r.status && r.status !== "new");
    if (nonNewStatus && keeper.status === "new") patch.status = nonNewStatus.status;

    // SAFEGUARD: preserve any unique emails / phones from losers that differ from the keeper's (after patches).
    const finalEmail = normEmail(patch.email ?? keeper.email);
    const finalPhone = normPhone(patch.phone ?? keeper.phone);
    const altEmails = new Set<string>();
    const altPhones = new Set<string>();
    for (const l of losers) {
      const le = normEmail(l.email);
      const lp = normPhone(l.phone);
      if (le && le !== finalEmail) altEmails.add(l.email!.trim());
      if (lp && lp !== finalPhone) altPhones.add(l.phone!.trim());
    }

    // Notes: append unique loser notes + alt emails/phones (so nothing is lost)
    const noteParts: string[] = [];
    if (keeper.notes?.trim()) noteParts.push(keeper.notes.trim());
    for (const l of losers) {
      const n = l.notes?.trim();
      if (n && !noteParts.includes(n)) noteParts.push(n);
    }
    if (altEmails.size) noteParts.push(`Alt email(s): ${[...altEmails].join(", ")}`);
    if (altPhones.size) noteParts.push(`Alt phone(s): ${[...altPhones].join(", ")}`);
    const finalNotes = noteParts.join("\n---\n");
    if (finalNotes && finalNotes !== (keeper.notes ?? "").trim()) {
      patch.notes = finalNotes;
    }

    console.log(`\nGroup of ${group.length}:`);
    console.log(`  KEEP    ${keeper.id}  ${keeper.created_at.slice(0, 10)}  name="${keeper.name}"  email=${keeper.email ?? "-"}  ig=${keeper.instagram_handle ?? "-"}  phone=${keeper.phone ?? "-"}`);
    for (const l of losers) {
      console.log(`  DELETE  ${l.id}  ${l.created_at.slice(0, 10)}  name="${l.name}"  email=${l.email ?? "-"}  ig=${l.instagram_handle ?? "-"}  phone=${l.phone ?? "-"}`);
      toDelete.push(l.id);
    }
    if (Object.keys(patch).length) {
      console.log(`  PATCH   ${JSON.stringify(patch)}`);
      updates.push({ id: keeper.id, patch });
    }
  }

  console.log(`\n=== Plan ===`);
  console.log(`Rows to delete: ${toDelete.length}`);
  console.log(`Rows to patch (backfill from older copies): ${updates.length}`);
  console.log(`Resulting unique row count: ${rows.length - toDelete.length}`);

  if (!EXECUTE) {
    console.log(`\nDry run only. Re-run with --execute to apply.`);
    return;
  }

  console.log(`\nApplying...`);
  for (const u of updates) {
    const { error } = await supabase.from("media_contacts").update(u.patch).eq("id", u.id);
    if (error) {
      console.error(`  FAILED patch ${u.id}:`, error.message);
    } else {
      console.log(`  patched ${u.id}`);
    }
  }
  for (const id of toDelete) {
    const { error } = await supabase.from("media_contacts").delete().eq("id", id);
    if (error) {
      console.error(`  FAILED delete ${id}:`, error.message);
    } else {
      console.log(`  deleted ${id}`);
    }
  }
  console.log(`\nDone.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
