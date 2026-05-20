import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/gig-availability?gig_id=X
// Returns all confirmed models + their available dates for a gig
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();
  if (!actor || actor.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gig_id = request.nextUrl.searchParams.get("gig_id");
  if (!gig_id) return NextResponse.json({ error: "gig_id required" }, { status: 400 });

  const adminClient = createServiceRoleClient();

  // All accepted applications for this gig
  const { data: apps } = await (adminClient.from("gig_applications") as any)
    .select("model_id")
    .eq("gig_id", gig_id)
    .eq("status", "accepted");

  if (!apps || apps.length === 0) return NextResponse.json({ models: [] });

  const modelIds: string[] = apps.map((a: any) => a.model_id);

  // Fetch model details + their availability in parallel
  const [{ data: models }, { data: availability }] = await Promise.all([
    (adminClient.from("models") as any)
      .select("id, first_name, last_name, username, profile_photo_url")
      .in("id", modelIds)
      .order("first_name", { ascending: true }),
    (adminClient as any).from("gig_availability")
      .select("model_id, available_date")
      .eq("gig_id", gig_id)
      .in("model_id", modelIds),
  ]);

  // Group availability by model
  const availMap: Record<string, string[]> = {};
  for (const row of availability || []) {
    if (!availMap[row.model_id]) availMap[row.model_id] = [];
    availMap[row.model_id].push(row.available_date);
  }

  const respondedIds = new Set(Object.keys(availMap));

  const result = (models || []).map((m: any) => ({
    id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    username: m.username,
    profile_photo_url: m.profile_photo_url,
    available_dates: availMap[m.id] || [],
    has_responded: respondedIds.has(m.id),
  }));

  return NextResponse.json({ models: result, total: result.length, responded: respondedIds.size });
}

// POST /api/admin/gig-availability
// Admin override: toggle a single (gig, model, date) availability cell.
// Body: { gig_id, model_id, date, available }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();
  if (!actor || actor.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const gig_id: string | undefined = body?.gig_id;
  const model_id: string | undefined = body?.model_id;
  const date: string | undefined = body?.date;
  const available: boolean = !!body?.available;

  if (!gig_id || !model_id || !date) {
    return NextResponse.json({ error: "gig_id, model_id, and date are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const adminClient = createServiceRoleClient();

  if (available) {
    const { error } = await (adminClient.from("gig_availability") as any)
      .upsert(
        { gig_id, model_id, available_date: date },
        { onConflict: "gig_id,model_id,available_date" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await (adminClient.from("gig_availability") as any)
      .delete()
      .eq("gig_id", gig_id)
      .eq("model_id", model_id)
      .eq("available_date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
