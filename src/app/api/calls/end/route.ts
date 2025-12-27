import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateCallCost } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

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

    // Get video call rate from recipient model
    const { data: recipientModel } = await (supabase.from("models") as any)
      .select("video_call_rate, user_id, coin_balance")
      .eq("user_id", recipientActorData?.user_id)
      .single();

    const ratePerMinute = recipientModel?.video_call_rate || 0;
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
          await (supabase.from("coin_transactions") as any).insert({
            actor_id: session.initiated_by,
            amount: -coinsToCharge,
            action: "video_call",
            metadata: { session_id: sessionId, duration_seconds: durationSeconds },
          });
        }
      }

      // Credit model
      if (recipientModel) {
        await (supabase.from("models") as any)
          .update({ coin_balance: (recipientModel.coin_balance || 0) + coinsToCharge })
          .eq("user_id", recipientModel.user_id);

        // Record model earnings
        await (supabase.from("coin_transactions") as any).insert({
          actor_id: session.recipient_id,
          amount: coinsToCharge,
          action: "video_call_received",
          metadata: { session_id: sessionId, duration_seconds: durationSeconds },
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

    await (supabase.from("messages") as any).insert({
      conversation_id: session.conversation_id,
      sender_id: actor.id,
      content: "Video call ended - " + durationStr + coinsStr,
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
