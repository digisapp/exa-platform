import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { BlastDialog } from "@/components/chat/BlastDialog";
import { NewMessageDialog } from "@/components/chat/NewMessageDialog";

// Admin client for fetching participant data (bypasses RLS)
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Fetch last message for each conversation
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

  // Get user IDs for models and actor IDs for fans/brands
  const userIds = [...new Set((allParticipants || []).map((p: any) => p.actor?.user_id).filter(Boolean))];
  const fanActorIds = [...new Set((allParticipants || []).filter((p: any) => p.actor?.type === "fan").map((p: any) => p.actor?.id).filter(Boolean))];
  const brandActorIds = [...new Set((allParticipants || []).filter((p: any) => p.actor?.type === "brand").map((p: any) => p.actor?.id).filter(Boolean))];

  // Fetch all models for these users
  const { data: models } = userIds.length > 0
    ? await supabase
        .from("models")
        .select("user_id, username, first_name, last_name, profile_photo_url")
        .in("user_id", userIds) as { data: any[] | null }
    : { data: [] };

  // Fetch all fans (use admin client to bypass RLS)
  const { data: fans } = fanActorIds.length > 0
    ? await adminClient
        .from("fans")
        .select("id, display_name, username, avatar_url")
        .in("id", fanActorIds) as { data: any[] | null }
    : { data: [] };

  // Fetch all brands
  const { data: brands } = brandActorIds.length > 0
    ? await (supabase
        .from("brands") as any)
        .select("id, company_name, logo_url")
        .in("id", brandActorIds) as { data: any[] | null }
    : { data: [] };

  // Create lookup maps
  const modelsByUserId = new Map((models || []).map((m: any) => [m.user_id, m]));
  const fansById = new Map((fans || []).map((f: any) => [f.id, f]));
  const brandsById = new Map((brands || []).map((b: any) => [b.id, b]));

  // Group participants by conversation with enriched data
  const participantsMap = new Map<string, any[]>();
  (allParticipants || []).forEach((p: any) => {
    const existing = participantsMap.get(p.conversation_id) || [];
    const actorData = p.actor;
    if (actorData) {
      const model = modelsByUserId.get(actorData.user_id);
      const fan = fansById.get(actorData.id);
      const brand = brandsById.get(actorData.id);
      existing.push({
        ...actorData,
        model: model || null,
        fan: fan || null,
        brand: brand || null,
      });
    }
    participantsMap.set(p.conversation_id, existing);
  });

  // Combine data and sort by most recent activity
  const conversations = (participations || [])
    .map((p: any) => ({
      ...p,
      lastMessage: lastMessageMap.get(p.conversation_id) || null,
      otherParticipants: participantsMap.get(p.conversation_id) || [],
    }))
    .sort((a: any, b: any) => {
      const aDate = a.lastMessage?.created_at || a.conversation?.updated_at || 0;
      const bDate = b.lastMessage?.created_at || b.conversation?.updated_at || 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  // Count fans and brands for blast dialog
  const fanCount = fanActorIds.length;
  const brandCount = brandActorIds.length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Desktop: two-panel layout */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:h-[calc(100vh-120px)] lg:-my-8">
        {/* Left panel: conversation list (desktop only) */}
        <div className="hidden lg:flex lg:flex-col lg:border-r lg:overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold">Chats</h1>
            <div className="flex items-center gap-2">
              {actor.type === "model" && (
                <BlastDialog fanCount={fanCount} brandCount={brandCount} />
              )}
              {actor.type === "brand" && (
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
