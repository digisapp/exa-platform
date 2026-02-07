import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateCallCost } from "@/lib/livekit";
import { z } from "zod";

const endCallSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = endCallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { sessionId } = parsed.data;

    // Get user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get call session
    const { data: session } = await (supabase
      .from("video_call_sessions") as any)
      .select("*")
      .eq("id", sessionId)
      .or(`initiated_by.eq.${actor.id},recipient_id.eq.${actor.id}`)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    // Calculate duration
    const now = new Date();
    const startedAt = session.started_at ? new Date(session.started_at) : now;
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Get recipient's actor user_id
    const { data: recipientActorData } = await supabase
      .from("actors")
      .select("user_id")
      .eq("id", session.recipient_id)
      .single() as { data: { user_id: string } | null };

    // Get call rates from recipient model
    const { data: recipientModel } = await (supabase.from("models") as any)
      .select("video_call_rate, voice_call_rate, user_id, coin_balance")
      .eq("user_id", recipientActorData?.user_id)
      .single();

    // Use appropriate rate based on call type
    const callType = session.call_type || "video";
    const ratePerMinute = callType === "voice"
      ? (recipientModel?.voice_call_rate || 0)
      : (recipientModel?.video_call_rate || 0);
    const coinsToCharge = calculateCallCost(durationSeconds, ratePerMinute);

    // Charge coins from caller if they initiated and there's a rate
    if (coinsToCharge > 0 && session.initiated_by !== session.recipient_id) {
      // Get caller's actor type
      const { data: callerActor } = await supabase
        .from("actors")
        .select("type")
        .eq("id", session.initiated_by)
        .single() as { data: { type: string } | null };

      if (callerActor?.type === "fan") {
        // Deduct from fan
        const { data: fan } = await (supabase
          .from("fans") as any)
          .select("coin_balance")
          .eq("id", session.initiated_by)
          .single() as { data: { coin_balance: number } | null };

        if (fan) {
          await (supabase
            .from("fans") as any)
            .update({ coin_balance: Math.max(0, fan.coin_balance - coinsToCharge) })
            .eq("id", session.initiated_by);

          // Record transaction
          const actionName = callType === "voice" ? "voice_call" : "video_call";
          await (supabase.from("coin_transactions") as any).insert({
            actor_id: session.initiated_by,
            amount: -coinsToCharge,
            action: actionName,
            metadata: { session_id: sessionId, duration_seconds: durationSeconds, call_type: callType },
          });
        }
      }

      // Credit model
      if (recipientModel) {
        await (supabase.from("models") as any)
          .update({ coin_balance: (recipientModel.coin_balance || 0) + coinsToCharge })
          .eq("user_id", recipientModel.user_id);

        // Record model earnings
        const receivedActionName = callType === "voice" ? "voice_call_received" : "video_call_received";
        await (supabase.from("coin_transactions") as any).insert({
          actor_id: session.recipient_id,
          amount: coinsToCharge,
          action: receivedActionName,
          metadata: { session_id: sessionId, duration_seconds: durationSeconds, call_type: callType },
        });
      }
    }

    // Update session
    await (supabase.from("video_call_sessions") as any)
      .update({
        status: "ended",
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        coins_charged: coinsToCharge,
      })
      .eq("id", sessionId);

    // Add system message to conversation
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = minutes + ":" + seconds.toString().padStart(2, "0");
    const coinsStr = coinsToCharge > 0 ? " (" + coinsToCharge + " coins)" : "";
    const callTypeLabel = callType === "voice" ? "Voice" : "Video";

    await (supabase.from("messages") as any).insert({
      conversation_id: session.conversation_id,
      sender_id: actor.id,
      content: `${callTypeLabel} call ended - ${durationStr}${coinsStr}`,
      is_system: true,
    });

    return NextResponse.json({
      success: true,
      duration: durationSeconds,
      coinsCharged: coinsToCharge,
    });
  } catch (error) {
    console.error("End call error:", error);
    return NextResponse.json(
      { error: "Failed to end call" },
      { status: 500 }
    );
  }
}
