import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";

export default async function MessagesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get actor
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor) redirect("/onboarding");

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
            model:models(username, first_name, last_name, profile_photo_url)
          )
        `)
        .in("conversation_id", conversationIds)
        .neq("actor_id", actor.id) as { data: any[] | null }
    : { data: [] };

  // Group participants by conversation
  const participantsMap = new Map<string, any[]>();
  (allParticipants || []).forEach((p: any) => {
    const existing = participantsMap.get(p.conversation_id) || [];
    existing.push(p.actor);
    participantsMap.set(p.conversation_id, existing);
  });

  // Combine data efficiently
  const conversations = (participations || []).map((p: any) => ({
    ...p,
    lastMessage: lastMessageMap.get(p.conversation_id) || null,
    otherParticipants: participantsMap.get(p.conversation_id) || [],
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chats</h1>
      </div>

      <ConversationList conversations={conversations} actorType={actor.type} />
    </div>
  );
}
