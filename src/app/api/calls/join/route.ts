import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLiveKitToken } from '@/lib/livekit';
import { checkEndpointRateLimit } from "@/lib/rate-limit";

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

    // Get request body
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

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
    const { data: callSession } = await (supabase
      .from('video_call_sessions') as any)
      .select('*')
      .eq('id', sessionId)
      .single() as { data: any };

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
        .select('first_name, last_name, username')
        .eq('user_id', user.id)
        .single() as { data: { first_name?: string; last_name?: string; username?: string } | null };
      joinerName = model?.first_name
        ? `${model.first_name} ${model.last_name || ''}`.trim()
        : model?.username || 'User';
    } else {
      const { data: fan } = await supabase
        .from('fans')
        .select('display_name')
        .eq('id', joinerActor.id)
        .single() as { data: { display_name?: string } | null };
      joinerName = fan?.display_name || 'User';
    }

    // Update call session to active
    const { error: updateError } = await (supabase
      .from('video_call_sessions') as any)
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating call session:', updateError);
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
    console.error('Error joining call:', error);
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
    const sessionId = searchParams.get('sessionId');
    const reason = searchParams.get('reason'); // 'missed' or 'declined' (default)

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

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
    const { data: callSession } = await (supabase
      .from('video_call_sessions') as any)
      .select('*')
      .eq('id', sessionId)
      .single() as { data: any };

    if (!callSession) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 });
    }

    // Verify user is the recipient
    if (callSession.recipient_id !== actor.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Determine status: 'missed' for timeout, 'declined' for manual decline
    const status = reason === 'missed' ? 'missed' : 'declined';

    // Update call session
    const { error: updateError } = await (supabase
      .from('video_call_sessions') as any)
      .update({
        status,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error(`Error ${status} call:`, updateError);
      return NextResponse.json({ error: `Failed to ${status} call` }, { status: 500 });
    }

    // Add system message for missed calls
    if (status === 'missed') {
      const callTypeLabel = callSession.call_type === "voice" ? "voice" : "video";
      await (supabase.from('messages') as any).insert({
        conversation_id: callSession.conversation_id,
        sender_id: callSession.initiated_by,
        content: `Missed ${callTypeLabel} call`,
        is_system: true,
      });
    }

    return NextResponse.json({ success: true, status });

  } catch (error) {
    console.error('Error handling call response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
