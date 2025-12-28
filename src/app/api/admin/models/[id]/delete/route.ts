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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the model's user_id first
    const { data: model, error: modelError } = await (supabase
      .from("models") as any)
      .select("id, user_id")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Delete the model record
    const { error: deleteError } = await (supabase
      .from("models") as any)
      .delete()
      .eq("id", modelId);

    if (deleteError) {
      console.error("Error deleting model:", deleteError);
      throw deleteError;
    }

    // Also delete the actor if it exists
    if (model.user_id) {
      await (supabase
        .from("actors") as any)
        .delete()
        .eq("user_id", model.user_id)
        .eq("type", "model");
    }

    return NextResponse.json({
      success: true,
      message: "Model deleted successfully"
    });
  } catch (error: unknown) {
    console.error("Delete model error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
