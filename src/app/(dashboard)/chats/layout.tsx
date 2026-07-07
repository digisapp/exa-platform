import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { BlastDialog } from "@/components/chat/BlastDialog";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";
import { Badge } from "@/components/ui/badge";
import { getConversationList } from "@/lib/chat-queries";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function ChatsLayout({ children }: LayoutProps) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get actor
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor) redirect("/fan/signup");

  // Get coin balance for brands (needed for NewMessageDialog)
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

  const { conversations, fanCount, brandCount } = await getConversationList(actor.id);

  const unreadTotal = conversations
    .filter((c: any) => !c.is_archived)
    .reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Desktop: two-panel layout */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:h-[calc(100dvh-120px)] lg:-my-8">
        {/* Left panel: conversation list (desktop only) */}
        <div className="hidden lg:flex lg:flex-col lg:border-r lg:overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Chats</h1>
              {unreadTotal > 0 && (
                <Badge variant="secondary" className="bg-pink-500 text-white text-[10px] h-5 min-w-5 px-1.5 justify-center border-0 shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {actor.type === "model" && (
                <BlastDialog fanCount={fanCount} brandCount={brandCount} />
              )}
              {(actor.type === "brand" || actor.type === "admin") && (
                <NewMessageDialog
                  currentActorType={actor.type}
                  coinBalance={coinBalance}
                />
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            <ConversationList
              conversations={conversations}
              actorType={actor.type}
              compact
              currentActorId={actor.id}
            />
          </div>
        </div>

        {/* Right panel: children (page.tsx or [conversationId]/page.tsx) */}
        <div className="lg:flex lg:flex-col lg:overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
