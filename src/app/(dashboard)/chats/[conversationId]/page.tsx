import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";
import type { Message, Actor, Model, Conversation, Fan } from "@/types/database";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // Admin client to bypass RLS for participant lookups
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("[ChatPage] Loading conversation:", conversationId);

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get current actor
  const { data: actor } = (await supabase
    .from("actors")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: Actor | null };

  if (!actor) redirect("/fan/signup");

  // Get current model or fan data (for coin balance)
  let currentModel: Model | null = null;
  let currentFan: Fan | null = null;

  if (actor.type === "model" || actor.type === "admin") {
    // Models are linked via user_id, not actor.id
    const { data } = (await supabase
      .from("models")
      .select("*")
      .eq("user_id", user.id)
      .single()) as { data: Model | null };
    currentModel = data;
  } else if (actor.type === "fan") {
    // Fans use actor.id as their id
    const { data } = (await supabase
      .from("fans")
      .select("*")
      .eq("id", actor.id)
      .single()) as { data: Fan | null };
    currentFan = data;
  }

  // Get conversation using admin client to bypass RLS
  const { data: conversation, error: convError } = await adminClient
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (convError) {
    console.error("[ChatPage] Conversation lookup error:", convError);
  }

  console.log("[ChatPage] Conversation found:", !!conversation);

  if (!conversation) notFound();

  // Verify user is a participant using admin client
  const { data: participation, error: participationError } = await adminClient
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("actor_id", actor.id)
    .single();

  if (participationError) {
    console.error("[ChatPage] Participation check error:", participationError);
  }

  console.log("[ChatPage] User is participant:", !!participation);

  if (!participation) {
    // Not a participant - redirect to messages
    console.log("[ChatPage] User not a participant, redirecting to /chats");
    redirect("/chats");
  }

  // Get messages (fetch 101 to check if there are more)
  const { data: allMessages } = (await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(101)) as { data: Message[] | null };

  // Check if there are more messages and prepare the list
  const hasMoreMessages = (allMessages?.length || 0) > 100;
  const messages = allMessages
    ? (hasMoreMessages ? allMessages.slice(0, 100) : allMessages).reverse()
    : [];

  // Get other participant(s) using admin client to bypass RLS
  console.log("[ChatPage] Looking up other participants for actor:", actor.id);
  const { data: participants, error: partError } = await adminClient
    .from("conversation_participants")
    .select("actor_id")
    .eq("conversation_id", conversationId)
    .neq("actor_id", actor.id);

  if (partError) {
    console.error("[ChatPage] Error fetching participants:", partError);
  }

  console.log("[ChatPage] Found participants:", participants?.length || 0);

  // Get model info for other participant
  let otherParticipant = null;
  if (participants && participants.length > 0) {
    const otherActorId = participants[0].actor_id;
    console.log("[ChatPage] Other actor ID:", otherActorId);

    // Get the other actor's details
    const { data: otherActor } = await adminClient
      .from("actors")
      .select("id, type, user_id")
      .eq("id", otherActorId)
      .single();

    console.log("[ChatPage] Other actor:", otherActor);

    if (otherActor) {
      // Get model data if they're a model - use user_id to lookup
      let otherModel: Model | null = null;
      if (otherActor.type === "model" && otherActor.user_id) {
        const { data } = await adminClient
          .from("models")
          .select("*")
          .eq("user_id", otherActor.user_id)
          .single();
        otherModel = data;
        console.log("[ChatPage] Other model:", otherModel?.username);
      }

      otherParticipant = {
        actor_id: otherActorId,
        actor: otherActor as Actor,
        model: otherModel,
      };
    }
  }

  if (!otherParticipant) {
    console.error("[ChatPage] No other participant found for conversation:", conversationId);
    redirect("/chats");
  }

  return (
    <ChatView
      conversation={conversation}
      initialMessages={messages}
      currentActor={actor}
      currentModel={currentModel}
      currentFan={currentFan}
      otherParticipant={otherParticipant}
      hasMoreMessages={hasMoreMessages}
    />
  );
}
