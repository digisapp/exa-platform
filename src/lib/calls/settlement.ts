import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateCallCost } from "@/lib/livekit";
import { logger } from "@/lib/logger";

export interface SettleCallParams {
  /** Service-role client — end_call_transfer is REVOKEd from anon/authenticated. */
  admin: SupabaseClient;
  sessionId: string;
  /** Caller actor id (video_call_sessions.initiated_by). */
  initiatedBy: string;
  /** Recipient actor id (video_call_sessions.recipient_id). */
  recipientId: string;
  callType: "video" | "voice";
  durationSeconds: number;
}

export interface SettleCallResult {
  /** True once the coin transfer has definitively completed (or there was
   *  nothing to charge). False means the transfer failed and the session must
   *  stay unsettled for the reconciliation sweeper to retry. */
  settled: boolean;
  coinsCharged: number;
}

/**
 * Charge a fan for a completed call and mark the session settled.
 *
 * Safe to call more than once for the same session: end_call_transfer is
 * idempotent (guards on an existing debit ledger row), so a retry after a
 * transient failure never double-charges. Only marks the session `settled`
 * once the transfer has actually succeeded — a failed transfer leaves the
 * row unsettled so the sweeper picks it up again.
 */
export async function settleCallSession(p: SettleCallParams): Promise<SettleCallResult> {
  const { admin, sessionId, initiatedBy, recipientId, callType, durationSeconds } = p;

  // Only a fan-initiated call to a model with a rate results in a charge.
  // We must distinguish "positively non-chargeable" (recipient really isn't a
  // paid model) from "couldn't determine" (a lookup transiently failed). The
  // latter must NOT settle at 0 — that would permanently drop a real charge.
  const { data: callerActor, error: callerErr } = await admin
    .from("actors")
    .select("type")
    .eq("id", initiatedBy)
    .single() as { data: { type: string } | null; error: { code?: string } | null };

  const { data: recipientActor, error: recipientErr } = await admin
    .from("actors")
    .select("user_id")
    .eq("id", recipientId)
    .single() as { data: { user_id: string } | null; error: { code?: string } | null };

  const recipientUserId = recipientActor?.user_id;
  const { data: recipientModel, error: modelErr } = recipientUserId
    ? await admin.from("models")
        .select("video_call_rate, voice_call_rate, user_id")
        .eq("user_id", recipientUserId)
        .single() as { data: { video_call_rate: number | null; voice_call_rate: number | null; user_id: string } | null; error: { code?: string } | null }
    : { data: null, error: null };

  // PGRST116 = "no rows found" — a legitimate non-model recipient. Any other
  // error means the lookup itself failed; leave the call unsettled so the
  // sweeper retries rather than silently marking it charged-0.
  const lookupFailed = (e: { code?: string } | null) => !!e && e.code !== "PGRST116";
  if (lookupFailed(callerErr) || lookupFailed(recipientErr) || lookupFailed(modelErr)) {
    logger.error("Call settlement: chargeability lookup failed — left unsettled for retry", undefined, { sessionId });
    return { settled: false, coinsCharged: 0 };
  }

  const ratePerMinute = callType === "voice"
    ? (recipientModel?.voice_call_rate || 0)
    : (recipientModel?.video_call_rate || 0);

  const coinsToCharge = calculateCallCost(durationSeconds, ratePerMinute);

  const chargeable =
    coinsToCharge > 0 &&
    callerActor?.type === "fan" &&
    !!recipientModel?.user_id &&
    initiatedBy !== recipientId;

  // Nothing to charge (free call, model→fan, model→model): settle immediately.
  if (!chargeable) {
    const { error: settleErr } = await admin
      .from("video_call_sessions")
      .update({ settled: true, coins_charged: 0 })
      .eq("id", sessionId);
    if (settleErr) {
      logger.error("Call settlement: failed to mark free call settled — will retry", settleErr, { sessionId });
      return { settled: false, coinsCharged: 0 };
    }
    return { settled: true, coinsCharged: 0 };
  }

  const { data: transferResult, error: transferError } = await admin.rpc("end_call_transfer", {
    p_session_id: sessionId,
    p_caller_fan_id: initiatedBy,
    p_recipient_model_user_id: recipientModel!.user_id,
    p_coins: coinsToCharge,
    p_call_type: callType,
    p_duration_seconds: durationSeconds,
  });

  const result = transferResult as { success?: boolean; coins_charged?: number; error?: string } | null;

  if (transferError || !result?.success) {
    // Leave the session unsettled — the sweeper will retry (safely, the RPC is
    // idempotent). Do NOT record a charge that didn't happen.
    logger.error("Call coin transfer failed — left unsettled for retry", transferError ?? undefined, {
      sessionId,
      rpcError: result?.error,
    });
    return { settled: false, coinsCharged: 0 };
  }

  const coinsCharged = result.coins_charged ?? 0;
  const { error: settleErr } = await admin
    .from("video_call_sessions")
    .update({ settled: true, coins_charged: coinsCharged })
    .eq("id", sessionId);

  if (settleErr) {
    // The coins already moved (end_call_transfer is idempotent). Only the
    // bookkeeping write failed — report unsettled so the sweeper reconciles
    // the flag rather than the caller trusting a state the row doesn't reflect.
    logger.error("Call settlement: transfer succeeded but marking settled failed — sweeper will reconcile", settleErr, { sessionId, coinsCharged });
    return { settled: false, coinsCharged };
  }

  return { settled: true, coinsCharged };
}
