import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";
import type { Message, Actor, Model, Conversation, Fan } from "@/types/database";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();

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

  // Get conversation - use maybeSingle to handle not found gracefully
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) {
    console.error("[ChatPage] Conversation lookup error:", convError);
    notFound();
  }

  if (!conversation) {
    notFound();
  }

  // Verify user is a participant - use maybeSingle to avoid throwing on 0 rows
  const { data: participation, error: participationError } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("actor_id", actor.id)
    .maybeSingle();

  if (participationError) {
    console.error("[ChatPage] Participation check error:", participationError);
  }

  if (!participation) {
    console.error("[ChatPage] User not a participant:", { conversationId, actorId: actor.id });
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

  // Get other participant(s)
  const { data: participants, error: partError } = await supabase
    .from("conversation_participants")
    .select("actor_id")
    .eq("conversation_id", conversationId)
    .neq("actor_id", actor.id);

  if (partError) {
    console.error("[ChatPage] Error fetching participants:", partError);
  }

  // Guard: must have other participants
  if (!participants?.length) {
    console.error("[ChatPage] No other participants found:", conversationId);
    redirect("/chats");
  }

  // Get model info for other participant
  let otherParticipant = null;
  if (participants.length > 0) {
    const otherActorId = participants[0].actor_id;

    // Get the other actor's details
    const { data: otherActor } = await supabase
      .from("actors")
      .select("id, type, user_id")
      .eq("id", otherActorId)
      .maybeSingle();

    if (!otherActor) {
      redirect("/chats");
    }

    if (otherActor) {
      // Get model data if they're a model - use user_id to lookup
      let otherModel: Model | null = null;
      if (otherActor.type === "model" && otherActor.user_id) {
        const { data } = await supabase
          .from("models")
          .select("*")
          .eq("user_id", otherActor.user_id)
          .maybeSingle();
        otherModel = data;
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
