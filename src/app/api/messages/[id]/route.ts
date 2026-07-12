import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { stripLockedMediaUrl } from "@/lib/ppv";
import { signChatMediaUrls } from "@/lib/chat-media";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Service client: clients can no longer SELECT messages.media_url (column
// grants, migration 20260711100005). This route may read it because it
// verifies conversation membership and strips locked media per-viewer.
const adminClient = createServiceRoleClient();

const messageIdSchema = z.string().uuid("Invalid message ID");

// GET /api/messages/[id] - fetch a single message, sanitized for the caller.
// Realtime payloads no longer carry media_url (column grants), so clients use
// this to hydrate media messages after the postgres_changes doorbell rings.
// Same per-viewer stripping rules as /api/messages/list.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = messageIdSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const messageId = parsed.data;

    // Resolve caller's actor
    const { data: viewer } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!viewer) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Load the message via service client (explicit columns, same as list)
    const { data: message } = await (adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, deleted_at, created_at, reply_to_id")
      .eq("id", messageId)
      .maybeSingle() as any);

    if (!message || message.deleted_at) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify the caller is a participant of the message's conversation
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", message.conversation_id)
      .eq("actor_id", viewer.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Strip locked PPV media per-viewer, THEN sign a surviving chat-media
    // storage path into a short-lived URL (src/lib/chat-media.ts).
    const [sanitized] = await signChatMediaUrls(adminClient, [
      stripLockedMediaUrl(message, viewer.id),
    ]);

    return NextResponse.json(
      { message: sanitized },
      { headers: { "Cache-Control": "private, no-cache" } }
    );
  } catch (error) {
    logger.error("Get message error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
