import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { escapeIlike } from "@/lib/utils";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Admin client for bypassing RLS
const adminClient = createServiceRoleClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check - must be admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      // Get stats using admin client
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: totalConvos },
        { count: totalMsgs },
        { count: flagged },
        { count: activeToday },
      ] = await Promise.all([
        adminClient.from("conversations").select("*", { count: "exact", head: true }),
        adminClient.from("messages").select("*", { count: "exact", head: true }),
        adminClient.from("messages").select("*", { count: "exact", head: true }).eq("is_flagged", true),
        adminClient.from("conversations").select("*", { count: "exact", head: true }).gte("updated_at", today.toISOString()),
      ]);

      return NextResponse.json({
        totalConversations: totalConvos || 0,
        totalMessages: totalMsgs || 0,
        flaggedMessages: flagged || 0,
        activeToday: activeToday || 0,
      });
    }

    if (action === "conversations") {
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "30");
      const search = searchParams.get("search") || "";

      let targetConversationIds: string[] | null = null;

      // If searching, first find matching fans/models
      if (search) {
        const searchPattern = `%${escapeIlike(search)}%`;

        // Search fans by display_name - fans.id IS the actor_id directly
        const { data: matchingFans } = await adminClient
          .from("fans")
          .select("id")
          .ilike("display_name", searchPattern);

        // Search models by first_name or username - need user_id to find actor
        const { data: matchingModels } = await adminClient
          .from("models")
          .select("user_id")
          .or(`first_name.ilike.${searchPattern},username.ilike.${searchPattern}`);

        // For fans, we already have actor_ids directly
        const fanActorIds = (matchingFans || []).map((f: any) => f.id);

        // For models, look up actors by user_id to get actor_ids
        const modelUserIds = (matchingModels || []).map((m: any) => m.user_id).filter(Boolean);
        let modelActorIds: string[] = [];
        if (modelUserIds.length > 0) {
          const { data: modelActors } = await adminClient
            .from("actors")
            .select("id")
            .in("user_id", modelUserIds);
          modelActorIds = (modelActors || []).map((a: any) => a.id);
        }

        const matchingActorIds = [...fanActorIds, ...modelActorIds];

        if (matchingActorIds.length === 0) {
          return NextResponse.json({
            conversations: [],
            totalCount: 0,
          });
        }

        // Find conversations with these actors
        const { data: participantConvos } = await adminClient
          .from("conversation_participants")
          .select("conversation_id")
          .in("actor_id", matchingActorIds);

        targetConversationIds = [...new Set((participantConvos || []).map((p: any) => p.conversation_id))];

        if (targetConversationIds.length === 0) {
          return NextResponse.json({
            conversations: [],
            totalCount: 0,
          });
        }
      }

      // Only show conversations that have at least one message (filter ghost conversations)
      const { data: msgConvoRows } = await adminClient
        .from("messages")
        .select("conversation_id");

      const convoIdsWithMessages = [...new Set((msgConvoRows || []).map((m: any) => m.conversation_id))] as string[];

      // Intersect with search results if applicable
      if (targetConversationIds) {
        const withMsgsSet = new Set(convoIdsWithMessages);
        targetConversationIds = targetConversationIds.filter((id) => withMsgsSet.has(id));
      }

      // Get total count
      let totalCount = 0;
      if (targetConversationIds) {
        totalCount = targetConversationIds.length;
      } else {
        totalCount = convoIdsWithMessages.length;
      }

      if (totalCount === 0) {
        return NextResponse.json({ conversations: [], totalCount: 0 });
      }

      // Get conversations
      let query = adminClient
        .from("conversations")
        .select(`
          id,
          created_at,
          updated_at,
          conversation_participants (
            actor_id
          )
        `)
        .order("updated_at", { ascending: false });

      // Always filter to conversations with messages
      const filterIds = targetConversationIds ?? convoIdsWithMessages;
      query = query.in("id", filterIds);

      const { data: convos, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        console.error("Error loading conversations:", error);
        return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
      }

      // Get participant details
      const actorIds = new Set<string>();
      (convos || []).forEach((c: any) => {
        c.conversation_participants?.forEach((p: any) => {
          actorIds.add(p.actor_id);
        });
      });

      const actorIdArray = Array.from(actorIds);
      const { data: actors } = await adminClient
        .from("actors")
        .select("id, user_id, type")
        .in("id", actorIdArray);

      const actorLookup = new Map((actors || []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((actors || []).map((a: any) => a.user_id).filter(Boolean))];

      // Get fan details - fans.id = actors.id
      const { data: fans } = await adminClient
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", actorIdArray);

      // Get model details - models.user_id = actors.user_id
      const { data: models } = await adminClient
        .from("models")
        .select("user_id, first_name, last_name, username, profile_photo_url")
        .in("user_id", userIds);

      const fanMap = new Map((fans || []).map((f: any) => [f.id, { ...f, type: "fan" }]));
      const modelMap = new Map((models || []).map((m: any) => [m.user_id, { ...m, type: "model" }]));

      // Get last messages
      const convoIds = (convos || []).map((c: any) => c.id);
      const { data: lastMessages } = await adminClient
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      const lastMessageMap = new Map<string, { content: string | null; created_at: string }>();
      (lastMessages || []).forEach((m: any) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, { content: m.content, created_at: m.created_at });
        }
      });

      // Get message counts
      const { data: messageCounts } = await adminClient
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convoIds);

      const messageCountMap = new Map<string, number>();
      (messageCounts || []).forEach((m: any) => {
        messageCountMap.set(m.conversation_id, (messageCountMap.get(m.conversation_id) || 0) + 1);
      });

      // Build enriched conversations
      const enrichedConversations = (convos || []).map((c: any) => {
        const participants = (c.conversation_participants || []).map((p: any) => {
          const actor = actorLookup.get(p.actor_id);
          const userId = actor?.user_id;
          const actorType = actor?.type;

          const fan = fanMap.get(p.actor_id);
          const model = userId ? modelMap.get(userId) : null;

          if (model || actorType === "model") {
            return {
              actor_id: p.actor_id,
              display_name: model?.first_name || model?.username || "Model",
              type: "model",
              avatar_url: model?.profile_photo_url || null,
              username: model?.username || null,
            };
          }
          if (fan || actorType === "fan") {
            return {
              actor_id: p.actor_id,
              display_name: fan?.display_name || "Fan",
              type: "fan",
              avatar_url: fan?.avatar_url || null,
              username: null,
            };
          }
          return {
            actor_id: p.actor_id,
            display_name: actorType === "admin" ? "EXA Team" : "Unknown",
            type: actorType === "admin" ? "model" : "fan",
            avatar_url: null,
            username: null,
          };
        });

        const lastMsg = lastMessageMap.get(c.id);

        return {
          id: c.id,
          created_at: c.created_at,
          updated_at: c.updated_at,
          participants,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || null,
          message_count: messageCountMap.get(c.id) || 0,
        };
      });

      return NextResponse.json({
        conversations: enrichedConversations,
        totalCount,
      });
    }

    if (action === "messages") {
      const conversationId = searchParams.get("conversationId");
      if (!conversationId) {
        return NextResponse.json({ error: "conversationId required" }, { status: 400 });
      }

      const { data: msgs, error } = await adminClient
        .from("messages")
        .select("id, content, created_at, sender_id, sender_type, is_system, is_flagged, flagged_reason, media_type, media_url")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error("Error loading messages:", error);
        return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
      }

      // Get sender details
      const senderIds = [...new Set((msgs || []).map((m: any) => m.sender_id).filter(Boolean))];

      const { data: senderActors } = await adminClient
        .from("actors")
        .select("id, user_id, type")
        .in("id", senderIds);

      const actorLookup = new Map((senderActors || []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((senderActors || []).map((a: any) => a.user_id).filter(Boolean))];

      const { data: fans } = await adminClient
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", senderIds);

      const { data: models } = await adminClient
        .from("models")
        .select("user_id, first_name, username, profile_photo_url")
        .in("user_id", userIds);

      const fanMap = new Map((fans || []).map((f: any) => [f.id, f]));
      const modelMap = new Map((models || []).map((m: any) => [m.user_id, m]));

      const enrichedMessages = (msgs || []).map((m: any) => {
        const actor = actorLookup.get(m.sender_id);
        const userId = actor?.user_id;
        const actorType = actor?.type;

        const fan = fanMap.get(m.sender_id);
        const model = userId ? modelMap.get(userId) : null;

        let senderName = "Unknown";
        let senderAvatar = null;
        let senderType = m.sender_type || actorType;

        if (model || actorType === "model") {
          senderName = model?.first_name || model?.username || "Model";
          senderAvatar = model?.profile_photo_url || null;
          senderType = "model";
        } else if (fan || actorType === "fan") {
          senderName = fan?.display_name || "Fan";
          senderAvatar = fan?.avatar_url || null;
          senderType = "fan";
        } else if (actorType === "admin") {
          senderName = "EXA Team";
          senderType = "admin";
        }

        return {
          id: m.id,
          content: m.content,
          created_at: m.created_at,
          sender_id: m.sender_id,
          sender_type: senderType,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          is_system: m.is_system || false,
          is_flagged: m.is_flagged || false,
          flagged_reason: m.flagged_reason,
          media_type: m.media_type,
          media_url: m.media_url,
        };
      });

      return NextResponse.json({ messages: enrichedMessages });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin messages API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
