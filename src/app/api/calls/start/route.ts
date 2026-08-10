import { createClient } from "@/lib/supabase/server";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { NextRequest, NextResponse } from "next/server";
import { generateRoomName, generateToken } from "@/lib/livekit";
import { sendVideoCallRequestEmail } from "@/lib/email";
import { sendIncomingCallSMS } from "@/lib/sms";
import { sendPushToActor } from "@/lib/push";
import { isReachableForCalls } from "@/lib/call-availability";
import { CALL_RATE_LIMITS } from "@/types/video-calls";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export type CallType = "video" | "voice";

const startCallSchema = z.object({
  recipientUsername: z.string().min(1).optional(),
  conversationId: z.string().uuid().optional(),
  callType: z.enum(["video", "voice"]).optional().default("video"),
});

export async function POST(request: NextRequest) {
  try {
    // as any needed: nullable field mismatches with typed query results
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = startCallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { recipientUsername, conversationId: providedConversationId, callType } = parsed.data;

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

    const suspended = await assertNotSuspended(callerActor.id);
    if (suspended) return suspended;

    let recipientActor: { id: string } | null = null;
    let recipientModel: { id: string; username: string | null; first_name: string | null; user_id: string | null; video_call_rate: number | null; voice_call_rate: number | null; email?: string | null; phone?: string | null; video_is_online?: boolean | null; available_for_calls?: boolean | null; preferred_language?: string | null } | null = null;
    // True only when the recipient resolved to a real models row (the
    // conversation path can also target a fan, for whom the reachability
    // gate must not apply).
    let recipientIsModel = false;
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
        const { data: model } = await supabase
          .from("models")
          .select("id, username, first_name, user_id, video_call_rate, voice_call_rate, email, phone, video_is_online, available_for_calls, preferred_language")
          .eq("user_id", recipientActorData.user_id)
          .single();

        if (model) {
          recipientModel = model;
          recipientIsModel = true;
        } else {
          // Recipient is a fan, set default values
          recipientModel = {
            id: otherParticipant.actor_id,
            username: "user",
            first_name: "User",
            user_id: recipientActorData.user_id,
            video_call_rate: 0,
            voice_call_rate: 0,
          };
        }
      }
    } else if (recipientUsername) {
      // Use recipientUsername to find recipient
      const { data: model } = await supabase
        .from("models")
        .select("id, username, first_name, user_id, video_call_rate, voice_call_rate, email, phone, video_is_online, available_for_calls, preferred_language")
        .eq("username", recipientUsername)
        .eq("is_approved", true)
        .single();

      if (!model) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }

      recipientModel = model;
      recipientIsModel = true;

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

    // Don't let a fan start a call into dead air. Reachable = video_is_online
    // (on-site heartbeat, cleared by the offline-models cron after ~2 min)
    // OR available_for_calls (the manual toggle — an available model gets
    // rung via email/SMS/push even without an open tab). Only gates fans
    // calling real models.
    if (callerActor.type === "fan" && recipientIsModel && !isReachableForCalls(recipientModel)) {
      return NextResponse.json({
        error: `${recipientModel.username || "This model"} isn't taking calls right now. Try again when they're available, or send a message.`,
        code: "recipient_offline",
      }, { status: 409 });
    }

    // Check caller's coin balance if they're a fan calling a model with a rate
    const callRate = callType === "voice"
      ? (recipientModel.voice_call_rate || 0)
      : (recipientModel.video_call_rate || 0);

    if (callerActor.type === "fan" && callRate > 0) {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", callerActor.id)
        .single() as { data: { coin_balance: number } | null };

      // Require at least 2 minutes worth of coins
      const minBalance = callRate * 2;
      if (!fan || fan.coin_balance < minBalance) {
        return NextResponse.json({
          error: `Insufficient coins. Need at least ${minBalance} coins to start a ${callType} call.`,
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

      if (existingConv && existingConv.length > 0) {
        // Batched shared-conversation lookup (same pattern as messages/send):
        // the old per-conversation loop issued one query per membership, which
        // put 50-100+ sequential round trips in the call-connect critical path.
        const convIds = existingConv.map((cp) => cp.conversation_id);
        for (let i = 0; i < convIds.length && !conversationId; i += 200) {
          const { data: match } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("actor_id", recipientActor.id)
            .in("conversation_id", convIds.slice(i, i + 200))
            .limit(1)
            .maybeSingle();

          if (match) {
            conversationId = match.conversation_id;
          }
        }
      }

      // Create conversation if doesn't exist
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ type: "direct" })
          .select()
          .single();

        if (convError || !newConv) {
          throw new Error("Failed to create conversation");
        }

        conversationId = newConv.id;

        // Add participants
        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, actor_id: callerActor.id },
          { conversation_id: conversationId, actor_id: recipientActor.id },
        ]);

        // Insert system message so the conversation isn't empty
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: callerActor.id,
          content: callType === "voice" ? "Voice call started" : "Video call started",
          is_system: true,
        });
      }
    }

    // Cap concurrent ringing: a caller with calls already ringing shouldn't be
    // able to spam-dial. Pending sessions expire as missed after ~3 min via the
    // sweeper, so this can't wedge a legitimate caller for long.
    const { count: pendingCount } = await supabase
      .from("video_call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("initiated_by", callerActor.id)
      .eq("status", "pending");

    if ((pendingCount ?? 0) >= CALL_RATE_LIMITS.maxPendingCalls) {
      return NextResponse.json({
        error: "You already have a call ringing. Wait for it to be answered or cancel it first.",
        code: "too_many_pending_calls",
      }, { status: 429 });
    }

    // Generate room name
    const roomName = generateRoomName();

    // Create call session
    const { data: session, error: sessionError } = await supabase
      .from("video_call_sessions")
      .insert({
        conversation_id: conversationId,
        room_name: roomName,
        initiated_by: callerActor.id,
        recipient_id: recipientActor.id,
        status: "pending",
        call_type: callType,
      })
      .select()
      .single();

    if (sessionError || !session) {
      logger.error("Session error", sessionError);
      throw new Error("Failed to create call session");
    }

    // Get caller's display name
    let callerName = "User";
    if (callerActor.type === "model") {
      const { data: callerModel } = await supabase.from("models")
        .select("username")
        .eq("user_id", user.id)
        .single();
      callerName = callerModel?.username || "User";
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
    const requiresCoins = callerActor.type === "fan" && callRate > 0;

    // Send email notification to model (non-blocking)
    if (recipientModel?.email && callRate > 0) {
      sendVideoCallRequestEmail({
        to: recipientModel.email,
        modelName: recipientModel.first_name || recipientModel.username || "Model",
        callerName,
        callRate,
        callType,
      }).catch((err) => logger.error(`Failed to send ${callType} call email`, err));
    }

    // SMS ring (non-blocking): the in-app ring only reaches an open browser
    // tab, so without this a model who isn't staring at the dashboard never
    // knows a paying fan called.
    if (recipientModel?.phone && callRate > 0) {
      sendIncomingCallSMS(
        recipientModel.phone,
        recipientModel.first_name || recipientModel.username || "Model",
        callerName,
        callType,
        recipientModel.preferred_language || "en"
      ).catch((err) => logger.error(`Failed to send ${callType} call SMS`, err));
    }

    // Web push ring (non-blocking): reaches a closed tab the instant the call
    // starts — the whole point of available_for_calls. Gated per-actor by the
    // push_preferences 'calls' toggle inside sendPushToActor; no-op without
    // subscriptions. Same tag per session so a re-ring replaces, not stacks.
    sendPushToActor(
      recipientActor.id,
      {
        title: callType === "voice" ? "Incoming voice call" : "Incoming video call",
        body: `${callerName} is calling you now${requiresCoins ? ` · ${callRate} coins/min` : ""} — tap to answer.`,
        url: `/chats/${conversationId}`,
        tag: `call-${session.id}`,
      },
      "calls"
    ).catch((err) => logger.error(`Failed to send ${callType} call push`, err));

    return NextResponse.json({
      sessionId: session.id,
      roomName,
      token,
      recipientName: recipientModel.username,
      callRate,
      callType,
      requiresCoins,
    });
  } catch (error) {
    logger.error("Start call error", error);
    return NextResponse.json(
      { error: "Failed to start call" },
      { status: 500 }
    );
  }
}
