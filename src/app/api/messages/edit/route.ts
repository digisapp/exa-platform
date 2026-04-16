import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Messages can be edited within this window after sending
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().trim().min(1, "Content cannot be empty").max(5000, "Message too long"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Validate
    const body = await request.json();
    const parsed = editMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { messageId, content } = parsed.data;

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!sender) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Fetch message — verify ownership, edit window, and that it has text content
    const { data: message } = await (supabase
      .from("messages")
      .select("id, sender_id, conversation_id, content, media_url, deleted_at, created_at, is_system")
      .eq("id", messageId)
      .single() as any);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.deleted_at) {
      return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
    }

    if (message.is_system) {
      return NextResponse.json({ error: "Cannot edit system messages" }, { status: 400 });
    }

    if (message.sender_id !== sender.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Edit window check: must be within EDIT_WINDOW_MS of send time
    const sentMs = new Date(message.created_at).getTime();
    if (Date.now() - sentMs > EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: "Edit window has expired (15 minutes)" },
        { status: 400 }
      );
    }

    // Don't allow editing media-only messages — they have no text to change
    if (!message.content && message.media_url) {
      return NextResponse.json(
        { error: "Media messages cannot be edited" },
        { status: 400 }
      );
    }

    // Update
    const { data: updated, error: updateError } = await (supabase
      .from("messages") as any)
      .update({
        content,
        edited_at: new Date().toISOString(),
        edit_count: (message.edit_count ?? 0) + 1,
      })
      .eq("id", messageId)
      .select("id, content, edited_at, edit_count")
      .single();

    if (updateError) {
      logger.error("Edit message db error", updateError);
      return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    logger.error("Edit message error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
