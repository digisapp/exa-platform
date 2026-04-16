import { createClient } from "@/lib/supabase/server";
import { LiveWall } from "./LiveWall";
import { enrichLiveWallAvatars } from "@/lib/live-wall-avatars";

interface Props {
  actorId: string;
  actorType: string;
}

/**
 * Server component wrapper that fetches initial messages + coin balance
 * and renders the LiveWall client component. Drop this into any page.
 */
export async function LiveWallServer({ actorId, actorType }: Props) {
  const supabase = await createClient();

  // Fetch initial messages
  const { data: rawMessages } = await (supabase as any)
    .from("live_wall_messages")
    .select(
      "id, actor_id, actor_type, display_name, avatar_url, profile_slug, content, message_type, reactions, image_url, image_type, is_pinned, tip_total, created_at"
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(50);

  // Re-resolve avatars from current profile data — the column on
  // live_wall_messages is captured at insert time and goes stale
  // when a user uploads/changes their photo after posting.
  const messages = (await enrichLiveWallAvatars(
    supabase as any,
    rawMessages || []
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

  return (
    <LiveWall
      initialMessages={messages}
      currentUser={{ actorId, actorType, coinBalance }}
    />
  );
}
