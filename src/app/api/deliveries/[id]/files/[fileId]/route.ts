import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// DELETE - Remove a file from a delivery
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: deliveryId, fileId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    // Verify delivery belongs to this model
    const { data: delivery } = await adminClient
      .from("content_deliveries" as any)
      .select("id, model_id")
      .eq("id", deliveryId)
      .maybeSingle() as { data: any };

    if (!delivery || delivery.model_id !== modelId) {
      return NextResponse.json({ error: "Delivery not found or not yours" }, { status: 403 });
    }

    // Get file record
    const { data: file } = await adminClient
      .from("delivery_files" as any)
      .select("id, storage_path, delivery_id")
      .eq("id", fileId)
      .eq("delivery_id", deliveryId)
      .maybeSingle() as { data: any };

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await adminClient.storage
      .from("portfolio")
      .remove([file.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue to delete DB record even if storage fails
    }

    // Delete DB record
    const { error: deleteError } = await adminClient
      .from("delivery_files" as any)
      .delete()
      .eq("id", fileId) as { error: any };

    if (deleteError) {
      console.error("Failed to delete file record:", deleteError);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete delivery file error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
