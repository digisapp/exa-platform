import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync } from "@/lib/rate-limit";
import { z } from "zod";

const blastSchema = z.object({
  message: z.string().min(1, "Message content required").max(5000, "Message is too long"),
  recipientType: z.enum(["fans", "brands", "all"], { message: "Invalid recipient type" }),
});

// Strict rate limit for blasts: 1 per hour
const BLAST_LIMIT = { limit: 1, windowSeconds: 3600 };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor and verify they're a model
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    if (actor.type !== "model") {
      return NextResponse.json(
        { error: "Only models can send blasts" },
        { status: 403 }
      );
    }

    // Validate body BEFORE consuming rate limit token
    const body = await request.json();
    const validationResult = blastSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { message, recipientType } = validationResult.data;

    // Rate limit check - 1 blast per hour per model (after validation)
    const rateLimitResult = await rateLimitAsync(`blast:${actor.id}`, BLAST_LIMIT);
    if (!rateLimitResult.success) {
      const minutesRemaining = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `You can send another blast in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}`,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    // Get all conversations where this model is a participant (capped for safety)
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", actor.id)
      .limit(5000) as { data: { conversation_id: string }[] | null };

    if (!participations || participations.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "No conversations to send to",
      });
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // Get other participants in these conversations with their types
    const { data: otherParticipants } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        actor:actors(id, type)
      `)
      .in("conversation_id", conversationIds)
      .neq("actor_id", actor.id) as { data: any[] | null };

    if (!otherParticipants || otherParticipants.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "No recipients found",
      });
    }

    // Filter by recipient type
    const targetConversations = otherParticipants.filter((p) => {
      if (recipientType === "all") return true;
      if (recipientType === "fans") return p.actor?.type === "fan";
      if (recipientType === "brands") return p.actor?.type === "brand";
      return false;
    });

    if (targetConversations.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: `No ${recipientType} to send to`,
      });
    }

    // Send message to each conversation in parallel (batched)
    const batchSize = 10;
    let sentCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < targetConversations.length; i += batchSize) {
      const batch = targetConversations.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (p) => {
          // Insert message directly (model sending is free)
          const { error } = await supabase.from("messages").insert({
            conversation_id: p.conversation_id,
            sender_id: actor.id,
            content: message.trim(),
            is_system: false,
          });

          if (error) throw error;

          // Update conversation timestamp
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", p.conversation_id);

          return true;
        })
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          sentCount++;
        } else {
          errors.push(`Failed to send to conversation ${batch[index].conversation_id}`);
        }
      });
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalTargeted: targetConversations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Blast message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
