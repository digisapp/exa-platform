import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { escapeIlike } from "@/lib/utils";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Service role client for privileged operations (server-side only)
const adminClient = createServiceRoleClient();

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "general");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error("[API find-or-create] No user found - cookie forwarding may have failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationSchema = z.object({
      modelUsername: z.string().min(1, "Model username required"),
    });
    const parsed = conversationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { modelUsername } = parsed.data;

    // Get current user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      logger.error("[API find-or-create] Actor not found for user", undefined, { userId: user.id });
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Look up model by username (case-insensitive)
    const { data: targetModel, error: modelError } = await supabase
      .from("models")
      .select("id, user_id, username")
      .ilike("username", escapeIlike(modelUsername.toLowerCase()))
      .maybeSingle();

    if (modelError) {
      logger.error("[API find-or-create] Model lookup error", modelError);
      return NextResponse.json(
        { error: "Failed to lookup model" },
        { status: 500 }
      );
    }

    if (!targetModel) {
      logger.error("[API find-or-create] Model not found", modelUsername);
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    if (!targetModel.user_id) {
      logger.error("[API find-or-create] Model has no user_id", undefined, { username: targetModel.username });
      return NextResponse.json(
        { error: "Model has no associated user" },
        { status: 400 }
      );
    }

    // Get the model's actor ID using admin client (bypasses RLS)
    const { data: targetActor, error: actorError } = await adminClient
      .from("actors")
      .select("id")
      .eq("user_id", targetModel.user_id)
      .maybeSingle();

    if (actorError) {
      logger.error("[API] Actor lookup error", actorError);
      return NextResponse.json(
        { error: "Failed to lookup model actor" },
        { status: 500 }
      );
    }

    if (!targetActor) {
      return NextResponse.json(
        { error: "Model actor not found" },
        { status: 404 }
      );
    }

    if (targetActor.id === actor.id) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 }
      );
    }

    // Check if conversation already exists between these two users
    const { data: senderParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", actor.id);

    let existingConversationId: string | null = null;

    if (senderParticipations && senderParticipations.length > 0) {
      const conversationIds = senderParticipations.map(p => p.conversation_id);

      // Use admin client to check if model is in any of these conversations
      const { data: recipientParticipation } = await adminClient
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", targetActor.id)
        .in("conversation_id", conversationIds)
        .limit(1)
        .maybeSingle();

      if (recipientParticipation) {
        existingConversationId = recipientParticipation.conversation_id;
      }
    }

    if (existingConversationId) {
      return NextResponse.json({
        success: true,
        conversationId: existingConversationId,
        isNew: false,
      });
    }

    // No existing conversation — return model info so caller can defer
    // creation until the first message is actually sent
    return NextResponse.json({
      success: true,
      conversationId: null,
      isNew: true,
      targetModelUsername: targetModel.username,
      targetActorId: targetActor.id,
    });
  } catch (error) {
    logger.error("[API] Find or create conversation error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
