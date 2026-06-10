import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: actor } = await supabase
    .from("actors").select("type").eq("user_id", user.id).single();
  if (actor?.type !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

// PATCH /api/admin/rosters/[id] — update fields, revoke/un-revoke
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;

  let body: { title?: string; client_name?: string; note?: string; revoked?: boolean; expires_at?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.client_name === "string") update.client_name = body.client_name.trim() || null;
  if (typeof body.note === "string") update.note = body.note.trim() || null;
  if (typeof body.revoked === "boolean") update.revoked_at = body.revoked ? new Date().toISOString() : null;
  if (body.expires_at !== undefined) update.expires_at = body.expires_at;

  const admin = createServiceRoleClient() as any;
  const { error } = await admin.from("model_rosters").update(update).eq("id", id);
  if (error) {
    console.error("Update roster error:", error);
    return NextResponse.json({ error: "Failed to update roster" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/rosters/[id] — permanently delete (cascades to roster_models)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;

  const admin = createServiceRoleClient() as any;
  const { error } = await admin.from("model_rosters").delete().eq("id", id);
  if (error) {
    console.error("Delete roster error:", error);
    return NextResponse.json({ error: "Failed to delete roster" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
