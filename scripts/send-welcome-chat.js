const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function sendWelcomeMessage() {
  // Find miriam's model record
  const { data: model } = await supabase
    .from('models')
    .select('id, user_id, first_name, username')
    .eq('username', 'miriam')
    .single();

  if (!model) {
    console.log('Model @miriam not found');
    return;
  }

  console.log('Found model:', model.first_name, model.username);

  // Get miriam's actor ID
  const { data: modelActor } = await supabase
    .from('actors')
    .select('id')
    .eq('user_id', model.user_id)
    .single();

  if (!modelActor) {
    console.log('Actor not found for model');
    return;
  }

  // Get admin actor
  const { data: adminActor } = await supabase
    .from('actors')
    .select('id')
    .eq('type', 'admin')
    .limit(1)
    .single();

  if (!adminActor) {
    console.log('Admin not found');
    return;
  }

  console.log('Admin actor:', adminActor.id);
  console.log('Model actor:', modelActor.id);

  // Check for existing conversation
  const { data: existingParticipants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('actor_id', adminActor.id);

  let conversationId = null;

  if (existingParticipants) {
    for (const cp of existingParticipants) {
      const { data: hasModel } = await supabase
        .from('conversation_participants')
        .select('actor_id')
        .eq('conversation_id', cp.conversation_id)
        .eq('actor_id', modelActor.id)
        .single();
      if (hasModel) {
        conversationId = cp.conversation_id;
        console.log('Found existing conversation:', conversationId);
        break;
      }
    }
  }

  // Create conversation if none exists
  if (!conversationId) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

    if (convError) {
      console.log('Error creating conversation:', convError);
      return;
    }

    conversationId = conv.id;
    console.log('Created conversation:', conversationId);

    // Add participants
    const { error: partError } = await supabase.from('conversation_participants').insert([
      { conversation_id: conversationId, actor_id: adminActor.id },
      { conversation_id: conversationId, actor_id: modelActor.id },
    ]);

    if (partError) {
      console.log('Error adding participants:', partError);
    }
  }

  // Send welcome message
  const modelName = model.first_name || 'Model';
  const welcomeMessage = `Welcome to EXA, ${modelName}! 🎉

Your profile has been approved and you're now part of our community.

Here's how to get started:
• Complete your profile with photos and bio
• Browse and apply to gigs
• Connect with other models and brands

If you have any questions, feel free to message us here. We're excited to have you!`;

  // Try inserting directly via REST API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: adminActor.id,
        content: welcomeMessage,
        is_system: false
      })
    }
  );

  if (response.ok) {
    const result = await response.json();
    console.log('Message sent successfully!');
    console.log('Result:', result);
  } else {
    const error = await response.text();
    console.log('Error sending message:', response.status, error);
  }
}

sendWelcomeMessage();
