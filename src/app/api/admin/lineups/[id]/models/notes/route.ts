import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";

// PATCH /api/admin/lineups/[id]/models/notes — update outfit notes
// [id] is the designer_entry_id. Identify the row by row_id (preferred) or model_id.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_id, row_id, outfit_notes } = body as {
    model_id?: string;
    row_id?: string;
    outfit_notes: string;
  };

  if (!model_id && !row_id) {
    return NextResponse.json({ error: "row_id or model_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  let query = supabase
    .from("event_show_models")
    .update({ outfit_notes: outfit_notes || null })
    .eq("designer_entry_id", designerEntryId);

  if (row_id) query = query.eq("id", row_id);
  else query = query.eq("model_id", model_id!);

  const { error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
