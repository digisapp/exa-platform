import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
});

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

    const body = await request.json();
    const parsed = deleteMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { messageId } = parsed.data;

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!sender) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Get the message to verify ownership
    const { data: message } = await (supabase
      .from("messages") as any)
      .select("id, sender_id, conversation_id, deleted_at")
      .eq("id", messageId)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if already deleted
    if (message.deleted_at) {
      return NextResponse.json(
        { error: "Message already deleted" },
        { status: 400 }
      );
    }

    // Verify the user is the sender of the message
    if (message.sender_id !== sender.id) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Soft delete the message
    const { error: deleteError } = await (supabase
      .from("messages") as any)
      .update({
        deleted_at: new Date().toISOString(),
        content: null, // Clear content
        media_url: null, // Clear media
        media_type: null,
      })
      .eq("id", messageId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
