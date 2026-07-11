import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

    // Verify admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Get the model to restore
    // Cast to any since deleted_at/purged_at are new columns not yet in generated types
    const { data: model } = await serviceClient
      .from("models")
      .select("id, user_id, deleted_at, deleted_reason, purged_at")
      .eq("id", modelId)
      .single() as { data: { id: string; user_id: string | null; deleted_at: string | null; deleted_reason: string | null; purged_at: string | null } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (!model.deleted_at) {
      return NextResponse.json({ error: "Model is not deleted" }, { status: 400 });
    }

    if (model.purged_at) {
      return NextResponse.json({ error: "Model data has been purged and cannot be restored" }, { status: 400 });
    }

    // A model soft-deleted by model→fan conversion must not be restored: the
    // account now lives as an active fan (actor type 'fan', balance moved to
    // the fan wallet), and resurrecting the model row would leave an approved
    // model attached to a fan actor. Convert the fan back to a model instead.
    if (model.deleted_reason === "converted_to_fan") {
      return NextResponse.json(
        { error: "This model was converted to a fan account. Use fan-to-model conversion to bring them back instead of restoring." },
        { status: 409 }
      );
    }

    // Restore model
    const { error: modelError } = await (serviceClient
      .from("models") as any)
      .update({
        deleted_at: null,
        deleted_reason: null,
        is_approved: true,
      })
      .eq("id", modelId);

    if (modelError) throw modelError;

    // Reactivate actor
    if (model.user_id) {
      await (serviceClient
        .from("actors") as any)
        .update({ deactivated_at: null })
        .eq("user_id", model.user_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore model error:", error);
    return NextResponse.json({ error: "Failed to restore model" }, { status: 500 });
  }
}
