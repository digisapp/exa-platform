import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { settleCallSession } from "@/lib/calls/settlement";
import { logger } from "@/lib/logger";

const supabase = createServiceRoleClient();

// How long after the last heartbeat (or, if none, after start) an active call
// is considered abandoned. Clients heartbeat every 20s, so 90s ≈ 4 missed beats.
const ACTIVE_STALE_MS = 90 * 1000;
// Unanswered pending calls expire to "missed" after this long.
const PENDING_EXPIRE_MS = 3 * 60 * 1000;
const MAX_PER_RUN = 200;

// GET /api/cron/sweep-stale-calls
// Reconciles calls the normal client-driven end flow missed:
//   1. Abandoned 'active' calls (both parties crashed) → force-end + bill the
//      true observed duration (last heartbeat), so revenue isn't silently lost.
//   2. 'ended' but unsettled calls (transfer failed at end time) → retry the
//      idempotent transfer so the model gets paid.
//   3. Stale 'pending' calls never answered → mark 'missed'.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const hbCutoff = new Date(now.getTime() - ACTIVE_STALE_MS).toISOString();
    const pendingCutoff = new Date(now.getTime() - PENDING_EXPIRE_MS).toISOString();

    let billed = 0;
    let retried = 0;
    let expired = 0;
    let unsettledRemaining = 0;

    // --- 1. Abandoned active calls -----------------------------------------
    const { data: staleActive } = await (supabase.from("video_call_sessions") as any)
      .select("id, started_at, last_heartbeat_at, initiated_by, recipient_id, call_type, conversation_id")
      .eq("status", "active")
      .or(`last_heartbeat_at.lt.${hbCutoff},and(last_heartbeat_at.is.null,started_at.lt.${hbCutoff})`)
      .limit(MAX_PER_RUN) as {
        data: Array<{
          id: string;
          started_at: string | null;
          last_heartbeat_at: string | null;
          initiated_by: string;
          recipient_id: string;
          call_type: string | null;
          conversation_id: string;
        }> | null;
      };

    for (const s of staleActive ?? []) {
      const startedMs = s.started_at ? new Date(s.started_at).getTime() : now.getTime();
      // Bill only up to the last time the call was known alive — fan-friendly
      // and accurate for a crash.
      const aliveMs = s.last_heartbeat_at ? new Date(s.last_heartbeat_at).getTime() : startedMs;
      const durationSeconds = Math.max(0, Math.floor((aliveMs - startedMs) / 1000));
      const callType = (s.call_type === "voice" ? "voice" : "video") as "video" | "voice";

      // Compare-and-set claim: skip if a live /api/calls/end won the race.
      const { data: claimed } = await (supabase.from("video_call_sessions") as any)
        .update({ status: "ended", ended_at: nowIso, duration_seconds: durationSeconds, settled: false })
        .eq("id", s.id)
        .eq("status", "active")
        .select("id");

      if (!claimed || claimed.length === 0) continue;

      const { settled, coinsCharged } = await settleCallSession({
        admin: supabase,
        sessionId: s.id,
        initiatedBy: s.initiated_by,
        recipientId: s.recipient_id,
        callType,
        durationSeconds,
      });

      if (settled) billed++;
      else unsettledRemaining++;

      // Reflect the ended call in the conversation.
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const coinsStr = settled && coinsCharged > 0 ? ` (${coinsCharged} coins)` : "";
      const label = callType === "voice" ? "Voice" : "Video";
      await supabase.from("messages").insert({
        conversation_id: s.conversation_id,
        sender_id: s.recipient_id,
        content: `${label} call ended - ${mins}:${secs.toString().padStart(2, "0")}${coinsStr}`,
        is_system: true,
      });
    }

    // --- 2. Ended-but-unsettled calls (transfer failed at end time) --------
    const { data: unsettled } = await (supabase.from("video_call_sessions") as any)
      .select("id, initiated_by, recipient_id, call_type, duration_seconds")
      .eq("status", "ended")
      .eq("settled", false)
      .limit(MAX_PER_RUN) as {
        data: Array<{
          id: string;
          initiated_by: string;
          recipient_id: string;
          call_type: string | null;
          duration_seconds: number | null;
        }> | null;
      };

    for (const s of unsettled ?? []) {
      const callType = (s.call_type === "voice" ? "voice" : "video") as "video" | "voice";
      const { settled } = await settleCallSession({
        admin: supabase,
        sessionId: s.id,
        initiatedBy: s.initiated_by,
        recipientId: s.recipient_id,
        callType,
        durationSeconds: s.duration_seconds ?? 0,
      });
      if (settled) retried++;
      else unsettledRemaining++;
    }

    // --- 3. Expire unanswered pending calls --------------------------------
    const { data: expiredRows } = await (supabase.from("video_call_sessions") as any)
      .update({ status: "missed", ended_at: nowIso, settled: true })
      .eq("status", "pending")
      .lt("created_at", pendingCutoff)
      .select("id") as { data: Array<{ id: string }> | null };
    expired = expiredRows?.length ?? 0;

    if (billed || retried || unsettledRemaining) {
      logger.info("sweep-stale-calls reconciled", { billed, retried, expired, unsettledRemaining });
    }

    return NextResponse.json({ success: true, billed, retried, expired, unsettledRemaining });
  } catch (error) {
    logger.error("sweep-stale-calls cron error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
