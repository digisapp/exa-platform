import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

const completeUploadSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const POST = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id: itemId } = params;

    // Verify item exists
    const { data: item } = await adminClient.from("content_library" as any)
      .select("id")
      .eq("id", itemId)
      .maybeSingle() as { data: any };

    if (!item) {
      return NextResponse.json({ error: "Library item not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = completeUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { storagePath, fileName, fileType, fileSize, width, height } = parsed.data;

    // Security: verify storage path matches expected pattern
    const expectedPrefix = `content-library/${itemId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    const { data: urlData } = adminClient.storage
      .from("portfolio")
      .getPublicUrl(storagePath);

    const isImage = fileType.startsWith("image/");
    const fileTypeCategory = isImage ? "image" : "video";

    const { data: fileRecord, error: insertError } = await adminClient.from("content_library_files" as any)
      .insert({
        library_item_id: itemId,
        file_name: fileName,
        storage_path: storagePath,
        url: urlData.publicUrl,
        mime_type: fileType,
        size_bytes: fileSize,
        file_type: fileTypeCategory,
        width: width || null,
        height: height || null,
      })
      .select()
      .single() as { data: any; error: any };

    if (insertError || !fileRecord) {
      logger.error("Failed to create file record", insertError);
      return NextResponse.json({ error: "Failed to record file" }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord });
  },
  { requireType: "admin", rateLimit: "uploads" }
);
