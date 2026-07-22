import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendModelOnlineForCallsEmail } from "@/lib/email";
import { sendPushToActor } from "@/lib/push";
import { logger } from "@/lib/logger";

// Second half of the call-knock loop: a model who was unreachable just became
// reachable (activity heartbeat flipped video_is_online on, or the model
// toggled available_for_calls) — ping every fan with a pending knock/watch so
// the two actually meet.
//
// Called ONLY on the unreachable → reachable transition (both hook sites read
// prior state before writing), so it doesn't run on every heartbeat. Rows are
// claimed atomically (UPDATE ... WHERE fan_notified_at IS NULL) before any
// send: overlapping transitions get zero claimed rows and exit — the same
// claim-then-send idempotency as digest_sends. A claim whose send then fails
// stays claimed; one lost ping beats double-emailing a fan.

// A knock older than this no longer represents live intent — don't ping.
const KNOCK_TTL_HOURS = 48;
// Served rows older than this are deleted opportunistically.
const CLEANUP_DAYS = 7;

export async function notifyCallKnockersModelOnline(
  service: SupabaseClient,
  modelId: string
): Promise<{ notified: number }> {
  const now = new Date();
  const ttlCutoff = new Date(now.getTime() - KNOCK_TTL_HOURS * 60 * 60 * 1000).toISOString();

  // call_knocks is newer than the generated DB types
  const { data: claimed } = await (service as any)
    .from("call_knocks")
    .update({ fan_notified_at: now.toISOString() })
    .eq("model_id", modelId)
    .is("fan_notified_at", null)
    .gte("created_at", ttlCutoff)
    .select("fan_id, call_type") as {
      data: Array<{ fan_id: string; call_type: string }> | null;
    };

  // Tidy this model's stale rows (expired waits + long-served rows) while
  // we're here — keeps the table tiny without needing a cron.
  await (service as any)
    .from("call_knocks")
    .delete()
    .eq("model_id", modelId)
    .lt("created_at", new Date(now.getTime() - CLEANUP_DAYS * 24 * 60 * 60 * 1000).toISOString());

  if (!claimed || claimed.length === 0) return { notified: 0 };

  const { data: model } = await service
    .from("models")
    .select("username")
    .eq("id", modelId)
    .single() as { data: { username: string | null } | null };
  if (!model?.username) return { notified: 0 };

  // fans.id == actors.id — same id sendPushToActor wants
  const fanIds = claimed.map((k) => k.fan_id);
  const { data: fans } = await service
    .from("fans")
    .select("id, email, is_suspended")
    .in("id", fanIds) as {
      data: Array<{ id: string; email: string | null; is_suspended: boolean | null }> | null;
    };
  const fansById = new Map((fans || []).map((f) => [f.id, f]));

  let notified = 0;
  for (const knock of claimed) {
    const fan = fansById.get(knock.fan_id);
    if (!fan || fan.is_suspended) continue;
    const callType = (knock.call_type === "voice" ? "voice" : "video") as "video" | "voice";

    try {
      if (fan.email) {
        await sendModelOnlineForCallsEmail({
          to: fan.email,
          modelUsername: model.username,
          callType,
        });
      }

      // Best-effort; most fans have no push subscription yet and this no-ops
      await sendPushToActor(
        fan.id,
        {
          title: `@${model.username} is taking calls 🟢`,
          body: `The model you tried to call is available right now — catch them while they're online.`,
          url: `/${model.username}`,
          tag: `model-online-${modelId}`,
        },
        "calls"
      );

      notified++;
    } catch (err) {
      // Per-fan isolation: one bad email address can't starve the rest
      logger.error("knock online-notify failed", err, { modelId, fanId: knock.fan_id });
    }
  }

  return { notified };
}
