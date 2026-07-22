import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { isReachableForCalls } from "@/lib/call-availability";
import { sendCallKnockEmail } from "@/lib/email";
import { sendPushToActor } from "@/lib/push";
import { z } from "zod";
import { logger } from "@/lib/logger";

// POST - a fan tapped Call on an unreachable model. Two modes:
//
//   knock: "let them know I'm trying to call" — the model gets ONE alert
//          (email + push, deduped across fans per MODEL_ALERT_DEDUP_HOURS so
//          five knockers still produce one alert), and the fan is enrolled
//          for the online ping.
//   watch: "notify me when they're online" — online ping only, no model alert.
//
// Both write one call_knocks row per (fan, model); the flip-to-reachable
// hooks in /api/activity and /api/model/availability serve the online pings
// (src/lib/calls/knock-online-notify.ts).
//
// The profile page is ISR-cached, so its reachability can be stale: this
// route re-checks live state and returns { alreadyReachable: true } instead
// of knocking, and the client flows straight into a real call.

const MODEL_ALERT_DEDUP_HOURS = 4;

const knockSchema = z.object({
  modelId: z.string().uuid(),
  callType: z.enum(["video", "voice"]).optional().default("video"),
  mode: z.enum(["knock", "watch"]).optional().default("knock"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "videoCalls", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = knockSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { modelId, callType, mode } = parsed.data;

    // Only fans knock — models/brands have no call CTA on profiles
    const { data: callerActor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!callerActor || callerActor.type !== "fan") {
      return NextResponse.json({ error: "Only fans can request calls" }, { status: 403 });
    }

    const suspended = await assertNotSuspended(callerActor.id);
    if (suspended) return suspended;

    const service = createServiceRoleClient();

    // available_for_calls is newer than the generated DB types
    const { data: model } = await (service as any)
      .from("models")
      .select(
        "id, username, first_name, email, user_id, is_approved, allow_video_call, allow_voice_call, video_call_rate, voice_call_rate, video_is_online, available_for_calls"
      )
      .eq("id", modelId)
      .single() as {
        data: {
          id: string;
          username: string | null;
          first_name: string | null;
          email: string | null;
          user_id: string | null;
          is_approved: boolean | null;
          allow_video_call: boolean | null;
          allow_voice_call: boolean | null;
          video_call_rate: number | null;
          voice_call_rate: number | null;
          video_is_online: boolean | null;
          available_for_calls: boolean | null;
        } | null;
      };

    // Claimed models only — an unclaimed import can never become reachable,
    // and its email belongs to someone who never signed up (never email them)
    if (!model || !model.is_approved || !model.user_id) {
      return NextResponse.json({ error: "This model isn't taking calls" }, { status: 404 });
    }

    const allowsThisCall =
      callType === "voice" ? model.allow_voice_call !== false : model.allow_video_call !== false;
    if (!allowsThisCall) {
      return NextResponse.json({ error: "This model isn't taking calls" }, { status: 409 });
    }

    // ISR-stale profile: the model is actually reachable — just call them
    if (isReachableForCalls(model)) {
      return NextResponse.json({ alreadyReachable: true });
    }

    // One row per (fan, model). Re-knock refreshes created_at and re-arms the
    // online ping; a knock upgrades a watch-only row but never the reverse.
    // call_knocks is newer than the generated DB types.
    const nowIso = new Date().toISOString();
    const { data: existing } = await (service as any)
      .from("call_knocks")
      .select("id, knocked")
      .eq("fan_id", callerActor.id)
      .eq("model_id", model.id)
      .maybeSingle() as { data: { id: string; knocked: boolean } | null };

    if (existing) {
      const { error: updateError } = await (service as any)
        .from("call_knocks")
        .update({
          call_type: callType,
          knocked: existing.knocked || mode === "knock",
          fan_notified_at: null,
          created_at: nowIso,
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await (service as any)
        .from("call_knocks")
        .insert({
          fan_id: callerActor.id,
          model_id: model.id,
          call_type: callType,
          knocked: mode === "knock",
        });
      if (insertError) throw insertError;
    }

    // Model alert — knock mode only, max one per model per dedup window no
    // matter how many fans knock (the alert says "a fan", details live on
    // the dashboard once they log in).
    let modelAlerted = false;
    if (mode === "knock") {
      const dedupCutoff = new Date(
        Date.now() - MODEL_ALERT_DEDUP_HOURS * 60 * 60 * 1000
      ).toISOString();
      const { data: recentAlert } = await (service as any)
        .from("call_knocks")
        .select("id")
        .eq("model_id", model.id)
        .gte("model_notified_at", dedupCutoff)
        .limit(1) as { data: Array<{ id: string }> | null };

      if (!recentAlert || recentAlert.length === 0) {
        const { data: fan } = await supabase
          .from("fans")
          .select("username, display_name")
          .eq("id", callerActor.id)
          .single() as {
            data: { username: string | null; display_name: string | null } | null;
          };
        const fanName = fan?.username ? `@${fan.username}` : fan?.display_name || "A fan";
        const callRate =
          (callType === "voice" ? model.voice_call_rate : model.video_call_rate) || 0;

        if (model.email) {
          await sendCallKnockEmail({
            to: model.email,
            modelName: model.first_name || model.username || "Model",
            fanName,
            callType,
            callRate,
          });
        }

        // Gated per-actor by the push_preferences 'calls' toggle; no-op
        // without subscriptions. Best-effort — never throws.
        await sendPushToActor(
          model.id,
          {
            title: "A fan is trying to call you 📞",
            body: `${fanName} wants to ${callType} call you${callRate > 0 ? ` · your rate is ${callRate} coins/min` : ""}. Go available and we'll tell them you're ready.`,
            url: "/dashboard",
            tag: "call-knock",
          },
          "calls"
        );

        // Stamp the dedup window on this fan's row
        await (service as any)
          .from("call_knocks")
          .update({ model_notified_at: nowIso })
          .eq("fan_id", callerActor.id)
          .eq("model_id", model.id);

        modelAlerted = true;
      }
    }

    // call_knock is in the /api/analytics/event allowlist; emitted server-side
    // here (same pattern as availability_toggled). models.id === actors.id.
    const { error: analyticsError } = await (service as any)
      .from("analytics_events")
      .insert({
        event_name: "call_knock",
        model_id: model.id,
        visitor_id: null,
        session_id: null,
        user_id: user.id,
        metadata: { call_type: callType, mode, model_alerted: modelAlerted },
      });
    if (analyticsError) {
      // Non-fatal: never fail the knock over analytics
      logger.warn("Failed to track call_knock", { message: analyticsError.message });
    }

    return NextResponse.json({ success: true, modelAlerted });
  } catch (error) {
    logger.error("Call knock error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
