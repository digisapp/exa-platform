import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { z } from "zod";

const pickSchema = z.object({
  model_id: z.string().uuid(),
  event_id: z.string().uuid(),
});

async function getBrandId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };
  if (!actor || actor.type !== "brand") return null;
  return actor.id;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const brandId = await getBrandId(supabase);
  if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data, error } = await (supabase as any)
    .from("msw_casting_picks")
    .select("model_id")
    .eq("brand_id", brandId)
    .eq("event_id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ picks: (data || []).map((r: { model_id: string }) => r.model_id) });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const brandId = await getBrandId(supabase);
  if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = pickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { model_id, event_id } = parsed.data;

  const admin = createServiceRoleClient();

  // Verify model has the event badge (i.e. is confirmed for this event)
  const { data: eventBadge } = await admin
    .from("badges")
    .select("id")
    .eq("event_id", event_id)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .maybeSingle() as { data: { id: string } | null };

  if (eventBadge) {
    const { data: badgeEntry } = await admin
      .from("model_badges")
      .select("model_id")
      .eq("badge_id", eventBadge.id)
      .eq("model_id", model_id)
      .maybeSingle() as { data: { model_id: string } | null };
    if (!badgeEntry) return NextResponse.json({ error: "Model not confirmed for this event" }, { status: 400 });
  }

  const { error } = await (admin as any)
    .from("msw_casting_picks")
    .insert({ brand_id: brandId, model_id, event_id });

  if (error?.code === "23505") return NextResponse.json({ ok: true, note: "already picked" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const brandId = await getBrandId(supabase);
  if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = pickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { model_id, event_id } = parsed.data;

  const admin = createServiceRoleClient();
  const { error } = await (admin as any)
    .from("msw_casting_picks")
    .delete()
    .eq("brand_id", brandId)
    .eq("model_id", model_id)
    .eq("event_id", event_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
