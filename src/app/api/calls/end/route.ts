import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateCallCost } from '@/lib/livekit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get user's actor
    const { data: actor } = await supabase
      .from('actors')
      .select('id, type')
      .eq('user_id', user.id)
      .single() as { data: { id: string; type: string } | null };

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

    // Verify user is part of this call
    if (callSession.initiated_by !== actor.id && callSession.recipient_id !== actor.id) {
      return NextResponse.json({ error: 'Not authorized to end this call' }, { status: 403 });
    }

    // Check if call is already ended
    if (callSession.status === 'ended') {
      return NextResponse.json({
        success: true,
        duration: callSession.duration_seconds,
        coinsCharged: callSession.coins_charged,
      });
    }

    const endedAt = new Date();
    let durationSeconds = 0;
    let coinsCharged = 0;

    // Calculate duration if call was active
    if (callSession.status === 'active' && callSession.started_at) {
      const startedAt = new Date(callSession.started_at);
      durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      // Get initiator's actor type to determine if coins should be charged
      const { data: initiatorActor } = await supabase
        .from('actors')
        .select('id, type')
        .eq('id', callSession.initiated_by)
        .single() as { data: { id: string; type: string } | null };

      const { data: recipientActor } = await supabase
        .from('actors')
        .select('id, type')
        .eq('id', callSession.recipient_id)
        .single() as { data: { id: string; type: string } | null };

      // Charge coins if initiator is fan/brand calling a model
      if (initiatorActor?.type !== 'model' && recipientActor?.type === 'model' && durationSeconds > 0) {
        coinsCharged = calculateCallCost(durationSeconds);

        // Deduct coins from the caller
        const { error: deductError } = await (supabase.rpc as any)('deduct_coins', {
          p_actor_id: callSession.initiated_by,
          p_amount: coinsCharged,
          p_action: 'video_call',
          p_metadata: {
            session_id: sessionId,
            duration_seconds: durationSeconds,
            recipient_id: callSession.recipient_id,
          },
        });

        if (deductError) {
          console.error('Error deducting coins:', deductError);
          // Continue anyway - don't fail the call end because of coin deduction
        }

        // Credit coins to the model (70% of call cost)
        const modelEarnings = Math.floor(coinsCharged * 0.7);
        if (modelEarnings > 0) {
          // Get model's ID from actors table via user_id
          const { data: modelActor } = await supabase
            .from('actors')
            .select('user_id')
            .eq('id', callSession.recipient_id)
            .single();

          if (modelActor) {
            // Update model's coin balance
            const { error: creditError } = await (supabase.rpc as any)('add_coins', {
              p_actor_id: callSession.recipient_id,
              p_amount: modelEarnings,
              p_action: 'video_call_earnings',
              p_metadata: {
                session_id: sessionId,
                duration_seconds: durationSeconds,
                caller_id: callSession.initiated_by,
                gross_amount: coinsCharged,
              },
            });

            if (creditError) {
              console.error('Error crediting model:', creditError);
            }
          }
        }
      }
    }

    // Update call session
    const { error: updateError } = await (supabase
      .from('video_call_sessions') as any)
      .update({
        status: 'ended',
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        coins_charged: coinsCharged,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating call session:', updateError);
      return NextResponse.json({ error: 'Failed to end call' }, { status: 500 });
    }

    // Insert system message in conversation if call was connected
    if (durationSeconds > 0) {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const durationStr = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : `0:${seconds.toString().padStart(2, '0')}`;

      await (supabase.from('messages') as any).insert({
        conversation_id: callSession.conversation_id,
        sender_id: actor.id,
        content: `Video call - ${durationStr}`,
        is_system: true,
      });
    }

    return NextResponse.json({
      success: true,
      duration: durationSeconds,
      coinsCharged,
    });

  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
