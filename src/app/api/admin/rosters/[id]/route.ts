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

const MODEL_FIELDS =
  "id, username, first_name, last_name, profile_photo_url, state, height, hair_color, is_verified, instagram_name, instagram_followers";

// GET /api/admin/rosters/[id] — roster meta + its models in display order
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;

  const admin = createServiceRoleClient() as any;
  const { data: roster, error } = await admin
    .from("model_rosters")
    .select("id, share_token, title, client_name, note, view_count, expires_at, revoked_at, created_at")
    .eq("id", id)
    .single();
  if (error || !roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }

  const { data: links } = await admin
    .from("roster_models")
    .select("model_id, position")
    .eq("roster_id", id)
    .order("position", { ascending: true });

  const orderedIds: string[] = (links || []).map((l: { model_id: string }) => l.model_id);
  let models: any[] = [];
  if (orderedIds.length > 0) {
    const { data: rows } = await admin.from("models").select(MODEL_FIELDS).in("id", orderedIds);
    const byId = new Map<string, any>((rows || []).map((m: any) => [m.id, m]));
    models = orderedIds.map((mid) => byId.get(mid)).filter(Boolean);
  }

  return NextResponse.json({ roster, models });
}

// PATCH /api/admin/rosters/[id] — update fields, revoke/un-revoke, and/or replace membership
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;

  let body: {
    title?: string; client_name?: string; note?: string;
    revoked?: boolean; expires_at?: string | null; model_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createServiceRoleClient() as any;

  // Metadata update
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    update.title = t;
  }
  if (typeof body.client_name === "string") update.client_name = body.client_name.trim() || null;
  if (typeof body.note === "string") update.note = body.note.trim() || null;
  if (typeof body.revoked === "boolean") update.revoked_at = body.revoked ? new Date().toISOString() : null;
  if (body.expires_at !== undefined) update.expires_at = body.expires_at;

  const { error } = await admin.from("model_rosters").update(update).eq("id", id);
  if (error) {
    console.error("Update roster error:", error);
    return NextResponse.json({ error: "Failed to update roster" }, { status: 500 });
  }

  // Membership replacement (ordered) — only when model_ids is provided.
  // Non-destructive: upsert the new set FIRST (so a failure never empties the
  // roster), then delete only the models that are no longer present.
  if (Array.isArray(body.model_ids)) {
    const ids = [...new Set(body.model_ids.filter(Boolean))];
    if (ids.length === 0) {
      return NextResponse.json({ error: "A roster must contain at least one model" }, { status: 400 });
    }

    const rows = ids.map((model_id, i) => ({ roster_id: id, model_id, position: i }));
    const { error: upErr } = await admin
      .from("roster_models")
      .upsert(rows, { onConflict: "roster_id,model_id" });
    if (upErr) {
      // Roster is still intact at this point — nothing was removed.
      console.error("Upsert roster members error:", upErr);
      return NextResponse.json({ error: "Failed to update models" }, { status: 500 });
    }

    const { data: current } = await admin
      .from("roster_models").select("model_id").eq("roster_id", id);
    const keep = new Set(ids);
    const toDelete = (current || [])
      .map((r: { model_id: string }) => r.model_id)
      .filter((mid: string) => !keep.has(mid));

    // Chunk deletes to keep the IN(...) filter well under URL length limits.
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error: delErr } = await admin
        .from("roster_models").delete().eq("roster_id", id).in("model_id", batch);
      if (delErr) {
        console.error("Prune roster members error:", delErr);
        return NextResponse.json({ error: "Failed to update models" }, { status: 500 });
      }
    }
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
