import { createClient } from "@/lib/supabase/server";
import { LiveWall } from "./LiveWall";
import { enrichLiveWallAvatars } from "@/lib/live-wall-avatars";
import { vipTierOf, type VipTierKey } from "@/lib/vip-config";

/** Tuck the message history behind a "Show recent posts" expander after this
 *  many silent days. A new post (including system heartbeats on gig
 *  publish/accept) reopens it. */
const QUIET_AFTER_DAYS = 7;

interface Props {
  actorId: string;
  actorType: string;
  /** Sidebar mode: fills container height, no collapse toggle */
  compact?: boolean;
}

/**
 * Server component wrapper that fetches initial messages + coin balance
 * and renders the LiveWall client component. Drop this into any page.
 *
 * The wall is an event-pulse feature: it lights up around shows and goes
 * quiet between them. When the newest message is older than
 * QUIET_AFTER_DAYS, the wall still renders normally (header + input) but
 * starts with the stale history collapsed — it never announces the lull.
 */
export async function LiveWallServer({ actorId, actorType, compact }: Props) {
  const supabase = await createClient();

  // Fetch the NEWEST messages (descending), then reverse into chronological
  // order for display. Ascending+limit would return the oldest 50 ever and
  // silently drop everything recent once the wall passes 50 messages.
  const { data: rawMessages } = await (supabase as any)
    .from("live_wall_messages")
    .select(
      "id, actor_id, actor_type, display_name, avatar_url, profile_slug, content, message_type, reactions, image_url, image_type, is_pinned, tip_total, created_at"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const newestFirst = rawMessages || [];
  const newestAt = newestFirst[0]?.created_at
    ? new Date(newestFirst[0].created_at).getTime()
    : 0;
  const isQuiet = Date.now() - newestAt > QUIET_AFTER_DAYS * 86_400_000;

  // Re-resolve avatars from current profile data — the column on
  // live_wall_messages is captured at insert time and goes stale
  // when a user uploads/changes their photo after posting.
  const messages = (await enrichLiveWallAvatars(
    supabase as any,
    [...newestFirst].reverse()
  )) as any[];

  // Fetch coin balance
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let coinBalance = 0;
  // Fan VIP tier + name, tracked into wall presence so the room can announce
  // VIP arrivals. Server-resolved (badges are never client-claimed data).
  let vipTierKey: VipTierKey | null = null;
  let displayName: string | null = null;
  if (user) {
    if (actorType === "model") {
      const { data } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
    } else if (actorType === "fan") {
      const { data } = await (supabase as any)
        .from("fans")
        .select("coin_balance, display_name, username, lifetime_spend_coins")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
      vipTierKey = vipTierOf(data?.lifetime_spend_coins)?.key ?? null;
      displayName = data?.username ? `@${data.username}` : data?.display_name || null;
    } else if (actorType === "brand") {
      const { data } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  return (
    <LiveWall
      initialMessages={messages}
      currentUser={{ actorId, actorType, coinBalance, vipTierKey, displayName }}
      compact={compact}
      startCollapsed={isQuiet}
    />
  );
}
