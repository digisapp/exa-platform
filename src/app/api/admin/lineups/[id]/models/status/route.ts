import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const VALID_STATUSES = ["not_arrived", "arrived", "hair_makeup", "dressed", "on_deck", "done"];

// PATCH /api/admin/lineups/[id]/models/status — update check_in_status for a model across all their slots in this show
// [id] = show_id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params;
  const body = await req.json();
  const { model_id, check_in_status } = body;

  if (!model_id || !VALID_STATUSES.includes(check_in_status)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  // Get all designer entries for this show
  const { data: designers, error: dErr } = await supabase
    .from("event_show_designers")
    .select("id")
    .eq("show_id", showId);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const designerIds = (designers || []).map((d: any) => d.id);
  if (!designerIds.length) return NextResponse.json({ success: true });

  // Update all rows for this model in this show
  const { error } = await supabase
    .from("event_show_models")
    .update({ check_in_status })
    .eq("model_id", model_id)
    .in("designer_entry_id", designerIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
