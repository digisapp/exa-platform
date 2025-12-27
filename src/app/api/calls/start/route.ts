import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateRoomName, generateToken } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientUsername } = await request.json();

    if (!recipientUsername) {
      return NextResponse.json({ error: "Recipient username required" }, { status: 400 });
    }

    // Get caller's actor
    const { data: callerActor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!callerActor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get recipient model and their actor
    const { data: recipientModel } = await (supabase
      .from("models") as any)
      .select("id, username, first_name, user_id, video_call_rate")
      .eq("username", recipientUsername)
      .eq("is_approved", true)
      .single();

    if (!recipientModel) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get recipient's actor
    const { data: recipientActor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", recipientModel.user_id)
      .single() as { data: { id: string } | null };

    if (!recipientActor) {
      return NextResponse.json({ error: "Recipient actor not found" }, { status: 404 });
    }

    // Check caller's coin balance if they're a fan calling a model with a rate
    const videoCallRate = recipientModel.video_call_rate || 0;

    if (callerActor.type === "fan" && videoCallRate > 0) {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", callerActor.id)
        .single() as { data: { coin_balance: number } | null };

      // Require at least 2 minutes worth of coins
      const minBalance = videoCallRate * 2;
      if (!fan || fan.coin_balance < minBalance) {
        return NextResponse.json({
          error: `Insufficient coins. Need at least ${minBalance} coins to start a call.`
        }, { status: 400 });
      }
    }

    // Find or create conversation
    const { data: existingConv } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", callerActor.id) as { data: { conversation_id: string }[] | null };

    let conversationId: string | null = null;

    if (existingConv) {
      for (const cp of existingConv) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("actor_id")
          .eq("conversation_id", cp.conversation_id)
          .eq("actor_id", recipientActor.id)
          .single();

        if (otherParticipant) {
          conversationId = cp.conversation_id;
          break;
        }
      }
    }

    // Create conversation if doesn't exist
    if (!conversationId) {
      const { data: newConv, error: convError } = await (supabase
        .from("conversations") as any)
        .insert({ type: "direct" })
        .select()
        .single() as { data: { id: string } | null; error: any };

      if (convError || !newConv) {
        throw new Error("Failed to create conversation");
      }

      conversationId = newConv.id;

      // Add participants
      await (supabase.from("conversation_participants") as any).insert([
        { conversation_id: conversationId, actor_id: callerActor.id },
        { conversation_id: conversationId, actor_id: recipientActor.id },
      ]);
    }

    // Generate room name
    const roomName = generateRoomName();

    // Create call session
    const { data: session, error: sessionError } = await (supabase
      .from("video_call_sessions") as any)
      .insert({
        conversation_id: conversationId,
        room_name: roomName,
        initiated_by: callerActor.id,
        recipient_id: recipientActor.id,
        status: "pending",
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Session error:", sessionError);
      throw new Error("Failed to create call session");
    }

    // Get caller's display name
    let callerName = "User";
    if (callerActor.type === "model") {
      const { data: callerModel } = await (supabase.from("models") as any)
        .select("first_name, username")
        .eq("user_id", user.id)
        .single();
      callerName = callerModel?.first_name || callerModel?.username || "User";
    } else if (callerActor.type === "fan") {
      const { data: callerFan } = await supabase
        .from("fans")
        .select("display_name")
        .eq("user_id", user.id)
        .single() as { data: { display_name: string } | null };
      callerName = callerFan?.display_name || "Fan";
    }

    // Generate token for caller
    const token = await generateToken(roomName, callerName, callerActor.id);

    return NextResponse.json({
      sessionId: session.id,
      roomName,
      token,
      recipientName: recipientModel.first_name || recipientModel.username,
      videoCallRate,
    });
  } catch (error) {
    console.error("Start call error:", error);
    return NextResponse.json(
      { error: "Failed to start call" },
      { status: 500 }
    );
  }
}
