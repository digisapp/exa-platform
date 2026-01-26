import { createClient } from "@/lib/supabase/server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";

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

      if (response.ok && data.success && data.conversationId) {
        redirect(`/chats/${data.conversationId}`);
      } else {
        console.error("[Chat] API error:", response.status, data.error);
      }
    } catch (error: any) {
      // Re-throw redirect errors - Next.js uses thrown errors for redirects
      if (error?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error("[Chat] API call failed:", error instanceof Error ? error.message : error);
    }
    // Fall through to show inbox if failed
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

  // Fetch last message for each conversation individually
  // Using individual queries works better with RLS than batch .in() queries
  const lastMessageMap = new Map<string, any>();

  if (conversationIds.length > 0) {
    const messagePromises = conversationIds.map(async (convId) => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id, media_url, media_type, is_system")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { convId, message: data };
    });

    const results = await Promise.all(messagePromises);
    results.forEach(({ convId, message }) => {
      if (message) {
        lastMessageMap.set(convId, message);
      }
    });
  }

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

  // Get user IDs for models and actor IDs for fans
  const userIds = [...new Set((allParticipants || []).map((p: any) => p.actor?.user_id).filter(Boolean))];
  const fanActorIds = [...new Set((allParticipants || []).filter((p: any) => p.actor?.type === "fan").map((p: any) => p.actor?.id).filter(Boolean))];

  // Fetch all models for these users (models use user_id)
  const { data: models } = userIds.length > 0
    ? await supabase
        .from("models")
        .select("user_id, username, first_name, last_name, profile_photo_url")
        .in("user_id", userIds) as { data: any[] | null }
    : { data: [] };

  // Fetch all fans by their actor ID (fans.id = actors.id)
  const { data: fans } = fanActorIds.length > 0
    ? await supabase
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", fanActorIds) as { data: any[] | null }
    : { data: [] };

  // Create lookup maps
  const modelsByUserId = new Map((models || []).map((m: any) => [m.user_id, m]));
  const fansById = new Map((fans || []).map((f: any) => [f.id, f]));

  // Group participants by conversation with enriched data
  const participantsMap = new Map<string, any[]>();
  (allParticipants || []).forEach((p: any) => {
    const existing = participantsMap.get(p.conversation_id) || [];
    const actorData = p.actor;
    if (actorData) {
      // Models lookup by user_id, fans lookup by actor id
      const model = modelsByUserId.get(actorData.user_id);
      const fan = fansById.get(actorData.id);
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
