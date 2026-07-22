import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMissedCallEmail } from "@/lib/email";
import { sendPushToActor } from "@/lib/push";
import { logger } from "@/lib/logger";

// Missed-call recovery: scan recently-missed sessions and send the model ONE
// email + ONE push. Called from the sweep-stale-calls cron (every 2 min) in
// an isolated try/catch — this pass is notify-only and must never touch
// settlement or balances (missed rows are already settled=true at 0 coins).
//
// A scan pass (not an inline hook) because 'missed' is written in TWO places:
// the fan client's /api/calls/join DELETE (the common ring-timeout path) and
// sweep-stale-calls section 3. Scanning status='missed' catches both.
//
// Dedup: max ONE missed-call notification per model per DEDUP_HOURS
// regardless of how many fans (or retries) rang, via the model actor's most
// recent chat_nudges_sent 'missed_call' row across all conversations.

// Look back far enough that a miss is never skipped between cron ticks
// (cron */2 min); the nudge-row dedup makes overlap harmless.
const SCAN_WINDOW_MS = 10 * 60 * 1000;
const DEDUP_HOURS = 6;
const MAX_PER_RUN = 100;

export async function notifyMissedCalls(admin: SupabaseClient): Promise<{ notified: number }> {
  const now = new Date();
  const scanCutoff = new Date(now.getTime() - SCAN_WINDOW_MS).toISOString();

  // Generated types are stale for video_call_sessions (settled etc.) — cast,
  // same as the rest of the sweeper.
  const { data: missed } = await (admin.from("video_call_sessions") as any)
    .select("id, conversation_id, initiated_by, recipient_id, call_type, ended_at")
    .eq("status", "missed")
    .gte("ended_at", scanCutoff)
    .order("ended_at", { ascending: false })
    .limit(MAX_PER_RUN) as {
      data: Array<{
        id: string;
        conversation_id: string;
        initiated_by: string;
        recipient_id: string;
        call_type: string | null;
        ended_at: string | null;
      }> | null;
    };

  if (!missed || missed.length === 0) return { notified: 0 };

  // Classify both sides: only fan → model misses notify.
  const actorIds = [
    ...new Set(missed.flatMap((s) => [s.initiated_by, s.recipient_id])),
  ];
  const { data: actors } = await admin
    .from("actors")
    .select("id, type, user_id")
    .in("id", actorIds) as {
      data: Array<{ id: string; type: string; user_id: string | null }> | null;
    };
  const actorMap = new Map((actors || []).map((a) => [a.id, a]));

  // Most recent miss per model actor (rows are already newest-first)
  const latestMissByModel = new Map<string, (typeof missed)[number]>();
  for (const s of missed) {
    const caller = actorMap.get(s.initiated_by);
    const recipient = actorMap.get(s.recipient_id);
    if (caller?.type !== "fan") continue;
    if (recipient?.type !== "model" || !recipient.user_id) continue; // claimed models only
    if (!latestMissByModel.has(s.recipient_id)) {
      latestMissByModel.set(s.recipient_id, s);
    }
  }
  if (latestMissByModel.size === 0) return { notified: 0 };

  const modelActorIds = [...latestMissByModel.keys()];

  // Dedup: any 'missed_call' nudge for this model actor inside the window —
  // across ALL conversations — suppresses another send.
  const dedupCutoff = new Date(now.getTime() - DEDUP_HOURS * 60 * 60 * 1000);
  const { data: recentNudges } = await admin
    .from("chat_nudges_sent")
    .select("recipient_id, created_at")
    .eq("nudge_type", "missed_call")
    .in("recipient_id", modelActorIds) as {
      data: Array<{ recipient_id: string; created_at: string }> | null;
    };
  const recentlyNotified = new Set(
    (recentNudges || [])
      .filter((n) => new Date(n.created_at) > dedupCutoff)
      .map((n) => n.recipient_id)
  );

  const candidates = modelActorIds.filter((id) => !recentlyNotified.has(id));
  if (candidates.length === 0) return { notified: 0 };

  // Model rows (models.user_id ← actor.user_id). first_name is fine here:
  // the model is greeted by their own name in their own inbox.
  const modelUserIds = candidates
    .map((id) => actorMap.get(id)?.user_id)
    .filter((v): v is string => !!v);
  const { data: models } = await admin
    .from("models")
    .select("user_id, username, first_name, email, video_call_rate, voice_call_rate")
    .in("user_id", modelUserIds) as {
      data: Array<{
        user_id: string;
        username: string | null;
        first_name: string | null;
        email: string | null;
        video_call_rate: number | null;
        voice_call_rate: number | null;
      }> | null;
    };
  const modelsByUserId = new Map((models || []).map((m) => [m.user_id, m]));

  // Fan caller names — @username only, never anything resembling a real name
  const fanActorIds = [
    ...new Set(candidates.map((id) => latestMissByModel.get(id)!.initiated_by)),
  ];
  const { data: fans } = await admin
    .from("fans")
    .select("id, username, display_name")
    .in("id", fanActorIds) as {
      data: Array<{ id: string; username: string | null; display_name: string | null }> | null;
    };
  const fansById = new Map((fans || []).map((f) => [f.id, f]));

  let notified = 0;

  for (const modelActorId of candidates) {
    const session = latestMissByModel.get(modelActorId)!;
    const actor = actorMap.get(modelActorId)!;
    const model = actor.user_id ? modelsByUserId.get(actor.user_id) : undefined;
    if (!model) continue;

    const fan = fansById.get(session.initiated_by);
    const callerName = fan?.username
      ? `@${fan.username}`
      : fan?.display_name || "A fan";
    const callType = (session.call_type === "voice" ? "voice" : "video") as
      | "video"
      | "voice";
    const callRate =
      (callType === "voice" ? model.voice_call_rate : model.video_call_rate) || 0;

    try {
      // ONE email (self-guards on the notification unsubscribe list)
      if (model.email) {
        await sendMissedCallEmail({
          to: model.email,
          modelName: model.first_name || model.username || "Model",
          callerName,
          callType,
          callRate,
          missedAt: session.ended_at,
        });
      }

      // ONE push (gated per-actor by the push_preferences 'calls' toggle;
      // no-op without subscriptions). Best-effort — never throws.
      await sendPushToActor(
        modelActorId,
        {
          title: "You missed a call 💜",
          body: `${callerName} tried to ${callType} call you${callRate > 0 ? ` · your rate is ${callRate} coins/min` : ""}. Go available to catch the next one.`,
          url: "/dashboard",
          tag: "missed-call",
        },
        "calls"
      );

      // Record the send — upsert refreshes created_at, restarting the 6h
      // window. Keyed on the triggering conversation; the dedup query above
      // reads across all of the model's conversations, so this still means
      // "one notification per model per window".
      await admin.from("chat_nudges_sent").upsert(
        {
          conversation_id: session.conversation_id,
          recipient_id: modelActorId,
          nudge_type: "missed_call",
          created_at: now.toISOString(),
        },
        { onConflict: "conversation_id,recipient_id,nudge_type" }
      );

      notified++;
    } catch (err) {
      // Per-model isolation: one bad email address can't starve the rest
      logger.error("missed-call notify failed", err, { modelActorId });
    }
  }

  return { notified };
}
