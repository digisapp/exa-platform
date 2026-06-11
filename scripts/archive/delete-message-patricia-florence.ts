/**
 * Soft-delete a specific abusive message sent to model @patricia_o_machado_
 * containing the phrase "Florence Mississippi".
 *
 * Two-step:
 *   - Dry run (default): prints matching messages + sender/recipient context
 *   - With APPLY=1: performs the soft-delete (deleted_at + null content/media)
 *
 * Run:
 *   npx tsx scripts/delete-message-patricia-florence.ts        # preview
 *   APPLY=1 npx tsx scripts/delete-message-patricia-florence.ts # apply
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

const RECIPIENT_USERNAME = "patricia_o_machado_";
const CONTENT_NEEDLE = "Florence Mississippi";
const APPLY = process.env.APPLY === "1";

async function main() {
  const { data: model, error: mErr } = await supabase
    .from("models")
    .select("id, user_id, username, first_name, last_name")
    .eq("username", RECIPIENT_USERNAME)
    .maybeSingle();
  if (mErr || !model) {
    console.error("Model not found:", RECIPIENT_USERNAME, mErr);
    process.exit(1);
  }
  console.log("Recipient model:", model);

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", model.user_id)
    .maybeSingle();
  if (!actor) {
    console.error("No actor row for model user_id", model.user_id);
    process.exit(1);
  }
  console.log("Recipient actor:", actor);

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("actor_id", actor.id);
  const convIds = (parts ?? []).map((p: any) => p.conversation_id);
  if (convIds.length === 0) {
    console.log("Model has no conversations.");
    process.exit(0);
  }
  console.log(`Searching ${convIds.length} conversations...`);

  const { data: matches, error: searchErr } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, is_flagged, flagged_reason")
    .in("conversation_id", convIds)
    .ilike("content", `%${CONTENT_NEEDLE}%`)
    .order("created_at", { ascending: false });
  if (searchErr) {
    console.error("Search error:", searchErr);
    process.exit(1);
  }
  if (!matches || matches.length === 0) {
    console.log(`No messages found containing "${CONTENT_NEEDLE}".`);
    process.exit(0);
  }

  console.log(`\nFound ${matches.length} candidate message(s):`);
  for (const m of matches as any[]) {
    const { data: sender } = await supabase
      .from("actors")
      .select("id, type, user_id")
      .eq("id", m.sender_id)
      .maybeSingle();
    let senderLabel = `actor=${m.sender_id} type=${sender?.type}`;
    if (sender?.type === "fan" && sender.user_id) {
      const { data: fan } = await supabase
        .from("fans")
        .select("id, username, email, first_name, last_name")
        .eq("user_id", sender.user_id)
        .maybeSingle();
      if (fan) senderLabel += ` fan=${fan.username ?? fan.email ?? fan.id}`;
    }
    console.log("---");
    console.log("id:", m.id);
    console.log("conversation:", m.conversation_id);
    console.log("sender:", senderLabel);
    console.log("created_at:", m.created_at);
    console.log("is_flagged:", m.is_flagged, "flagged_reason:", m.flagged_reason);
    console.log("content:", JSON.stringify(m.content));
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with APPLY=1 to soft-delete the above.");
    return;
  }

  const targets = (matches as any[]).map((m) => m.id);
  // Hard delete: the live DB has no `deleted_at` column on messages, so the
  // app's soft-delete pattern (which references `deleted_at`) doesn't apply here.
  const { error: delErr } = await supabase
    .from("messages")
    .delete()
    .in("id", targets);
  if (delErr) {
    console.error("Delete failed:", delErr);
    process.exit(1);
  }
  console.log(`\nHard-deleted ${targets.length} message(s):`, targets);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
