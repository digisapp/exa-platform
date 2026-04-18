import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/flyers/templates — list all saved templates
 * POST /api/admin/flyers/templates — save a new template
 * DELETE /api/admin/flyers/templates?id=xxx — delete a template
 * PUT /api/admin/flyers/templates — update a template
 */

async function checkAdmin(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: actor } = await (supabase.from("actors") as any)
    .select("type").eq("user_id", user.id).single();
  if (!actor || actor.type !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createServiceRoleClient();
  const { data, error } = await (admin.from("flyer_templates" as any) as any)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, settings } = await request.json();
  if (!name || !settings)
    return NextResponse.json({ error: "name and settings required" }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data, error } = await (admin.from("flyer_templates" as any) as any)
    .insert({ name, settings })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, settings } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createServiceRoleClient();
  const update: any = { updated_at: new Date().toISOString() };
  if (name) update.name = name;
  if (settings) update.settings = settings;

  const { error } = await (admin.from("flyer_templates" as any) as any)
    .update(update).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createServiceRoleClient();
  await (admin.from("flyer_templates" as any) as any).delete().eq("id", id);
  return NextResponse.json({ success: true });
}
