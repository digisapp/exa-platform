import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

export type FeedItem = {
  id: string;
  // Money types beyond "tip" map from coin_transactions actions; the chat
  // media action 'ppv_sale' is deliberately renamed "media_unlock" here so
  // no 'ppv' string ever reaches a client payload (no-PPV copy rule).
  type:
    | "tip"
    | "live_wall_tip"
    | "content_sale"
    | "media_unlock"
    | "auction_sale"
    | "follower"
    | "message";
  actor: { name: string; avatar: string | null; type: string; username?: string | null } | null;
  amount?: number;
  messagePreview?: string;
  conversationId?: string;
  createdAt: string;
};

// Ledger actions that credit the model and belong in the bell feed. Must
// stay a superset of every type inserted by insertEarningNotification
// (src/lib/earning-notifications.ts) — the badge counts notifications rows
// while this feed is reconstructed from the ledger, so any notification
// type without a matching action here becomes a ghost badge.
const EARNING_FEED_ACTIONS = [
  "tip_received",
  "live_wall_tip_received",
  "content_sale",
  "ppv_sale",
  "auction_sale",
] as const;

const ACTION_TO_FEED_TYPE: Record<string, FeedItem["type"]> = {
  tip_received: "tip",
  live_wall_tip_received: "live_wall_tip",
  content_sale: "content_sale",
  ppv_sale: "media_unlock",
  auction_sale: "auction_sale",
};

// Counterparty actor id — the metadata key varies by RPC: transfer_coins
// writes sender_id, tip_live_wall_message writes tipper_actor_id, content/
// media unlocks write buyer_id, end_auction writes winner_id.
function earningCounterpartyId(metadata: Record<string, any> | null | undefined): string | undefined {
  return (
    metadata?.sender_id ||
    metadata?.tipper_actor_id ||
    metadata?.buyer_id ||
    metadata?.winner_id ||
    undefined
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "model") {
    return NextResponse.json({ feed: [], unreadCount: 0 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: recentEarnings },
    { data: recentFollowers },
    { data: modelParticipations },
    { count: unreadCount },
  ] = await Promise.all([
    (adminClient.from("coin_transactions") as any)
      .select("id, amount, action, created_at, metadata")
      .eq("actor_id", actor.id)
      .in("action", EARNING_FEED_ACTIONS as unknown as string[])
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (adminClient.from("follows") as any)
      .select("follower_id, created_at")
      .eq("following_id", actor.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (supabase.from("conversation_participants") as any)
      .select("conversation_id, last_read_at")
      .eq("actor_id", actor.id),
    (supabase.from("notifications") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  const conversationIds = (modelParticipations || []).map((p: any) => p.conversation_id);
  const lastReadMap = new Map<string, string | null>(
    (modelParticipations || []).map((p: any) => [p.conversation_id, p.last_read_at])
  );

  let recentMessages: any[] = [];
  if (conversationIds.length > 0) {
    // Batched: one .in() with every id fails outright past ~300 UUIDs (16KB
    // URL limit) — the admin actor sits in 700+ conversations, which silently
    // dropped every message notification from the bell.
    const batches: string[][] = [];
    for (let i = 0; i < conversationIds.length; i += 200) {
      batches.push(conversationIds.slice(i, i + 200));
    }
    const batchResults = await Promise.all(
      batches.map((batch) =>
        (adminClient.from("messages") as any)
          .select("id, conversation_id, sender_id, content, created_at, is_system")
          .in("conversation_id", batch)
          .neq("sender_id", actor.id)
          .eq("is_system", false)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20)
      )
    );
    const messages = batchResults
      .flatMap((r: any) => r.data || [])
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);

    recentMessages = (messages || []).filter((msg: any) => {
      const lastRead = lastReadMap.get(msg.conversation_id);
      return !lastRead || new Date(msg.created_at) > new Date(lastRead);
    }).slice(0, 10);
  }

  const tipSenderIds = (recentEarnings || []).map((t: any) => earningCounterpartyId(t.metadata)).filter(Boolean);
  const followerIds = (recentFollowers || []).map((f: any) => f.follower_id).filter(Boolean);
  const messageSenderIds = recentMessages.map((m: any) => m.sender_id).filter(Boolean);
  const allIds = [...new Set([...tipSenderIds, ...followerIds, ...messageSenderIds])];

  const actorsMap = new Map<string, any>();
  if (allIds.length > 0) {
    const { data: activityActors } = await (adminClient.from("actors") as any)
      .select("id, type, user_id")
      .in("id", allIds);

    const actorTypes = new Map<string, any>((activityActors || []).map((a: any) => [a.id, a]));
    const fanIds = allIds.filter(id => actorTypes.get(id)?.type === "fan");
    const brandIds = allIds.filter(id => actorTypes.get(id)?.type === "brand");
    const modelUserIds = (activityActors || [])
      .filter((a: any) => a.type === "model" && a.user_id)
      .map((a: any) => a.user_id);

    const [fans, brands, models] = await Promise.all([
      fanIds.length > 0
        ? (adminClient.from("fans") as any).select("id, display_name, username, avatar_url").in("id", fanIds)
        : { data: [] },
      brandIds.length > 0
        ? (adminClient.from("brands") as any).select("id, company_name, logo_url").in("id", brandIds)
        : { data: [] },
      modelUserIds.length > 0
        ? (adminClient.from("models") as any).select("user_id, username, profile_photo_url").in("user_id", modelUserIds)
        : { data: [] },
    ]);

    for (const fan of fans.data || []) {
      actorsMap.set(fan.id, { name: fan.display_name || fan.username || "Fan", avatar: fan.avatar_url, type: "fan", username: fan.username });
    }
    for (const brand of brands.data || []) {
      actorsMap.set(brand.id, { name: brand.company_name || "Brand", avatar: brand.logo_url, type: "brand", username: null });
    }
    for (const a of activityActors || []) {
      if (a.type === "model") {
        const m = (models.data || []).find((m: any) => m.user_id === a.user_id);
        if (m) actorsMap.set(a.id, { name: m.username || "Model", avatar: m.profile_photo_url, type: "model", username: m.username });
      }
    }
  }

  const feed: FeedItem[] = [
    ...(recentEarnings || []).map((tx: any) => {
      const counterpartyId = earningCounterpartyId(tx.metadata);
      return {
        id: `earn-${tx.id}`,
        type: ACTION_TO_FEED_TYPE[tx.action] ?? ("tip" as const),
        actor: (counterpartyId && actorsMap.get(counterpartyId)) || null,
        amount: tx.amount,
        createdAt: tx.created_at,
      };
    }),
    ...(recentFollowers || []).map((follow: any) => ({
      id: `follow-${follow.follower_id}-${follow.created_at}`,
      type: "follower" as const,
      actor: actorsMap.get(follow.follower_id) || null,
      createdAt: follow.created_at,
    })),
    ...recentMessages.map((msg: any) => ({
      id: `msg-${msg.id}`,
      type: "message" as const,
      actor: actorsMap.get(msg.sender_id) || null,
      messagePreview: msg.content?.slice(0, 50) + (msg.content?.length > 50 ? "..." : ""),
      conversationId: msg.conversation_id,
      createdAt: msg.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return NextResponse.json({ feed, unreadCount: unreadCount ?? 0 });
}
