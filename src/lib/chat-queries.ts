import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared conversation list query used by both chats layout and page.
 * Avoids duplicating the same N+1 fetch logic in two places.
 */
export async function fetchConversationList(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  actorId: string
) {
  // Get conversations with participants
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id,
      last_read_at,
      is_pinned,
      is_archived,
      unread_count,
      conversation:conversations(
        id,
        type,
        title,
        updated_at
      )
    `)
    .eq("actor_id", actorId)
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

    const results = await Promise.allSettled(messagePromises);
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const { convId, message } = result.value;
        if (message) {
          lastMessageMap.set(convId, message);
        }
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
        .neq("actor_id", actorId) as { data: any[] | null }
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

  // Combine data, filter out ghost conversations (no messages), and sort
  const conversations = (participations || [])
    .map((p: any) => ({
      ...p,
      lastMessage: lastMessageMap.get(p.conversation_id) || null,
      otherParticipants: participantsMap.get(p.conversation_id) || [],
    }))
    .filter((c: any) => c.lastMessage !== null)
    .sort((a: any, b: any) => {
      const aDate = a.lastMessage?.created_at || a.conversation?.updated_at || 0;
      const bDate = b.lastMessage?.created_at || b.conversation?.updated_at || 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return {
    conversations,
    fanCount: fanActorIds.length,
    brandCount: brandActorIds.length,
  };
}
