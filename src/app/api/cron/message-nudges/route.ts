import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendUnreadMessageNudgeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const adminClient: any = createServiceRoleClient();

// GET /api/cron/message-nudges — nudge users who have unread messages older than 24h
// Runs twice daily via Vercel cron (e.g. 9 AM and 7 PM)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // Find conversation participants who have unread messages:
    // - Messages sent by someone else in their conversation
    // - Message created_at > participant's last_read_at (or last_read_at is null)
    // - Message is between 24-72 hours old (don't nudge for very old messages)
    // - Participant hasn't been nudged for this conversation recently
    //
    // Strategy: Get all conversations with recent messages, then check each participant's read status.
    const { data: recentMessages, error: msgError } = await adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("is_system", false)
      .gte("created_at", seventyTwoHoursAgo.toISOString())
      .lte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (msgError) throw msgError;
    if (!recentMessages?.length) {
      return NextResponse.json({ message: "No messages to nudge for", sent: 0 });
    }

    // Group by conversation, keep only the latest message per conversation
    const latestByConversation = new Map<string, typeof recentMessages[0]>();
    for (const msg of recentMessages) {
      if (!latestByConversation.has(msg.conversation_id)) {
        latestByConversation.set(msg.conversation_id, msg);
      }
    }

    const conversationIds = Array.from(latestByConversation.keys());

    // Get all participants for these conversations
    const { data: participants, error: partError } = await adminClient
      .from("conversation_participants")
      .select("conversation_id, actor_id, last_read_at, nudge_sent_at")
      .in("conversation_id", conversationIds);

    if (partError) throw partError;

    // Find participants who need a nudge:
    // - They are NOT the sender of the latest message
    // - They have unread messages (unread_count > 0 OR last_read_at before the message)
    // - They haven't been nudged for this conversation recently (dedup via chat_nudges_sent)
    const nudgeCandidates: {
      conversationId: string;
      actorId: string;
      latestMessage: typeof recentMessages[0];
      senderId: string;
    }[] = [];

    // Batch-check existing nudges for dedup
    const { data: existingNudges } = await adminClient
      .from("chat_nudges_sent")
      .select("conversation_id, recipient_id, nudge_type")
      .eq("nudge_type", "unread_reminder")
      .in("conversation_id", conversationIds);

    const nudgeSentSet = new Set(
      (existingNudges || []).map((n: any) => `${n.conversation_id}:${n.recipient_id}`)
    );

    for (const [convId, latestMsg] of latestByConversation) {
      const convParticipants = (participants || []).filter((p: any) => p.conversation_id === convId);
      for (const p of convParticipants) {
        // Skip the sender
        if (p.actor_id === latestMsg.sender_id) continue;

        // Check if unread (prefer DB count, fall back to timestamp)
        const isUnread = (p.unread_count != null && p.unread_count > 0)
          || !p.last_read_at
          || new Date(p.last_read_at) < new Date(latestMsg.created_at);
        if (!isUnread) continue;

        // Check dedup: skip if already nudged for this conversation
        if (nudgeSentSet.has(`${convId}:${p.actor_id}`)) continue;

        // Also check legacy nudge_sent_at (within 72h)
        if (p.nudge_sent_at && new Date(p.nudge_sent_at) > seventyTwoHoursAgo) continue;

        nudgeCandidates.push({
          conversationId: convId,
          actorId: p.actor_id,
          latestMessage: latestMsg,
          senderId: latestMsg.sender_id,
        });
      }
    }

    if (nudgeCandidates.length === 0) {
      return NextResponse.json({ message: "No nudges needed", sent: 0 });
    }

    // Get actor details for all involved actors
    const allActorIds = [...new Set([
      ...nudgeCandidates.map((c) => c.actorId),
      ...nudgeCandidates.map((c) => c.senderId),
    ])];

    const { data: actors } = await adminClient
      .from("actors")
      .select("id, type, user_id")
      .in("id", allActorIds);

    const actorMap = new Map<string, any>((actors || []).map((a: any) => [a.id, a]));

    // Batch-fetch display names for models, fans, brands
    const modelUserIds = (actors || []).filter((a: any) => a.type === "model").map((a: any) => a.user_id);
    const fanUserIds = (actors || []).filter((a: any) => a.type === "fan").map((a: any) => a.user_id);
    const brandUserIds = (actors || []).filter((a: any) => a.type === "brand").map((a: any) => a.user_id);

    const [modelsRes, fansRes, brandsRes] = await Promise.all([
      modelUserIds.length > 0
        ? adminClient.from("models").select("user_id, first_name, last_name, username").in("user_id", modelUserIds)
        : { data: [] },
      fanUserIds.length > 0
        ? adminClient.from("fans").select("user_id, display_name, username").in("user_id", fanUserIds)
        : { data: [] },
      brandUserIds.length > 0
        ? adminClient.from("brands").select("user_id, company_name").in("user_id", brandUserIds)
        : { data: [] },
    ]);

    const modelsByUserId = new Map<string, any>((modelsRes.data || []).map((m: any) => [m.user_id, m]));
    const fansByUserId = new Map<string, any>((fansRes.data || []).map((f: any) => [f.user_id, f]));
    const brandsByUserId = new Map<string, any>((brandsRes.data || []).map((b: any) => [b.user_id, b]));

    function getDisplayName(actor: { type: string; user_id: string }): string {
      if (actor.type === "model") {
        const m = modelsByUserId.get(actor.user_id);
        return m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username || "A model" : "A model";
      }
      if (actor.type === "fan") {
        const f = fansByUserId.get(actor.user_id);
        return f?.display_name || f?.username || "Someone";
      }
      if (actor.type === "brand") {
        const b = brandsByUserId.get(actor.user_id);
        return b?.company_name || "A brand";
      }
      return "Someone";
    }

    function getFirstName(actor: { type: string; user_id: string }): string {
      if (actor.type === "model") {
        const m = modelsByUserId.get(actor.user_id);
        return m?.first_name || m?.username || "there";
      }
      if (actor.type === "fan") {
        const f = fansByUserId.get(actor.user_id);
        return f?.display_name || f?.username || "there";
      }
      if (actor.type === "brand") {
        const b = brandsByUserId.get(actor.user_id);
        return b?.company_name || "there";
      }
      return "there";
    }

    // Get emails via auth admin
    const recipientUserIds = nudgeCandidates
      .map((c) => actorMap.get(c.actorId)?.user_id)
      .filter(Boolean) as string[];

    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const emailMap = new Map<string, string>(
      authUsers?.users
        ?.filter((u: any) => recipientUserIds.includes(u.id))
        .map((u: any) => [u.id, u.email] as [string, string]) || []
    );

    let sentCount = 0;
    const errors: string[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

    for (const candidate of nudgeCandidates) {
      const recipientActor = actorMap.get(candidate.actorId);
      const senderActor = actorMap.get(candidate.senderId);
      if (!recipientActor || !senderActor) continue;

      const email = emailMap.get(recipientActor.user_id);
      if (!email) continue;

      const senderName = getDisplayName(senderActor);
      const recipientFirstName = getFirstName(recipientActor);
      const messagePreview = candidate.latestMessage.content || "(Media message)";
      const timeAgo = Math.round((now.getTime() - new Date(candidate.latestMessage.created_at).getTime()) / (1000 * 60 * 60));
      const conversationUrl = `${baseUrl}/messages?c=${candidate.conversationId}`;

      try {
        await sendUnreadMessageNudgeEmail({
          to: email,
          recipientName: recipientFirstName,
          senderName,
          messagePreview,
          hoursAgo: timeAgo,
          conversationUrl,
        });

        // Mark nudge as sent (both legacy column and new dedup table)
        await Promise.all([
          adminClient
            .from("conversation_participants")
            .update({ nudge_sent_at: now.toISOString() })
            .eq("conversation_id", candidate.conversationId)
            .eq("actor_id", candidate.actorId),
          adminClient
            .from("chat_nudges_sent")
            .upsert({
              conversation_id: candidate.conversationId,
              recipient_id: candidate.actorId,
              nudge_type: "unread_reminder",
              created_at: now.toISOString(),
            }, { onConflict: "conversation_id,recipient_id,nudge_type" }),
        ]);

        sentCount++;
      } catch (err) {
        logger.error("Failed to send nudge", err, { email });
        errors.push(`Failed for actor ${candidate.actorId}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} nudge emails`,
      sent: sentCount,
      candidates: nudgeCandidates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Cron message-nudges error", error);
    return NextResponse.json({ error: "Failed to process nudges" }, { status: 500 });
  }
}
