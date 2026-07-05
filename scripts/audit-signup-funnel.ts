/**
 * One-off: measure the organic signup funnel to decide if
 * build-profile-while-pending is worth building.
 * - application volume + status breakdown (all time / last 90d / last 30d)
 * - of approved applications: how many models still have no profile photo
 *   (i.e. approved but invisible on /models)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: apps, error } = await supabase
    .from("model_applications")
    .select("id, user_id, email, status, created_at, reviewed_at, email_confirmed_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const now = Date.now();
  const days = (d: string) => (now - new Date(d).getTime()) / 86_400_000;

  const buckets: Record<string, { all: number; d90: number; d30: number }> = {};
  for (const a of apps!) {
    const b = (buckets[a.status] ??= { all: 0, d90: 0, d30: 0 });
    b.all++;
    if (days(a.created_at) <= 90) b.d90++;
    if (days(a.created_at) <= 30) b.d30++;
  }
  console.log("Applications by status (all / last 90d / last 30d):");
  for (const [s, b] of Object.entries(buckets))
    console.log(`  ${s}: ${b.all} / ${b.d90} / ${b.d30}`);
  console.log(`  TOTAL: ${apps!.length}`);

  // Pending apps stuck on unconfirmed email
  const pending = apps!.filter((a) => a.status === "pending");
  const pendingUnconfirmed = pending.filter((a) => !a.email_confirmed_at);
  console.log(`\nPending now: ${pending.length} (unconfirmed email: ${pendingUnconfirmed.length})`);

  // Approval latency for reviewed apps (last 90d)
  const reviewed = apps!.filter((a) => a.reviewed_at && days(a.created_at) <= 90);
  if (reviewed.length) {
    const hrs = reviewed
      .map((a) => (new Date(a.reviewed_at!).getTime() - new Date(a.created_at).getTime()) / 3_600_000)
      .sort((x, y) => x - y);
    const med = hrs[Math.floor(hrs.length / 2)];
    console.log(`Review latency last 90d (n=${hrs.length}): median ${med.toFixed(1)}h, max ${hrs[hrs.length - 1].toFixed(0)}h`);
  }

  // Of approved applications: does the model have a photo today?
  const approved = apps!.filter((a) => a.status === "approved" && a.user_id);
  const userIds = approved.map((a) => a.user_id);
  let noPhoto = 0, withPhoto = 0, noModelRow = 0;
  const noPhotoRecent: string[] = [];
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const { data: models, error: mErr } = await supabase
      .from("models")
      .select("user_id, profile_photo_url, created_at")
      .in("user_id", chunk);
    if (mErr) throw mErr;
    const byUser = new Map(models!.map((m) => [m.user_id, m]));
    for (const uid of chunk) {
      const m = byUser.get(uid);
      if (!m) { noModelRow++; continue; }
      if (m.profile_photo_url) withPhoto++;
      else {
        noPhoto++;
        const app = approved.find((a) => a.user_id === uid);
        if (app && days(app.created_at) <= 90) noPhotoRecent.push(app.email);
      }
    }
  }
  console.log(`\nApproved applications → model rows: ${approved.length}`);
  console.log(`  with profile photo (visible): ${withPhoto}`);
  console.log(`  NO photo (approved but invisible): ${noPhoto}`);
  console.log(`  no model row found: ${noModelRow}`);
  console.log(`  approved-but-invisible from last 90d of applications: ${noPhotoRecent.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
