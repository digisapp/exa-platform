import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateRoomName, generateToken } from "@/lib/livekit";
import { sendVideoCallRequestEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientUsername, conversationId: providedConversationId } = await request.json();

    if (!recipientUsername && !providedConversationId) {
      return NextResponse.json({ error: "Recipient username or conversation ID required" }, { status: 400 });
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

    let recipientActor: { id: string } | null = null;
    let recipientModel: { id: string; username: string; first_name: string; user_id: string; video_call_rate: number; email?: string | null } | null = null;
    let conversationId: string | null = providedConversationId || null;

    // If conversationId provided, get recipient from conversation
    if (providedConversationId) {
      // Verify caller is in this conversation
      const { data: callerParticipant } = await supabase
        .from("conversation_participants")
        .select("actor_id")
        .eq("conversation_id", providedConversationId)
        .eq("actor_id", callerActor.id)
        .single();

      if (!callerParticipant) {
        return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
      }

      // Get the other participant (recipient)
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("actor_id")
        .eq("conversation_id", providedConversationId)
        .neq("actor_id", callerActor.id)
        .single() as { data: { actor_id: string } | null };

      if (!otherParticipant) {
        return NextResponse.json({ error: "Recipient not found in conversation" }, { status: 404 });
      }

      recipientActor = { id: otherParticipant.actor_id };

      // Get recipient's user_id from actors table
      const { data: recipientActorData } = await supabase
        .from("actors")
        .select("user_id, type")
        .eq("id", otherParticipant.actor_id)
        .single() as { data: { user_id: string; type: string } | null };

      if (recipientActorData) {
        // Try to get model info (might be a model or fan)
        const { data: model } = await (supabase
          .from("models") as any)
          .select("id, username, first_name, user_id, video_call_rate, email")
          .eq("user_id", recipientActorData.user_id)
          .single();

        if (model) {
          recipientModel = model;
        } else {
          // Recipient is a fan, set default values
          recipientModel = {
            id: otherParticipant.actor_id,
            username: "user",
            first_name: "User",
            user_id: recipientActorData.user_id,
            video_call_rate: 0,
          };
        }
      }
    } else {
      // Use recipientUsername to find recipient
      const { data: model } = await (supabase
        .from("models") as any)
        .select("id, username, first_name, user_id, video_call_rate, email")
        .eq("username", recipientUsername)
        .eq("is_approved", true)
        .single();

      if (!model) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }

      recipientModel = model;

      // Get recipient's actor
      const { data: actor } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", model.user_id)
        .single() as { data: { id: string } | null };

      if (!actor) {
        return NextResponse.json({ error: "Recipient actor not found" }, { status: 404 });
      }

      recipientActor = actor;
    }

    if (!recipientActor || !recipientModel) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
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
          error: `Insufficient coins. Need at least ${minBalance} coins to start a call.`,
          required: minBalance,
          balance: fan?.coin_balance || 0,
        }, { status: 402 });
      }
    }

    // Find or create conversation if not provided
    if (!conversationId) {
      const { data: existingConv } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", callerActor.id) as { data: { conversation_id: string }[] | null };

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

    // Determine if coins are required (fan calling model with rate)
    const requiresCoins = callerActor.type === "fan" && videoCallRate > 0;

    // Send email notification to model (non-blocking)
    if (recipientModel?.email && videoCallRate > 0) {
      sendVideoCallRequestEmail({
        to: recipientModel.email,
        modelName: recipientModel.first_name || recipientModel.username || "Model",
        callerName,
        callRate: videoCallRate,
      }).catch((err) => console.error("Failed to send video call email:", err));
    }

    return NextResponse.json({
      sessionId: session.id,
      roomName,
      token,
      recipientName: recipientModel.first_name || recipientModel.username,
      videoCallRate,
      requiresCoins,
    });
  } catch (error) {
    console.error("Start call error:", error);
    return NextResponse.json(
      { error: "Failed to start call" },
      { status: 500 }
    );
  }
}
