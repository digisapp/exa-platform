import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/flyers/templates — list all saved templates
 * POST /api/admin/flyers/templates — save a new template
 * DELETE /api/admin/flyers/templates?id=xxx — delete a template
 * PUT /api/admin/flyers/templates — update a template
 */

export const GET = withAuth(
  async () => {
    const admin = createServiceRoleClient();
    const { data, error } = await (admin.from("flyer_templates" as any) as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data || [] });
  },
  { requireType: "admin" }
);

export const POST = withAuth(
  async ({ request }) => {
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
  },
  { requireType: "admin" }
);

export const PUT = withAuth(
  async ({ request }) => {
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
  },
  { requireType: "admin" }
);

export const DELETE = withAuth(
  async ({ request }) => {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createServiceRoleClient();
    await (admin.from("flyer_templates" as any) as any).delete().eq("id", id);
    return NextResponse.json({ success: true });
  },
  { requireType: "admin" }
);
