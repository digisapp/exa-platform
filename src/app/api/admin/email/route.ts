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
  const threadId = searchParams.get("thread_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  // Thread view: fetch all emails in a conversation
  if (threadId) {
    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(threadId)) {
      return NextResponse.json({ error: "Invalid thread_id" }, { status: 400 });
    }

    const { data: threadEmails, error: threadError } = await (supabase.from("emails" as any) as any)
      .select("*")
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .order("created_at", { ascending: true });

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }
    return NextResponse.json({ emails: threadEmails || [], total: threadEmails?.length || 0, page: 1, limit: 100 });
  }

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
 * Mark email(s) as read — supports single emailId or array of emailIds
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

  const body = await request.json();
  const ids: string[] = body.emailIds || (body.emailId ? [body.emailId] : []);

  if (ids.length === 0) {
    return NextResponse.json({ error: "emailId or emailIds required" }, { status: 400 });
  }

  const { error } = await (supabase.from("emails" as any) as any)
    .update({ status: "read", read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "received");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/email
 * Delete email(s) — supports single emailId or array of emailIds
 */
export async function DELETE(request: NextRequest) {
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

  const body = await request.json();
  const ids: string[] = body.emailIds || (body.emailId ? [body.emailId] : []);

  if (ids.length === 0) {
    return NextResponse.json({ error: "emailId or emailIds required" }, { status: 400 });
  }

  // Clear thread_id references first (so child emails don't break)
  await (supabase.from("emails" as any) as any)
    .update({ thread_id: null })
    .in("thread_id", ids);

  const { error } = await (supabase.from("emails" as any) as any)
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
