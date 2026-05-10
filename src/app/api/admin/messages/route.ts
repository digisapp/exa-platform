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
      const offset = (page - 1) * pageSize;

      let convos: Array<{ id: string; created_at: string | null; updated_at: string | null }> = [];
      let totalCount = 0;

      if (search) {
        // Search path: resolve to a (typically small) set of conversation IDs,
        // then page over them in JS. Volume is bounded by search hits.
        const searchPattern = `%${escapeIlike(search)}%`;

        const { data: matchingFans } = await adminClient
          .from("fans")
          .select("id")
          .ilike("display_name", searchPattern);

        const { data: matchingModels } = await adminClient
          .from("models")
          .select("user_id")
          .or(`first_name.ilike.${searchPattern},username.ilike.${searchPattern}`);

        const fanActorIds = (matchingFans || []).map((f: any) => f.id);
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
          return NextResponse.json({ conversations: [], totalCount: 0 });
        }

        const { data: participantConvos } = await adminClient
          .from("conversation_participants")
          .select("conversation_id")
          .in("actor_id", matchingActorIds);

        const candidateIds = [...new Set((participantConvos || []).map((p: any) => p.conversation_id))];
        if (candidateIds.length === 0) {
          return NextResponse.json({ conversations: [], totalCount: 0 });
        }

        // Drop ghosts (conversations with no messages) by intersecting with
        // message rows for just the candidate set (small IN list, safe URL).
        const { data: msgRows } = await adminClient
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", candidateIds);
        const withMsgs = new Set((msgRows || []).map((m: any) => m.conversation_id));
        const filtered = candidateIds.filter((id) => withMsgs.has(id));

        totalCount = filtered.length;
        if (totalCount === 0) {
          return NextResponse.json({ conversations: [], totalCount: 0 });
        }

        // Sort first, then page in JS — search hit counts are bounded so the
        // IN list stays well below the URL limit.
        const { data: convoRows, error } = await adminClient
          .from("conversations")
          .select("id, created_at, updated_at")
          .in("id", filtered)
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Error loading conversations (search):", error);
          return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
        }
        convos = (convoRows || []).slice(offset, offset + pageSize);
      } else {
        // No-search path: a single RPC returns the paged window plus total.
        // Avoids shipping every conversation_id through a PostgREST IN clause,
        // which previously blew past the gateway URL limit and 500'd.
        const { data: rpcRows, error: rpcError } = await adminClient.rpc(
          "admin_list_conversations_with_messages",
          { p_offset: offset, p_limit: pageSize }
        );

        if (rpcError) {
          console.error("Error loading conversations (rpc):", rpcError);
          return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
        }

        const rows = (rpcRows || []) as Array<{
          id: string;
          created_at: string;
          updated_at: string;
          total_count: number;
        }>;
        totalCount = rows[0]?.total_count ? Number(rows[0].total_count) : 0;
        convos = rows.map((r) => ({ id: r.id, created_at: r.created_at, updated_at: r.updated_at }));
      }

      if (convos.length === 0) {
        return NextResponse.json({ conversations: [], totalCount });
      }

      // Pull participants for the page-sized conversation set.
      const pageConvoIds = convos.map((c) => c.id);
      const { data: participantRows } = await adminClient
        .from("conversation_participants")
        .select("conversation_id, actor_id")
        .in("conversation_id", pageConvoIds);

      const participantsByConvo = new Map<string, string[]>();
      (participantRows || []).forEach((p: any) => {
        const arr = participantsByConvo.get(p.conversation_id) || [];
        arr.push(p.actor_id);
        participantsByConvo.set(p.conversation_id, arr);
      });

      const actorIdArray = [...new Set([...participantsByConvo.values()].flat())];
      const { data: actors } = await adminClient
        .from("actors")
        .select("id, user_id, type")
        .in("id", actorIdArray);

      const actorLookup = new Map((actors || []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((actors || []).map((a: any) => a.user_id).filter(Boolean))];

      const { data: fans } = await adminClient
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", actorIdArray);

      const { data: models } = await adminClient
        .from("models")
        .select("user_id, first_name, last_name, username, profile_photo_url")
        .in("user_id", userIds);

      const fanMap = new Map((fans || []).map((f: any) => [f.id, { ...f, type: "fan" }]));
      const modelMap = new Map((models || []).map((m: any) => [m.user_id, { ...m, type: "model" }]));

      const { data: lastMessages } = await adminClient
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", pageConvoIds)
        .order("created_at", { ascending: false });

      const lastMessageMap = new Map<string, { content: string | null; created_at: string }>();
      (lastMessages || []).forEach((m: any) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, { content: m.content, created_at: m.created_at });
        }
      });

      const { data: messageCounts } = await adminClient
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", pageConvoIds);

      const messageCountMap = new Map<string, number>();
      (messageCounts || []).forEach((m: any) => {
        messageCountMap.set(m.conversation_id, (messageCountMap.get(m.conversation_id) || 0) + 1);
      });

      const enrichedConversations = convos.map((c) => {
        const participantActorIds = participantsByConvo.get(c.id) || [];
        const participants = participantActorIds.map((actorId) => {
          const actor = actorLookup.get(actorId);
          const userId = actor?.user_id;
          const actorType = actor?.type;

          const fan = fanMap.get(actorId);
          const model = userId ? modelMap.get(userId) : null;

          if (model || actorType === "model") {
            return {
              actor_id: actorId,
              display_name: model?.first_name || model?.username || "Model",
              type: "model",
              avatar_url: model?.profile_photo_url || null,
              username: model?.username || null,
            };
          }
          if (fan || actorType === "fan") {
            return {
              actor_id: actorId,
              display_name: fan?.display_name || "Fan",
              type: "fan",
              avatar_url: fan?.avatar_url || null,
              username: null,
            };
          }
          return {
            actor_id: actorId,
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
