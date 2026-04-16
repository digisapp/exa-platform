import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";
import { BlastDialog } from "@/components/chat/BlastDialog";
import { MessageCircle } from "lucide-react";
import { fetchConversationList } from "@/lib/chat-queries";

// Admin client for fetching participant data (bypasses RLS)
const adminClient = createServiceRoleClient();

interface PageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
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

  // Handle ?new=username parameter - call API route to find/create conversation
  if (params.new) {
    const modelUsername = params.new;

    const h = await headers();
    const c = await cookies();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    const apiUrl = `${proto}://${host}/api/conversations/find-or-create`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Cookie: c.toString(),
        },
        body: JSON.stringify({ modelUsername }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.conversationId) {
          redirect(`/chats/${data.conversationId}`);
        } else {
          redirect(`/chats/new?model=${encodeURIComponent(modelUsername)}`);
        }
      } else {
        console.error("[Chat] API error:", response.status, data.error);
      }
    } catch (error: any) {
      if (error?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error("[Chat] API call failed:", error instanceof Error ? error.message : error);
    }
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

  // Fetch conversations using shared query (same data as layout, but needed for mobile view)
  const { conversations, fanCount, brandCount } = await fetchConversationList(supabase, adminClient, actor.id);

  return (
    <>
      {/* Mobile: show full list with header */}
      <div className="lg:hidden max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="exa-gradient-text">Chats</span>
          </h1>
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
        <ConversationList conversations={conversations} actorType={actor.type} currentActorId={actor.id} />
      </div>

      {/* Desktop: empty state (sidebar is in layout) */}
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-center">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/40 to-violet-500/40 blur-2xl" />
          <div className="relative p-6 rounded-full bg-gradient-to-br from-pink-500/25 to-violet-500/25 ring-1 ring-pink-500/30 shadow-[0_0_40px_rgba(236,72,153,0.3)]">
            <MessageCircle className="h-12 w-12 text-pink-300" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-1 text-white">
          <span className="exa-gradient-text">Select a conversation</span>
        </h2>
        <p className="text-sm text-white/50 max-w-xs">
          Choose from your conversations on the left to start chatting.
        </p>
      </div>
    </>
  );
}
