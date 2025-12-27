import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search chats..." className="pl-10" />
      </div>

      {/* Conversations List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {conversations.length > 0 ? (
            conversations.map((conv: any) => {
              const otherPerson = conv.otherParticipants[0]?.model;
              const displayName = otherPerson?.first_name
                ? `${otherPerson.first_name} ${otherPerson.last_name || ""}`.trim()
                : otherPerson?.username || "Unknown";
              const isUnread = conv.lastMessage &&
                (!conv.last_read_at || new Date(conv.lastMessage.created_at) > new Date(conv.last_read_at));

              return (
                <Link
                  key={conv.conversation_id}
                  href={`/messages/${conv.conversation_id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherPerson?.profile_photo_url} />
                    <AvatarFallback>
                      {otherPerson?.first_name?.charAt(0) || otherPerson?.username?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${isUnread ? "text-foreground" : ""}`}>
                        {displayName}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                  )}
                </Link>
              );
            })
          ) : (
            <div className="text-center py-16">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No chats yet</h3>
              <p className="text-muted-foreground mb-4">
                Start chatting with models
              </p>
              <Button variant="outline" asChild>
                <Link href="/models">Explore Models</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
