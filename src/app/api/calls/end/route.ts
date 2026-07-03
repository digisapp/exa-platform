import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { settleCallSession } from "@/lib/calls/settlement";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const endCallSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = endCallSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { sessionId } = parsed.data;

    // Get user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get call session
    const { data: session } = await supabase
      .from("video_call_sessions")
      .select("id, status, started_at, recipient_id, call_type, initiated_by, conversation_id, duration_seconds, coins_charged")
      .eq("id", sessionId)
      .or(`initiated_by.eq.${actor.id},recipient_id.eq.${actor.id}`)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    // Idempotency: if call already ended, return existing data
    if (session.status === "ended") {
      return NextResponse.json({
        success: true,
        duration: session.duration_seconds || 0,
        coinsCharged: session.coins_charged || 0,
        message: "Call already ended",
      });
    }

    // Calculate duration
    const now = new Date();
    const startedAt = session.started_at ? new Date(session.started_at) : now;
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    const callType = (session.call_type === "voice" ? "voice" : "video") as "video" | "voice";
    const adminClient = createServiceRoleClient();

    // Atomically claim the session as ended BEFORE charging. The conditional
    // `status != 'ended'` makes this a compare-and-set: only the first of two
    // concurrent end-call requests claims the row. We deliberately mark it
    // `settled: false` and do NOT record coins_charged yet — the charge is
    // only recorded once end_call_transfer actually succeeds, so a failed
    // transfer never leaves a row falsely claiming the fan was charged.
    const { data: claimedRows, error: claimError } = await adminClient
      .from("video_call_sessions")
      .update({
        status: "ended",
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        settled: false,
      })
      .eq("id", sessionId)
      .neq("status", "ended")
      .select("id");

    if (claimError) {
      console.error("CRITICAL: Session claim update failed:", sessionId, claimError);
      return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
    }

    // Another concurrent request already ended (and charged for) this session.
    if (!claimedRows || claimedRows.length === 0) {
      return NextResponse.json({
        success: true,
        duration: session.duration_seconds || durationSeconds,
        coinsCharged: session.coins_charged || 0,
        message: "Call already ended",
      });
    }

    // We won the claim — settle exactly once. end_call_transfer is idempotent,
    // and if it fails the session stays unsettled for the sweeper cron to retry
    // (so revenue is never silently lost).
    const { settled, coinsCharged } = await settleCallSession({
      admin: adminClient,
      sessionId,
      initiatedBy: session.initiated_by,
      recipientId: session.recipient_id,
      callType,
      durationSeconds,
    });

    // Add system message to conversation. Only assert a coin amount once the
    // transfer has actually settled; otherwise show duration only.
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = minutes + ":" + seconds.toString().padStart(2, "0");
    const coinsStr = settled && coinsCharged > 0 ? " (" + coinsCharged + " coins)" : "";
    const callTypeLabel = callType === "voice" ? "Voice" : "Video";

    await supabase.from("messages").insert({
      conversation_id: session.conversation_id,
      sender_id: actor.id,
      content: `${callTypeLabel} call ended - ${durationStr}${coinsStr}`,
      is_system: true,
    });

    return NextResponse.json({
      success: true,
      duration: durationSeconds,
      coinsCharged,
      settlementPending: !settled,
    });
  } catch (error) {
    console.error("End call error:", error);
    return NextResponse.json(
      { error: "Failed to end call" },
      { status: 500 }
    );
  }
}
