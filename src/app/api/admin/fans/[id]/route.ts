import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// PATCH - Update fan (suspend/unsuspend)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { is_suspended } = body;

    const { error } = await (supabase
      .from("fans") as any)
      .update({ is_suspended, updated_at: new Date().toISOString() })
      .eq("id", fanId);

    if (error) {
      console.error("Error updating fan:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Update fan error:", error);
    const message = error instanceof Error ? error.message : "Failed to update fan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete fan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the fan's user_id first
    const { data: fan, error: fanError } = await (supabase
      .from("fans") as any)
      .select("id, user_id")
      .eq("id", fanId)
      .single();

    if (fanError || !fan) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    // Delete the fan record
    const { error: deleteError } = await (supabase
      .from("fans") as any)
      .delete()
      .eq("id", fanId);

    if (deleteError) {
      console.error("Error deleting fan:", deleteError);
      throw deleteError;
    }

    // Also delete the actor if it exists
    if (fan.user_id) {
      await (supabase
        .from("actors") as any)
        .delete()
        .eq("user_id", fan.user_id)
        .eq("type", "fan");
    }

    return NextResponse.json({
      success: true,
      message: "Fan deleted successfully"
    });
  } catch (error: unknown) {
    console.error("Delete fan error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete fan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
