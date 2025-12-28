import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";
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

  // Get model data for coin balance (if actor is a model)
  let coinBalance = 0;
  if (actor.type === "model") {
    // Models are linked via user_id, not actor.id
    const { data: model } = await supabase
      .from("models")
      .select("coin_balance")
      .eq("user_id", user.id)
      .single() as { data: { coin_balance: number } | null };
    coinBalance = model?.coin_balance || 0;
  }

  // Get conversations
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

  // Get last message for each conversation
  const conversations = await Promise.all(
    (participations || []).map(async (p: any) => {
      // Get last message
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", p.conversation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single() as { data: any };

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select(`
          actor:actors(
            id,
            type,
            model:models(username, first_name, last_name, profile_photo_url)
          )
        `)
        .eq("conversation_id", p.conversation_id)
        .neq("actor_id", actor.id) as { data: any[] | null };

      return {
        ...p,
        lastMessage,
        otherParticipants: otherParticipants?.map((op: any) => op.actor) || [],
      };
    })
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chats</h1>
        </div>
        <NewMessageDialog
          currentActorType={actor.type}
          coinBalance={coinBalance}
        />
      </div>

      <ConversationList conversations={conversations} />
    </div>
  );
}
