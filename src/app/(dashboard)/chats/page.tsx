import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";

interface PageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Admin client for conversation creation - bypasses RLS
  // Created inside function to ensure env vars are available
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get actor
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor) redirect("/fan/signup");

  // Handle ?new=username parameter - find or create conversation with model
  if (params.new) {
    const modelUsername = params.new.toLowerCase();
    console.log("[Chat] Starting new conversation with:", modelUsername);

    // Look up model by username (case-insensitive)
    const { data: targetModel, error: modelError } = await supabase
      .from("models")
      .select("id, user_id, username")
      .ilike("username", modelUsername)
      .maybeSingle();

    if (modelError) {
      console.error("[Chat] Model lookup error:", modelError, "username:", modelUsername);
    }

    if (!targetModel) {
      console.error("[Chat] Model not found for username:", modelUsername);
    }

    if (targetModel) {
      console.log("[Chat] Found model:", targetModel.username, "user_id:", targetModel.user_id);

      // Get the model's actor ID
      const { data: targetActor, error: actorError } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", targetModel.user_id)
        .maybeSingle();

      if (actorError) {
        console.error("[Chat] Actor lookup error:", actorError);
      }

      if (!targetActor) {
        console.error("[Chat] Actor not found for user_id:", targetModel.user_id);
      }

      if (targetActor && targetActor.id !== actor.id) {
        console.log("[Chat] Target actor found:", targetActor.id, "Current actor:", actor.id);

        // Check if conversation already exists between these two users
        const { data: senderParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("actor_id", actor.id);

        let existingConversationId: string | null = null;

        if (senderParticipations && senderParticipations.length > 0) {
          const conversationIds = senderParticipations.map(p => p.conversation_id);
          console.log("[Chat] Found", conversationIds.length, "existing conversations for current user");

          const { data: recipientParticipation } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("actor_id", targetActor.id)
            .in("conversation_id", conversationIds)
            .limit(1)
            .maybeSingle();

          if (recipientParticipation) {
            existingConversationId = recipientParticipation.conversation_id;
            console.log("[Chat] Found existing conversation:", existingConversationId);
          }
        }

        if (existingConversationId) {
          // Redirect to existing conversation
          console.log("[Chat] Redirecting to existing conversation:", existingConversationId);
          redirect(`/chats/${existingConversationId}`);
        }

        // Create new conversation using admin client to bypass RLS
        console.log("[Chat] Creating new conversation...");
        const { data: conversation, error: convError } = await adminClient
          .from("conversations")
          .insert({
            type: "direct",
            title: null,
          })
          .select()
          .single();

        if (convError) {
          console.error("[Chat] Failed to create conversation:", convError);
        }

        if (conversation && !convError) {
          console.log("[Chat] Conversation created:", conversation.id);

          // Add both participants using admin client
          const { error: partError } = await adminClient
            .from("conversation_participants")
            .insert([
              { conversation_id: conversation.id, actor_id: actor.id },
              { conversation_id: conversation.id, actor_id: targetActor.id },
            ]);

          if (partError) {
            console.error("[Chat] Failed to add participants:", partError);
            // Delete the orphaned conversation
            await adminClient.from("conversations").delete().eq("id", conversation.id);
          } else {
            // Only redirect if participants were added successfully
            console.log("[Chat] Participants added, redirecting to:", conversation.id);
            redirect(`/chats/${conversation.id}`);
          }
        }
      } else if (targetActor?.id === actor.id) {
        console.log("[Chat] Cannot message yourself");
      }
    }

    // If we couldn't find the model or create conversation, just show the inbox
    console.log("[Chat] Falling through to inbox for:", params.new);
  }

  // Get coin balance based on actor type
  let coinBalance = 0;
  if (actor.type === "fan") {
    const { data: fan } = await supabase
      .from("fans")
      .select("coin_balance")
      .eq("id", actor.id)
      .single() as { data: { coin_balance: number } | null };
    coinBalance = fan?.coin_balance || 0;
  } else if (actor.type === "brand") {
    const { data: brand } = await (supabase
      .from("brands") as any)
      .select("coin_balance")
      .eq("id", actor.id)
      .single() as { data: { coin_balance: number } | null };
    coinBalance = brand?.coin_balance || 0;
  }

  // Get conversations with participants in a single query
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id,
      last_read_at,
      conversation:conversations(
        id,
        type,
        title,
        updated_at
      )
    `)
    .eq("actor_id", actor.id)
    .order("joined_at", { ascending: false }) as { data: any[] | null };

  const conversationIds = participations?.map(p => p.conversation_id) || [];

  // Batch fetch: Get all last messages for all conversations in ONE query
  const { data: allMessages } = conversationIds.length > 0
    ? await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }) as { data: any[] | null }
    : { data: [] };

  // Group messages by conversation and get the latest one
  const lastMessageMap = new Map<string, any>();
  (allMessages || []).forEach((msg: any) => {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg);
    }
  });

  // Batch fetch: Get all other participants for all conversations in ONE query
  const { data: allParticipants } = conversationIds.length > 0
    ? await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          actor:actors(
            id,
            type,
            user_id
          )
        `)
        .in("conversation_id", conversationIds)
        .neq("actor_id", actor.id) as { data: any[] | null }
    : { data: [] };

  // Get user IDs to fetch model and fan data
  const userIds = [...new Set((allParticipants || []).map((p: any) => p.actor?.user_id).filter(Boolean))];

  // Fetch all models for these users
  const { data: models } = userIds.length > 0
    ? await supabase
        .from("models")
        .select("user_id, username, first_name, last_name, profile_photo_url")
        .in("user_id", userIds) as { data: any[] | null }
    : { data: [] };

  // Fetch all fans for these users
  const { data: fans } = userIds.length > 0
    ? await supabase
        .from("fans")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds) as { data: any[] | null }
    : { data: [] };

  // Create lookup maps
  const modelsByUserId = new Map((models || []).map((m: any) => [m.user_id, m]));
  const fansByUserId = new Map((fans || []).map((f: any) => [f.user_id, f]));

  // Group participants by conversation with enriched data
  const participantsMap = new Map<string, any[]>();
  (allParticipants || []).forEach((p: any) => {
    const existing = participantsMap.get(p.conversation_id) || [];
    const actorData = p.actor;
    if (actorData) {
      const model = modelsByUserId.get(actorData.user_id);
      const fan = fansByUserId.get(actorData.user_id);
      existing.push({
        ...actorData,
        model: model || null,
        fan: fan || null,
      });
    }
    participantsMap.set(p.conversation_id, existing);
  });

  // Combine data efficiently and sort by most recent activity
  const conversations = (participations || [])
    .map((p: any) => ({
      ...p,
      lastMessage: lastMessageMap.get(p.conversation_id) || null,
      otherParticipants: participantsMap.get(p.conversation_id) || [],
    }))
    .sort((a: any, b: any) => {
      // Sort by last message date, falling back to conversation updated_at
      const aDate = a.lastMessage?.created_at || a.conversation?.updated_at || 0;
      const bDate = b.lastMessage?.created_at || b.conversation?.updated_at || 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chats</h1>
        {/* New Chat button only for brands */}
        {actor.type === "brand" && (
          <NewMessageDialog
            currentActorType={actor.type}
            coinBalance={coinBalance}
          />
        )}
      </div>

      <ConversationList conversations={conversations} actorType={actor.type} />
    </div>
  );
}
