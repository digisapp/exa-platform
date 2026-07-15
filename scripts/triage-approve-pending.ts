/**
 * One-off (2026-07-16): approve the pending model applications that already
 * pass every gate (confirmed email + profile photo + adult DOB) — part of the
 * 351-app backlog triage. Runs the REAL approval pipeline
 * (approveModelApplication: fan→model conversion, unclaimed-import linking,
 * wallet migration, approval email + welcome chat), not a reimplementation.
 *
 * Dry-run by default; pass --apply to execute.
 * Run: npx tsx --tsconfig scripts/tsconfig.scripts.json scripts/triage-approve-pending.ts [--apply]
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

const APPLY = process.argv.includes("--apply");
// admin@examodels.com — recorded as reviewed_by + welcome-chat sender
const REVIEWER_ACTOR_ID = "02ec6e36-cf61-4898-9ced-f4d7fbcb95e9";

async function main() {
  const { createServiceRoleClient } = await import("@/lib/supabase/service");
  const { approveModelApplication } = await import("@/lib/model-approval");
  const { isAdultDob } = await import("@/lib/age");

  const admin = createServiceRoleClient();
  const { data: apps, error } = await admin
    .from("model_applications")
    .select("*")
    .eq("status", "pending")
    .not("email_confirmed_at", "is", null)
    .not("profile_photo_url", "is", null)
    .order("created_at");
  if (error) throw error;

  const eligible = (apps || []).filter(
    (a: any) => a.date_of_birth && isAdultDob(a.date_of_birth)
  );
  console.log(`${apps?.length ?? 0} pending w/ photo+email, ${eligible.length} also adult-DOB`);

  for (const app of eligible) {
    console.log(
      `${APPLY ? "APPROVING" : "[dry-run] would approve"}: ${app.display_name} <${app.email}> ig=${app.instagram_username} dob=${app.date_of_birth} applied=${app.created_at?.slice(0, 10)}`
    );
    if (!APPLY) continue;
    const result = await approveModelApplication({
      application: app,
      reviewerActorId: REVIEWER_ACTOR_ID,
    });
    console.log("  →", result.success ? "approved" : `FAILED: ${result.error}`);
    // approval email + welcome chat are fire-and-forget inside the lib —
    // give them time to finish before the next one (and before exit)
    await new Promise((r) => setTimeout(r, 8000));
  }
  console.log(APPLY ? "done" : "dry-run complete (pass --apply to execute)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
