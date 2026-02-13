import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// DELETE - Remove a file from a library item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: itemId, fileId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get file record
    const { data: file } = await adminClient.from("content_library_files" as any)
      .select("id, storage_path, library_item_id")
      .eq("id", fileId)
      .eq("library_item_id", itemId)
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
    }

    // Delete DB record
    const { error: deleteError } = await adminClient.from("content_library_files" as any)
      .delete()
      .eq("id", fileId) as { error: any };

    if (deleteError) {
      console.error("Failed to delete file record:", deleteError);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete library file error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
