import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  conversationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.safeParse({
      q: searchParams.get("q") || undefined,
      conversationId: searchParams.get("conversationId") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { q, conversationId, limit, offset } = parsed.data;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Get all conversation IDs the user participates in
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", actor.id);

    if (!participations || participations.length === 0) {
      return NextResponse.json({ messages: [], total: 0 });
    }

    const userConvIds = participations.map(p => p.conversation_id);

    // If searching within a specific conversation, verify access
    if (conversationId && !userConvIds.includes(conversationId)) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const targetConvIds = conversationId ? [conversationId] : userConvIds;

    // Full-text search using Postgres ts_query
    // Convert user query to tsquery format (split words, join with &)
    const tsQuery = q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean)
      .join(" & ");

    if (!tsQuery) {
      return NextResponse.json({ messages: [], total: 0 });
    }

    // Use RPC for full-text search since Supabase JS doesn't support textSearch with to_tsquery directly
    // Fall back to ilike for simple queries
    const query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_type, created_at, reply_to_id", { count: "exact" })
      .in("conversation_id", targetConvIds)
      .is("deleted_at", null)
      .not("content", "is", null)
      .ilike("content", `%${q.replace(/[%_]/g, "\\$&").trim()}%`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: messages, count, error } = await query;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    return NextResponse.json({
      messages: messages || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
