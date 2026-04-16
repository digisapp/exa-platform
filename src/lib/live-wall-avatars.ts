import type { SupabaseClient } from "@supabase/supabase-js";

interface MessageWithProfile {
  actor_id: string | null;
  actor_type: string;
  display_name: string;
  avatar_url: string | null;
  profile_slug: string | null;
}

interface ProfileSnapshot {
  avatar_url: string | null;
  display_name: string | null;
  profile_slug: string | null;
}

/**
 * Re-resolves avatar_url, display_name, and profile_slug on live wall
 * messages from the underlying profile tables. These columns on
 * live_wall_messages are captured at insert time, so they go stale when
 * a model/fan/brand uploads a photo, changes their username, or renames
 * after posting.
 *
 * Falls back to the stored value when the lookup yields null/empty.
 */
export async function enrichLiveWallAvatars<T extends MessageWithProfile>(
  supabase: SupabaseClient,
  messages: T[]
): Promise<T[]> {
  if (!messages.length) return messages;

  const actorIds = Array.from(
    new Set(
      messages
        .filter(
          (m) =>
            m.actor_id && ["model", "fan", "brand"].includes(m.actor_type)
        )
        .map((m) => m.actor_id as string)
    )
  );
  if (!actorIds.length) return messages;

  const { data: actors } = await supabase
    .from("actors")
    .select("id, type, user_id")
    .in("id", actorIds);
  if (!actors) return messages;

  const modelUserIds: string[] = [];
  const fanUserIds: string[] = [];
  const brandUserIds: string[] = [];
  const userIdToActorId = new Map<string, string>();
  for (const a of actors as Array<{ id: string; type: string; user_id: string | null }>) {
    if (!a.user_id) continue;
    userIdToActorId.set(a.user_id, a.id);
    if (a.type === "model") modelUserIds.push(a.user_id);
    else if (a.type === "fan") fanUserIds.push(a.user_id);
    else if (a.type === "brand") brandUserIds.push(a.user_id);
  }

  const [models, fans, brands] = await Promise.all([
    modelUserIds.length
      ? supabase
          .from("models")
          .select("user_id, profile_photo_url, username, first_name, last_name")
          .in("user_id", modelUserIds)
      : Promise.resolve({
          data: [] as Array<{
            user_id: string;
            profile_photo_url: string | null;
            username: string | null;
            first_name: string | null;
            last_name: string | null;
          }>,
        }),
    fanUserIds.length
      ? supabase
          .from("fans")
          .select("user_id, avatar_url, username, display_name")
          .in("user_id", fanUserIds)
      : Promise.resolve({
          data: [] as Array<{
            user_id: string;
            avatar_url: string | null;
            username: string | null;
            display_name: string | null;
          }>,
        }),
    brandUserIds.length
      ? supabase
          .from("brands")
          .select("user_id, logo_url, company_name")
          .in("user_id", brandUserIds)
      : Promise.resolve({
          data: [] as Array<{
            user_id: string;
            logo_url: string | null;
            company_name: string | null;
          }>,
        }),
  ]);

  const profileMap = new Map<string, ProfileSnapshot>();
  for (const m of (models.data as Array<{
    user_id: string;
    profile_photo_url: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  }>) || []) {
    const aid = userIdToActorId.get(m.user_id);
    if (!aid) continue;
    const display = m.username
      ? `@${m.username}`
      : `${m.first_name || ""} ${m.last_name || ""}`.trim() || null;
    profileMap.set(aid, {
      avatar_url: m.profile_photo_url,
      display_name: display,
      profile_slug: m.username,
    });
  }
  for (const f of (fans.data as Array<{
    user_id: string;
    avatar_url: string | null;
    username: string | null;
    display_name: string | null;
  }>) || []) {
    const aid = userIdToActorId.get(f.user_id);
    if (!aid) continue;
    profileMap.set(aid, {
      avatar_url: f.avatar_url,
      display_name: f.username ? `@${f.username}` : f.display_name,
      profile_slug: f.username,
    });
  }
  for (const b of (brands.data as Array<{
    user_id: string;
    logo_url: string | null;
    company_name: string | null;
  }>) || []) {
    const aid = userIdToActorId.get(b.user_id);
    if (!aid) continue;
    profileMap.set(aid, {
      avatar_url: b.logo_url,
      display_name: b.company_name ? `@${b.company_name}` : null,
      profile_slug: null,
    });
  }

  return messages.map((m) => {
    if (!m.actor_id) return m;
    const current = profileMap.get(m.actor_id);
    if (!current) return m;
    return {
      ...m,
      avatar_url: current.avatar_url ?? m.avatar_url,
      display_name: current.display_name ?? m.display_name,
      profile_slug: current.profile_slug ?? m.profile_slug,
    };
  });
}
