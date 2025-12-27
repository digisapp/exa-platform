import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLiveKitToken, generateRoomName, MIN_CALL_BALANCE } from '@/lib/livekit';
import { VideoCallSession, CALL_RATE_LIMITS } from '@/types/video-calls';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { conversationId } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Get caller's actor
    const { data: callerActor } = await supabase
      .from('actors')
      .select('id, type')
      .eq('user_id', user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!callerActor) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
    }

    // Rate limiting: Check recent call attempts
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCallCount } = await (supabase
      .from('video_call_sessions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('initiated_by', callerActor.id)
      .gte('created_at', oneMinuteAgo) as { count: number | null };

    if ((recentCallCount || 0) >= CALL_RATE_LIMITS.maxCallsPerMinute) {
      return NextResponse.json({
        error: 'Too many call attempts. Please wait a moment.'
      }, { status: 429 });
    }

    // Verify caller is a participant in this conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('actor_id')
      .eq('conversation_id', conversationId)
      .eq('actor_id', callerActor.id)
      .single() as { data: { actor_id: string } | null };

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Get the other participant (for 1:1 calls)
    const { data: otherParticipant } = await supabase
      .from('conversation_participants')
      .select(`
        actor_id,
        actor:actors(id, type, user_id)
      `)
      .eq('conversation_id', conversationId)
      .neq('actor_id', callerActor.id)
      .single() as { data: { actor_id: string; actor: { id: string; type: string; user_id: string } } | null };

    if (!otherParticipant) {
      return NextResponse.json({ error: 'No other participant found' }, { status: 400 });
    }

    const recipientActor = otherParticipant.actor;

    // Check if there's already an active call in this conversation
    const { data: existingCall } = await (supabase
      .from('video_call_sessions') as any)
      .select('id')
      .eq('conversation_id', conversationId)
      .in('status', ['pending', 'active'])
      .single() as { data: Pick<VideoCallSession, 'id'> | null };

    if (existingCall) {
      return NextResponse.json({ error: 'A call is already in progress' }, { status: 409 });
    }

    // Check coin balance if caller is fan/brand calling a model
    let requiresCoins = false;
    if (callerActor.type !== 'model' && recipientActor.type === 'model') {
      requiresCoins = true;

      // Get caller's coin balance from fans table
      const { data: fanData } = await supabase
        .from('fans')
        .select('coin_balance')
        .eq('id', callerActor.id)
        .single() as { data: { coin_balance: number } | null };

      const coinBalance = fanData?.coin_balance || 0;

      if (coinBalance < MIN_CALL_BALANCE) {
        return NextResponse.json({
          error: 'Insufficient coins',
          required: MIN_CALL_BALANCE,
          balance: coinBalance
        }, { status: 402 });
      }
    }

    // Get caller's display name
    let callerName = 'User';
    if (callerActor.type === 'model') {
      const { data: model } = await supabase
        .from('models')
        .select('first_name, last_name, username')
        .eq('user_id', user.id)
        .single() as { data: { first_name?: string; last_name?: string; username?: string } | null };
      callerName = model?.first_name
        ? `${model.first_name} ${model.last_name || ''}`.trim()
        : model?.username || 'User';
    } else {
      const { data: fan } = await supabase
        .from('fans')
        .select('display_name')
        .eq('id', callerActor.id)
        .single() as { data: { display_name?: string } | null };
      callerName = fan?.display_name || 'User';
    }

    // Generate room name
    const roomName = generateRoomName(conversationId);

    // Create call session
    const { data: callSession, error: sessionError } = await (supabase
      .from('video_call_sessions') as any)
      .insert({
        conversation_id: conversationId,
        room_name: roomName,
        initiated_by: callerActor.id,
        recipient_id: recipientActor.id,
        status: 'pending',
      })
      .select()
      .single() as { data: VideoCallSession | null; error: Error | null };

    if (sessionError || !callSession) {
      console.error('Error creating call session:', sessionError);
      return NextResponse.json({ error: 'Failed to create call session' }, { status: 500 });
    }

    // Generate LiveKit token for caller
    const token = await createLiveKitToken({
      roomName,
      participantIdentity: callerActor.id,
      participantName: callerName,
    });

    return NextResponse.json({
      sessionId: callSession.id,
      roomName,
      token,
      recipientId: recipientActor.id,
      requiresCoins,
    });

  } catch (error) {
    console.error('Error starting call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
