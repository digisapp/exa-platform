import { createClient } from "@/lib/supabase/server";
import { LiveWall } from "./LiveWall";
import { LiveWallQuietCard } from "./LiveWallQuietCard";
import { LiveWallQuietGate } from "./LiveWallQuietGate";
import { enrichLiveWallAvatars } from "@/lib/live-wall-avatars";

/** Collapse the wall to a teaser after this many silent days. A new post
 *  (including system heartbeats on gig publish/accept) revives it. */
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
 * QUIET_AFTER_DAYS, render a compact teaser instead of a dead chat room.
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
  if (user) {
    if (actorType === "model") {
      const { data } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
    } else if (actorType === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
    } else if (actorType === "brand") {
      const { data } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const wall = (
    <LiveWall
      initialMessages={messages}
      currentUser={{ actorId, actorType, coinBalance }}
      compact={compact}
    />
  );

  if (isQuiet) {
    return (
      <LiveWallQuietGate
        quietCard={<LiveWallQuietCard actorType={actorType} compact={compact} />}
        wall={wall}
      />
    );
  }

  return wall;
}
