import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/models/search - Search approved models
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  let dbQuery = supabase
    .from("models")
    .select("id, username, first_name, last_name, profile_photo_url, city, state")
    .eq("is_approved", true);

  if (query.trim()) {
    dbQuery = dbQuery.or(
      `username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
    );
  }

  dbQuery = dbQuery.order("first_name", { ascending: true }).limit(limit);

  const { data: models, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ models: models || [] });
}
