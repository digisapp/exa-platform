import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve user_id -> email for a given list of user IDs.
 *
 * Wraps `auth.admin.listUsers`, which paginates with a default perPage of 50
 * — calling it once silently misses recipients on platforms with more than
 * ~50 auth users. This helper paginates until every requested ID is found
 * or the user pool is exhausted.
 */
export async function listUserEmailsByIds(
  adminClient: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!userIds.length) return result;

  const wanted = new Set(userIds);
  const perPage = 200;
  let page = 1;

  while (wanted.size > 0) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    if (!users.length) break;

    for (const u of users) {
      if (wanted.has(u.id) && u.email) {
        result.set(u.id, u.email);
        wanted.delete(u.id);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return result;
}
