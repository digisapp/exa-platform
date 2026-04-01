import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// PATCH /api/admin/lineups/[id]/models/notes — update outfit notes for a model
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lineupId } = await params;
  const body = await req.json();
  const { model_id, outfit_notes } = body as { model_id: string; outfit_notes: string };

  if (!model_id) {
    return NextResponse.json({ error: "model_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { error } = await supabase
    .from("show_lineup_models")
    .update({ outfit_notes: outfit_notes || null })
    .eq("lineup_id", lineupId)
    .eq("model_id", model_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
