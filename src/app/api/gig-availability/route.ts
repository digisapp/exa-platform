import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const saveSchema = z.object({
  gig_id: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(31),
});

// GET /api/gig-availability?gig_id=X — model's own saved dates
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gig_id = request.nextUrl.searchParams.get("gig_id");
  if (!gig_id) return NextResponse.json({ error: "gig_id required" }, { status: 400 });

  const { data: model } = await (supabase.from("models") as any)
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!model) return NextResponse.json({ error: "Not a model" }, { status: 403 });

  const adminClient = createServiceRoleClient();
  const { data } = await (adminClient as any).from("gig_availability")
    .select("available_date")
    .eq("gig_id", gig_id)
    .eq("model_id", model.id);

  return NextResponse.json({ dates: (data || []).map((r: any) => r.available_date) });
}

// POST /api/gig-availability — replace model's availability for a gig
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { gig_id, dates } = parsed.data;

  const { data: model } = await (supabase.from("models") as any)
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!model) return NextResponse.json({ error: "Not a model" }, { status: 403 });

  // Confirm model has an accepted application for this gig
  const { data: app } = await (supabase.from("gig_applications") as any)
    .select("id")
    .eq("gig_id", gig_id)
    .eq("model_id", model.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "Not confirmed for this gig" }, { status: 403 });

  const adminClient = createServiceRoleClient();

  // Delete all existing, then insert new selection
  await (adminClient as any).from("gig_availability")
    .delete()
    .eq("gig_id", gig_id)
    .eq("model_id", model.id);

  if (dates.length > 0) {
    const rows = dates.map((d) => ({ gig_id, model_id: model.id, available_date: d }));
    const { error } = await (adminClient as any).from("gig_availability").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
