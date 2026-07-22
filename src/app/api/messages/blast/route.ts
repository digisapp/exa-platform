import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { batchQuery } from "@/lib/supabase/batch";
import { sendBlastToConversations } from "@/lib/messages/blast-send";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync } from "@/lib/rate-limit";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

    const suspended = await assertNotSuspended(actor.id);
    if (suspended) return suspended;

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

    // Get other participants in these conversations with their types.
    // batchQuery chunks the id list — one .in() with every id fails outright
    // past ~300 UUIDs (16KB URL limit), which would kill the whole blast for
    // a model with 300+ conversations.
    const otherParticipants: any[] = await batchQuery(conversationIds, async (batch, from, to) =>
      (supabase as any)
        .from("conversation_participants")
        .select(`
          conversation_id,
          actor:actors(id, type)
        `)
        .in("conversation_id", batch)
        .neq("actor_id", actor.id)
        .order("conversation_id", { ascending: true })
        .order("actor_id", { ascending: true })
        .range(from, to)
    );

    if (otherParticipants.length === 0) {
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

    // Send message to each conversation in parallel (batched inserts +
    // updated_at bumps + the unread-counter RPC — shared mechanics live in
    // blast-send.ts). Auth already happened above; the helper writes via the
    // service client, inserting the exact rows RLS allowed the model anyway.
    const serviceClient = createServiceRoleClient();
    const { sent: sentCount, failedConversationIds } = await sendBlastToConversations(
      serviceClient,
      actor.id,
      message.trim(),
      targetConversations.map((p) => p.conversation_id as string)
    );
    const errors = failedConversationIds.map(
      (id) => `Failed to send to conversation ${id}`
    );

    return NextResponse.json({
      success: true,
      sentCount,
      totalTargeted: targetConversations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Blast message error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
