import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/lib/livekit";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { sessionId, accept } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Get user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get call session
    const { data: session } = await supabase
      .from("video_call_sessions")
      .select("id, room_name, status, recipient_id, conversation_id")
      .eq("id", sessionId)
      .eq("recipient_id", actor.id)
      .eq("status", "pending")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Call session not found or already responded" }, { status: 404 });
    }

    if (accept) {
      // Accept the call
      const { error: updateError } = await supabase
        .from("video_call_sessions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) {
        throw updateError;
      }

      // Get recipient's name for token
      const { data: model } = await supabase.from("models")
        .select("first_name, username")
        .eq("user_id", user.id)
        .single();

      const recipientName = model?.first_name || model?.username || "Model";

      // Generate token for recipient
      const token = await generateToken(session.room_name, recipientName, actor.id);

      return NextResponse.json({
        success: true,
        roomName: session.room_name,
        token,
      });
    } else {
      // Decline the call
      await supabase
        .from("video_call_sessions")
        .update({
          status: "declined",
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return NextResponse.json({ success: true, declined: true });
    }
  } catch (error) {
    console.error("Respond to call error:", error);
    return NextResponse.json(
      { error: "Failed to respond to call" },
      { status: 500 }
    );
  }
}
