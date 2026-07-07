import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Post a system heartbeat message to the EXA Live Wall (gig published,
 * model accepted to a show, ...). These keep the wall alive between
 * events and re-open it when it has gone quiet — the dashboard collapses
 * the wall after 7 silent days, and a new system post revives it.
 *
 * Never throws: a failed wall post must not break the calling flow.
 */
export async function postLiveWallSystemMessage(content: string) {
  try {
    const adminClient = createServiceRoleClient();
    const { error } = await (adminClient.from("live_wall_messages") as any).insert({
      actor_type: "system",
      display_name: "EXA",
      content,
      message_type: "system",
    });
    if (error) console.error("Live wall system post failed:", error);
  } catch (err) {
    console.error("Live wall system post failed:", err);
  }
}
