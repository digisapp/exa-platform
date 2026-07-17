import { cache } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isChatMediaPath } from "@/lib/chat-media";

/**
 * Per-request memoized entry point. The chats layout and page both need this
 * data in the same render pass; cache() keyed on actorId makes the second
 * call free instead of re-running ~6 queries.
 */
export const getConversationList = cache(async (actorId: string) => {
  const supabase = await createClient();
  const adminClient = createServiceRoleClient();
  return fetchConversationList(supabase, adminClient, actorId);
});

// PostgREST fails outright (no rows, no thrown error from the client) once an
// .in() list pushes the request URL past the ~16KB gateway limit (~300 UUIDs).
// The admin inbox sits in 700+ conversations, so every id list here must be
// batched. 200 per query, same convention as /api/admin/models (PR #143).
const IN_BATCH_SIZE = 200;

async function batchIn<T>(
  ids: string[],
  queryFn: (batchIds: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_BATCH_SIZE) {
    batches.push(ids.slice(i, i + IN_BATCH_SIZE));
  }
  const results = await Promise.all(batches.map((batch) => queryFn(batch)));
  const rows: T[] = [];
  for (const { data, error } of results) {
    // A failed batch must not silently render every conversation as "Unknown"
    if (error) throw error;
    if (data) rows.push(...data);
  }
  return rows;
}

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

  // Fetch last message per conversation in a single round-trip via a DISTINCT ON
  // RPC. Replaces N round-trips that previously dominated /chats render time.
  const lastMessageMap = new Map<string, any>();

  if (conversationIds.length > 0) {
    const { data: lastMessages } = await (supabase as any).rpc(
      "get_last_messages_for_conversations",
      { p_conversation_ids: conversationIds }
    );

    for (const m of (lastMessages || []) as Array<{ conversation_id: string; media_url?: string | null }>) {
      // The inbox preview renders off media_type, never media_url — so map
      // chat-media storage paths (src/lib/chat-media.ts) to null instead of
      // signing 50 previews nobody displays.
      lastMessageMap.set(m.conversation_id, {
        ...m,
        media_url: isChatMediaPath(m.media_url) ? null : m.media_url ?? null,
      });
    }
  }

  // Batch fetch: all other participants for all conversations
  const allParticipants: any[] = await batchIn(conversationIds, (batch) =>
    supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        actor:actors(
          id,
          type,
          user_id
        )
      `)
      .in("conversation_id", batch)
      .neq("actor_id", actorId)
  );

  // Get user IDs for models and actor IDs for fans/brands
  const userIds = [...new Set((allParticipants || []).map((p: any) => p.actor?.user_id).filter(Boolean))];
  const fanActorIds = [...new Set((allParticipants || []).filter((p: any) => p.actor?.type === "fan").map((p: any) => p.actor?.id).filter(Boolean))];
  const brandActorIds = [...new Set((allParticipants || []).filter((p: any) => p.actor?.type === "brand").map((p: any) => p.actor?.id).filter(Boolean))];

  // Fetch all models, fans (admin client to bypass RLS), and brands
  const [models, fans, brands] = await Promise.all([
    batchIn<any>(userIds, (batch) =>
      supabase
        .from("models")
        .select("user_id, username, profile_photo_url")
        .in("user_id", batch)
    ),
    batchIn<any>(fanActorIds, (batch) =>
      adminClient
        .from("fans")
        .select("id, display_name, username, avatar_url")
        .in("id", batch)
    ),
    batchIn<any>(brandActorIds, (batch) =>
      (supabase.from("brands") as any)
        .select("id, company_name, logo_url")
        .in("id", batch)
    ),
  ]);

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
