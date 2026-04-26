import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

export type FeedItem = {
  id: string;
  type: "tip" | "follower" | "message";
  actor: { name: string; avatar: string | null; type: string; username?: string | null } | null;
  amount?: number;
  messagePreview?: string;
  conversationId?: string;
  createdAt: string;
};

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
    { data: recentTips },
    { data: recentFollowers },
    { data: modelParticipations },
    { count: unreadCount },
  ] = await Promise.all([
    (adminClient.from("coin_transactions") as any)
      .select("id, amount, created_at, metadata")
      .eq("actor_id", actor.id)
      .eq("action", "tip_received")
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
    const { data: messages } = await (adminClient.from("messages") as any)
      .select("id, conversation_id, sender_id, content, created_at, is_system")
      .in("conversation_id", conversationIds)
      .neq("sender_id", actor.id)
      .eq("is_system", false)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    recentMessages = (messages || []).filter((msg: any) => {
      const lastRead = lastReadMap.get(msg.conversation_id);
      return !lastRead || new Date(msg.created_at) > new Date(lastRead);
    }).slice(0, 10);
  }

  const tipSenderIds = (recentTips || []).map((t: any) => t.metadata?.sender_id).filter(Boolean);
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
        ? (adminClient.from("models") as any).select("user_id, first_name, username, profile_photo_url").in("user_id", modelUserIds)
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
        if (m) actorsMap.set(a.id, { name: m.first_name || m.username || "Model", avatar: m.profile_photo_url, type: "model", username: m.username });
      }
    }
  }

  const feed: FeedItem[] = [
    ...(recentTips || []).map((tip: any) => ({
      id: `tip-${tip.id}`,
      type: "tip" as const,
      actor: actorsMap.get(tip.metadata?.sender_id) || null,
      amount: tip.amount,
      createdAt: tip.created_at,
    })),
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
