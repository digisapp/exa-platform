import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendModelReplyNotificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const adminClient: any = createServiceRoleClient();

// How long a model's message must sit unread before we email the fan.
// Long enough that a fan already in the chat never gets one; short enough
// to catch the fan while the reply is fresh.
const UNREAD_GRACE_MINUTES = 12;
// Upper edge of the scan window. Anything older is the 24h nudge's job;
// the overlap between runs is deduped by chat_nudges_sent.
const WINDOW_MINUTES = 70;
// One reply email per conversation per this period.
const DEDUP_HOURS = 24;

// GET /api/cron/reply-notifications — email fans whose model reply is
// still unread after ~12 minutes. Runs every 10 minutes via Vercel cron.
// Model→fan only: a model reply is the key activation event, and the
// instant first-message email + 24h nudge already cover everything else.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
    const windowEnd = new Date(now.getTime() - UNREAD_GRACE_MINUTES * 60 * 1000);

    const { data: recentMessages, error: msgError } = await adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("is_system", false)
      .gte("created_at", windowStart.toISOString())
      .lte("created_at", windowEnd.toISOString())
      .order("created_at", { ascending: false });

    if (msgError) throw msgError;
    if (!recentMessages?.length) {
      return NextResponse.json({ message: "No recent messages", sent: 0 });
    }

    // Latest in-window message per conversation
    const latestByConversation = new Map<string, typeof recentMessages[0]>();
    for (const msg of recentMessages) {
      if (!latestByConversation.has(msg.conversation_id)) {
        latestByConversation.set(msg.conversation_id, msg);
      }
    }

    // Keep only conversations where the latest message was sent by a model
    const senderIds = [...new Set([...latestByConversation.values()].map((m) => m.sender_id))];
    const { data: senderActors } = await adminClient
      .from("actors")
      .select("id, type, user_id")
      .in("id", senderIds)
      .eq("type", "model");

    const modelActorMap = new Map<string, any>((senderActors || []).map((a: any) => [a.id, a]));
    for (const [convId, msg] of latestByConversation) {
      if (!modelActorMap.has(msg.sender_id)) latestByConversation.delete(convId);
    }
    if (latestByConversation.size === 0) {
      return NextResponse.json({ message: "No model messages in window", sent: 0 });
    }

    const conversationIds = Array.from(latestByConversation.keys());

    const { data: participants, error: partError } = await adminClient
      .from("conversation_participants")
      .select("conversation_id, actor_id, last_read_at, unread_count")
      .in("conversation_id", conversationIds);

    if (partError) throw partError;

    // Dedup: at most one reply email per conversation+recipient per DEDUP_HOURS
    const dedupCutoff = new Date(now.getTime() - DEDUP_HOURS * 60 * 60 * 1000);
    const { data: recentNudges } = await adminClient
      .from("chat_nudges_sent")
      .select("conversation_id, recipient_id, created_at")
      .eq("nudge_type", "model_reply")
      .in("conversation_id", conversationIds);

    const recentlyNotified = new Set(
      (recentNudges || [])
        .filter((n: any) => new Date(n.created_at) > dedupCutoff)
        .map((n: any) => `${n.conversation_id}:${n.recipient_id}`)
    );

    // Recipient actors (the non-sender participants) — fans only
    const recipientActorIds = [
      ...new Set(
        (participants || [])
          .filter((p: any) => {
            const latest = latestByConversation.get(p.conversation_id);
            return latest && p.actor_id !== latest.sender_id;
          })
          .map((p: any) => p.actor_id)
      ),
    ];
    const { data: recipientActors } = await adminClient
      .from("actors")
      .select("id, type, user_id")
      .in("id", recipientActorIds)
      .eq("type", "fan");

    const fanActorMap = new Map<string, any>((recipientActors || []).map((a: any) => [a.id, a]));

    const candidates: {
      conversationId: string;
      fanActor: any;
      modelActor: any;
      message: typeof recentMessages[0];
    }[] = [];

    for (const [convId, latestMsg] of latestByConversation) {
      const convParticipants = (participants || []).filter((p: any) => p.conversation_id === convId);
      for (const p of convParticipants) {
        if (p.actor_id === latestMsg.sender_id) continue;

        const fanActor = fanActorMap.get(p.actor_id);
        if (!fanActor) continue; // recipient isn't a fan

        const isUnread =
          (p.unread_count != null && p.unread_count > 0) ||
          !p.last_read_at ||
          new Date(p.last_read_at) < new Date(latestMsg.created_at);
        if (!isUnread) continue;

        if (recentlyNotified.has(`${convId}:${p.actor_id}`)) continue;

        candidates.push({
          conversationId: convId,
          fanActor,
          modelActor: modelActorMap.get(latestMsg.sender_id),
          message: latestMsg,
        });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ message: "No notifications needed", sent: 0 });
    }

    // Skip messages that are the model's FIRST in the conversation — the
    // send route already emailed those instantly (first-message email).
    const firstMessageChecks = await Promise.all(
      candidates.map(async (c) => {
        const { count } = await adminClient
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.conversationId)
          .eq("sender_id", c.message.sender_id)
          .lte("created_at", c.message.created_at);
        return (count ?? 0) > 1;
      })
    );
    const replyCandidates = candidates.filter((_, i) => firstMessageChecks[i]);

    if (replyCandidates.length === 0) {
      return NextResponse.json({ message: "Only first messages (already emailed)", sent: 0 });
    }

    // Model display names — @username only, never real names (see
    // project_model_name_privacy)
    const modelUserIds = [...new Set(replyCandidates.map((c) => c.modelActor.user_id))];
    const { data: models } = await adminClient
      .from("models")
      .select("user_id, username")
      .in("user_id", modelUserIds);
    const modelsByUserId = new Map<string, any>((models || []).map((m: any) => [m.user_id, m]));

    const fanUserIds = [...new Set(replyCandidates.map((c) => c.fanActor.user_id))];
    const { data: fans } = await adminClient
      .from("fans")
      .select("user_id, display_name, username")
      .in("user_id", fanUserIds);
    const fansByUserId = new Map<string, any>((fans || []).map((f: any) => [f.user_id, f]));

    let sentCount = 0;
    const errors: string[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

    for (const candidate of replyCandidates) {
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(
          candidate.fanActor.user_id
        );
        const email = authUser?.user?.email;
        if (!email) continue;

        const model = modelsByUserId.get(candidate.modelActor.user_id);
        const modelName = model?.username ? `@${model.username}` : "A model";
        const fan = fansByUserId.get(candidate.fanActor.user_id);
        const fanName = fan?.display_name || fan?.username || "there";

        await sendModelReplyNotificationEmail({
          to: email,
          recipientName: fanName,
          modelName,
          messagePreview: candidate.message.content || "(Media message)",
          conversationUrl: `${baseUrl}/chats/${candidate.conversationId}`,
        });

        // Upsert refreshes created_at, restarting the 24h dedup window
        await adminClient.from("chat_nudges_sent").upsert(
          {
            conversation_id: candidate.conversationId,
            recipient_id: candidate.fanActor.id,
            nudge_type: "model_reply",
            created_at: now.toISOString(),
          },
          { onConflict: "conversation_id,recipient_id,nudge_type" }
        );

        sentCount++;
      } catch (err) {
        logger.error("Failed to send reply notification", err, {
          conversationId: candidate.conversationId,
        });
        errors.push(`Failed for conversation ${candidate.conversationId}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reply notification emails`,
      sent: sentCount,
      candidates: replyCandidates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Cron reply-notifications error", error);
    return NextResponse.json({ error: "Failed to process reply notifications" }, { status: 500 });
  }
}
