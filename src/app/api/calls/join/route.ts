import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLiveKitToken } from '@/lib/livekit';
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const joinCallSchema = z.object({
  sessionId: z.string().uuid(),
});

const declineCallQuerySchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(["missed", "declined"]).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = joinCallSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { sessionId } = parsed.data;

    // Get joiner's actor
    const { data: joinerActor } = await supabase
      .from('actors')
      .select('id, type')
      .eq('user_id', user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!joinerActor) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
    }

    // Get the call session
    const { data: callSession } = await supabase
      .from('video_call_sessions')
      .select('id, recipient_id, status, room_name, call_type, conversation_id, initiated_by')
      .eq('id', sessionId)
      .single() ;

    if (!callSession) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 });
    }

    // Verify joiner is the recipient
    if (callSession.recipient_id !== joinerActor.id) {
      return NextResponse.json({ error: 'Not authorized to join this call' }, { status: 403 });
    }

    // Check call status
    if (callSession.status !== 'pending') {
      return NextResponse.json({ error: `Call is ${callSession.status}` }, { status: 400 });
    }

    // Get joiner's display name
    let joinerName = 'User';
    if (joinerActor.type === 'model') {
      const { data: model } = await supabase
        .from('models')
        .select('username')
        .eq('user_id', user.id)
        .single() as { data: { username?: string } | null };
      joinerName = model?.username || 'User';
    } else {
      const { data: fan } = await supabase
        .from('fans')
        .select('display_name')
        .eq('id', joinerActor.id)
        .single() as { data: { display_name?: string } | null };
      joinerName = fan?.display_name || 'User';
    }

    // Update call session to active
    const { error: updateError } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      logger.error("Error updating call session", updateError);
      return NextResponse.json({ error: 'Failed to join call' }, { status: 500 });
    }

    // Generate LiveKit token for joiner
    const token = await createLiveKitToken({
      roomName: callSession.room_name,
      participantIdentity: joinerActor.id,
      participantName: joinerName,
    });

    return NextResponse.json({
      sessionId: callSession.id,
      roomName: callSession.room_name,
      token,
      callType: callSession.call_type || "video",
    });

  } catch (error) {
    logger.error("Error joining call", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle declining or missing a call
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParsed = declineCallQuerySchema.safeParse({
      sessionId: searchParams.get("sessionId"),
      reason: searchParams.get("reason"),
    });
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: queryParsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { sessionId, reason } = queryParsed.data;

    // Get user's actor
    const { data: actor } = await supabase
      .from('actors')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
    }

    // Get the call session
    const { data: callSession } = await supabase
      .from('video_call_sessions')
      .select('id, recipient_id, status, call_type, conversation_id, initiated_by')
      .eq('id', sessionId)
      .single() ;

    if (!callSession) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 });
    }

    // Either party can end an unanswered call: the recipient declines/misses
    // it, or the initiator (caller) cancels their own outgoing ring. Without
    // the initiator branch the fan's "cancel" button 403'd and the model kept
    // ringing a call nobody was on.
    const isRecipient = callSession.recipient_id === actor.id;
    const isInitiator = callSession.initiated_by === actor.id;
    if (!isRecipient && !isInitiator) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Determine status: 'missed' for timeout / caller-cancelled ring, 'declined'
    // for a manual decline by the recipient.
    const status = reason === 'missed' || isInitiator ? 'missed' : 'declined';

    // Update call session — only if still pending, so a late auto-miss timer
    // can't overwrite a call that was already answered (active) or ended.
    const { data: updatedRows, error: updateError } = await supabase
      .from('video_call_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'pending')
      .select('id');

    if (updateError) {
      logger.error(`Error ${status} call`, updateError);
      return NextResponse.json({ error: `Failed to ${status} call` }, { status: 500 });
    }

    // No pending row matched — the call already progressed (answered/ended);
    // don't post a spurious "missed" marker over a live or finished call.
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ success: true, status: 'noop' });
    }

    // Add system message for missed calls. Use the service client: the row is
    // authored as the caller (initiated_by), but this request runs as the
    // recipient, so the RLS insert policy (sender_id = caller) would reject it.
    if (status === 'missed') {
      const callTypeLabel = callSession.call_type === "voice" ? "voice" : "video";
      const { createServiceRoleClient } = await import("@/lib/supabase/service");
      const service = createServiceRoleClient();
      await service.from('messages').insert({
        conversation_id: callSession.conversation_id,
        sender_id: callSession.initiated_by,
        content: `Missed ${callTypeLabel} call`,
        is_system: true,
      });
    }

    return NextResponse.json({ success: true, status });

  } catch (error) {
    logger.error("Error handling call response", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
