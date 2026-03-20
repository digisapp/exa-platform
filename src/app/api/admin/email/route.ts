import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/email?direction=inbound|outbound&page=1&limit=20&search=...
 * List emails for admin inbox/sent view
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") || "inbound";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = (supabase.from("emails" as any) as any)
    .select("*", { count: "exact" })
    .eq("direction", direction)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`from_email.ilike.%${search}%,to_email.ilike.%${search}%,subject.ilike.%${search}%,from_name.ilike.%${search}%`);
  }

  const { data: emails, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ emails: emails || [], total: count || 0, page, limit });
}

/**
 * PATCH /api/admin/email
 * Mark email as read
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { emailId } = await request.json();
  if (!emailId) {
    return NextResponse.json({ error: "emailId required" }, { status: 400 });
  }

  const { error } = await (supabase.from("emails" as any) as any)
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", emailId)
    .eq("status", "received");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
