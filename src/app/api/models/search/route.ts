import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET /api/models/search - Search approved models with pagination
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rateLimitResponse = await checkEndpointRateLimit(request, "search", user.id);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const cursor = url.searchParams.get("cursor"); // For cursor-based pagination

  let dbQuery = supabase
    .from("models")
    .select("id, username, first_name, last_name, profile_photo_url, city, state", { count: "exact" })
    .eq("is_approved", true);

  if (query.trim()) {
    // Escape special characters for safe pattern matching
    const escapedQuery = query.replace(/[%_]/g, "\\$&");
    dbQuery = dbQuery.or(
      `username.ilike.%${escapedQuery}%,first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%`
    );
  }

  // Apply cursor-based pagination if cursor is provided
  if (cursor) {
    dbQuery = dbQuery.gt("id", cursor);
  }

  dbQuery = dbQuery
    .order("first_name", { ascending: true })
    .order("id", { ascending: true }) // Secondary sort for stable cursor
    .range(offset, offset + limit - 1);

  const { data: models, error, count } = await dbQuery as {
    data: { id: string; username: string; first_name: string; last_name: string; profile_photo_url: string; city: string; state: string }[] | null;
    error: any;
    count: number | null;
  };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = models || [];
  const hasMore = results.length === limit;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

  return NextResponse.json({
    models: results,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore,
      nextCursor,
    },
  });
}
