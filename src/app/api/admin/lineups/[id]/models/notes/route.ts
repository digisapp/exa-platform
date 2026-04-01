import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// PATCH /api/admin/lineups/[id]/models/notes — update outfit notes
// [id] is the designer_entry_id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_id, outfit_notes } = body as { model_id: string; outfit_notes: string };

  if (!model_id) {
    return NextResponse.json({ error: "model_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { error } = await supabase
    .from("event_show_models")
    .update({ outfit_notes: outfit_notes || null })
    .eq("designer_entry_id", designerEntryId)
    .eq("model_id", model_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
