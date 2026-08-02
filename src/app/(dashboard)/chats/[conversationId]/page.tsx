import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect, notFound } from "next/navigation";
import { ChatView, type ChatParticipantFan } from "@/components/chat/ChatView";
import type { ChatParticipantModel } from "@/components/chat/ChatHeader";
import type { Message, Actor, Model, Fan, Brand } from "@/types/database";
import { stripLockedMediaUrl } from "@/lib/ppv";
import { getVisitDates, isRegularVisitor } from "@/lib/attendance";
import { signChatMediaUrls } from "@/lib/chat-media";

// Admin client for fetching participant data (bypasses RLS)
const adminClient = createServiceRoleClient();

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get current actor
  const { data: actor } = (await supabase
    .from("actors")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: Actor | null };

  if (!actor) redirect("/fan/signup");

  // Get current model or fan data (for coin balance)
  let currentModel: Model | null = null;
  let currentFan: Fan | null = null;

  if (actor.type === "model" || actor.type === "admin") {
    // Models are linked via user_id, not actor.id
    const { data } = (await supabase
      .from("models")
      .select("*")
      .eq("user_id", user.id)
      .single()) as { data: Model | null };
    currentModel = data;
  } else if (actor.type === "fan") {
    // Fans use actor.id as their id
    const { data } = (await supabase
      .from("fans")
      .select("*")
      .eq("id", actor.id)
      .single()) as { data: Fan | null };
    currentFan = data;
  }

  // Get conversation - use maybeSingle to handle not found gracefully
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) {
    console.error("[ChatPage] Conversation lookup error:", convError);
    notFound();
  }

  if (!conversation) {
    notFound();
  }

  // Verify user is a participant - use maybeSingle to avoid throwing on 0 rows
  const { data: participation, error: participationError } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("actor_id", actor.id)
    .maybeSingle();

  if (participationError) {
    console.error("[ChatPage] Participation check error:", participationError);
  }

  if (!participation) {
    console.error("[ChatPage] User not a participant:", { conversationId, actorId: actor.id });
    redirect("/chats");
  }

  // Get messages (fetch 101 to check if there are more).
  // Uses the service client with an explicit column list: clients can no
  // longer SELECT messages.media_url at all (column grants, migration
  // 20260711100005), so the user-scoped client can't serve this read. Safe
  // because the participant check above already ran, and locked media is
  // stripped per-viewer below before anything reaches the RSC payload.
  const { data: allMessages } = (await adminClient
    .from("messages")
    .select(
      "id, conversation_id, sender_id, sender_type, recipient_id, recipient_instagram, content, media_url, media_type, media_price, media_viewed_by, media_thumbnail_url, media_duration, media_expires_at, media_file_size, media_view_mode, is_system, is_flagged, flagged_reason, flagged_at, flagged_by, read_at, reply_to_id, transaction_id, edited_at, edit_count, deleted_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(101)) as { data: Message[] | null };

  // Check if there are more messages and prepare the list
  const hasMoreMessages = (allMessages?.length || 0) > 100;
  const messages = await signChatMediaUrls(
    adminClient,
    (allMessages
      ? (hasMoreMessages ? allMessages.slice(0, 100) : allMessages).reverse()
      : []
    ).map((msg: Message) =>
      // Strip media_url from locked PPV messages so it never reaches the client
      // RSC payload — the media_price/media_viewed_by fields stay so the bubble
      // can still render the unlock overlay. Mirrors /api/messages/list. Then
      // (strip FIRST, sign second) chat-media storage paths become short-lived
      // signed URLs (src/lib/chat-media.ts).
      stripLockedMediaUrl(msg, actor.id)
    )
  );

  // Get other participant(s)
  const { data: participants, error: partError } = await supabase
    .from("conversation_participants")
    .select("actor_id")
    .eq("conversation_id", conversationId)
    .neq("actor_id", actor.id);

  if (partError) {
    console.error("[ChatPage] Error fetching participants:", partError);
  }

  // Guard: must have other participants
  if (!participants?.length) {
    console.error("[ChatPage] No other participants found:", conversationId);
    redirect("/chats");
  }

  // Get model info for other participant
  let otherParticipant = null;
  if (participants.length > 0) {
    const otherActorId = participants[0].actor_id;

    // Get the other actor's details
    const { data: otherActor } = await supabase
      .from("actors")
      .select("id, type, user_id")
      .eq("id", otherActorId)
      .maybeSingle();

    if (!otherActor) {
      redirect("/chats");
    }

    if (otherActor) {
      // Get model/fan/brand data based on actor type.
      // Both selects are deliberately narrowed to the columns the chat UI
      // consumes: full rows serialize into the client RSC payload, which
      // leaked fan PII (email/phone/coin_balance/flag reasons) to models and
      // model real names (first_name/last_name — admin-only per
      // src/lib/model-display.ts) to fans.
      let otherModel: ChatParticipantModel | null = null;
      let otherFan: ChatParticipantFan | null = null;
      let otherBrand: Brand | null = null;

      if (otherActor.type === "model" && otherActor.user_id) {
        // Models use user_id to lookup. video_is_online + available_for_calls
        // drive the chat header's call-CTA gating (same reachability signal
        // as /api/calls/start). Cast: available_for_calls is newer than the
        // generated DB types.
        const { data } = await (supabase.from("models") as any)
          .select("id, username, profile_photo_url, last_active_at, message_rate, voice_call_rate, video_call_rate, video_is_online, available_for_calls")
          .eq("user_id", otherActor.user_id)
          .maybeSingle();
        otherModel = data as ChatParticipantModel | null;
      } else if (otherActor.type === "fan") {
        // Fans use actor.id as their id (use admin client to bypass RLS)
        const { data } = await adminClient
          .from("fans")
          .select("id, username, display_name, avatar_url, last_active_at, lifetime_spend_coins")
          .eq("id", otherActorId)
          .maybeSingle() as { data: ChatParticipantFan | null };
        otherFan = data;

        // "Regular" chip for the model: binary flag only — the model never
        // sees day counts or visit patterns, just that this fan shows up
        // often (>= 4 distinct days in the last 14, from profile_views).
        if (otherFan && currentModel?.id && otherActor.user_id) {
          const visitDates = await getVisitDates(adminClient, {
            modelId: currentModel.id,
            viewerUserId: otherActor.user_id,
          });
          otherFan = { ...otherFan, is_regular: isRegularVisitor(visitDates) };
        }
      } else if (otherActor.type === "brand") {
        // Brands use actor.id as their id
        const { data } = await (supabase
          .from("brands") as any)
          .select("*")
          .eq("id", otherActorId)
          .maybeSingle() as { data: Brand | null };
        otherBrand = data;
      }

      otherParticipant = {
        actor_id: otherActorId,
        actor: otherActor as Actor,
        model: otherModel,
        fan: otherFan,
        brand: otherBrand,
      };
    }
  }

  if (!otherParticipant) {
    console.error("[ChatPage] No other participant found for conversation:", conversationId);
    redirect("/chats");
  }

  return (
    <ChatView
      conversation={conversation}
      initialMessages={messages}
      currentActor={actor}
      currentModel={currentModel}
      currentFan={currentFan}
      otherParticipant={otherParticipant}
      hasMoreMessages={hasMoreMessages}
    />
  );
}
