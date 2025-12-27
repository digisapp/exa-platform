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

  if (!actor) redirect("/onboarding");

  // Get current model or fan data (for coin balance)
  let currentModel: Model | null = null;
  let currentFan: Fan | null = null;

  if (actor.type === "model" || actor.type === "admin") {
    const { data } = (await supabase
      .from("models")
      .select("*")
      .eq("id", actor.id)
      .single()) as { data: Model | null };
    currentModel = data;
  } else if (actor.type === "fan") {
    const { data } = (await supabase
      .from("fans")
      .select("*")
      .eq("id", actor.id)
      .single()) as { data: Fan | null };
    currentFan = data;
  }

  // Get conversation
  const { data: conversation } = (await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single()) as { data: Conversation | null };

  if (!conversation) notFound();

  // Verify user is a participant
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("actor_id", actor.id)
    .single();

  if (!participation) {
    // Not a participant - redirect to messages
    redirect("/messages");
  }

  // Get messages
  const { data: messages } = (await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100)) as { data: Message[] | null };

  // Get other participant(s)
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select(
      `
      actor_id,
      actors:actor_id (
        id,
        type,
        user_id
      )
    `
    )
    .eq("conversation_id", conversationId)
    .neq("actor_id", actor.id);

  // Get model info for other participant
  let otherParticipant = null;
  if (participants && participants.length > 0) {
    const participant = participants[0] as {
      actor_id: string;
      actors: Actor;
    };

    // Get model data if they're a model
    const { data: otherModel } = (await supabase
      .from("models")
      .select("*")
      .eq("id", participant.actor_id)
      .single()) as { data: Model | null };

    otherParticipant = {
      actor_id: participant.actor_id,
      actor: participant.actors,
      model: otherModel,
    };
  }

  if (!otherParticipant) {
    redirect("/messages");
  }

  return (
    <ChatView
      conversation={conversation}
      initialMessages={messages || []}
      currentActor={actor}
      currentModel={currentModel}
      currentFan={currentFan}
      otherParticipant={otherParticipant}
    />
  );
}
