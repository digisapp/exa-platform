import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

// DELETE - Remove a file from a library item
export const DELETE = withAuth<{ id: string; fileId: string }>(
  async ({ params }) => {
    const { id: itemId, fileId } = params;

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
      logger.error("Storage delete error", storageError);
    }

    // Delete DB record
    const { error: deleteError } = await adminClient.from("content_library_files" as any)
      .delete()
      .eq("id", fileId) as { error: any };

    if (deleteError) {
      logger.error("Failed to delete file record", deleteError);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
