import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: actor } = await supabase
    .from("actors").select("type").eq("user_id", user.id).single();
  if (actor?.type !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

// URL-safe, unguessable token (16 chars from a 12-byte random buffer)
function generateToken() {
  return randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

// POST /api/admin/rosters — create a roster from selected model ids
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: { title?: string; client_name?: string; note?: string; model_ids?: string[]; expires_at?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const modelIds = Array.isArray(body.model_ids) ? [...new Set(body.model_ids.filter(Boolean))] : [];

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (modelIds.length === 0) return NextResponse.json({ error: "Select at least one model" }, { status: 400 });

  // Cast to any: model_rosters / roster_models are newer than the generated DB types.
  const admin = createServiceRoleClient() as any;
  const shareToken = generateToken();

  const { data: roster, error } = await admin
    .from("model_rosters")
    .insert({
      share_token: shareToken,
      title,
      client_name: (body.client_name || "").trim() || null,
      note: (body.note || "").trim() || null,
      created_by: auth.user.id,
      expires_at: body.expires_at || null,
    })
    .select("id, share_token")
    .single();

  if (error || !roster) {
    console.error("Create roster error:", error);
    return NextResponse.json({ error: "Failed to create roster" }, { status: 500 });
  }

  const rows = modelIds.map((model_id: string, i: number) => ({ roster_id: roster.id, model_id, position: i }));
  const { error: linkError } = await admin.from("roster_models").insert(rows);
  if (linkError) {
    // Roll back the roster so we don't leave an empty one behind
    await admin.from("model_rosters").delete().eq("id", roster.id);
    console.error("Link roster models error:", linkError);
    return NextResponse.json({ error: "Failed to add models to roster" }, { status: 500 });
  }

  return NextResponse.json({ id: roster.id, share_token: roster.share_token, model_count: modelIds.length });
}

// GET /api/admin/rosters — list all rosters with model counts
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const admin = createServiceRoleClient() as any;
  const { data: rosters, error } = await admin
    .from("model_rosters")
    .select("id, share_token, title, client_name, note, view_count, expires_at, revoked_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List rosters error:", error);
    return NextResponse.json({ error: "Failed to load rosters" }, { status: 500 });
  }

  // Attach model counts in one query
  const ids = (rosters || []).map((r: any) => r.id);
  const countMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: links } = await admin.from("roster_models").select("roster_id").in("roster_id", ids);
    (links || []).forEach((l: { roster_id: string }) => {
      countMap.set(l.roster_id, (countMap.get(l.roster_id) || 0) + 1);
    });
  }

  const enriched = (rosters || []).map((r: any) => ({ ...r, model_count: countMap.get(r.id) || 0 }));
  return NextResponse.json({ rosters: enriched });
}
