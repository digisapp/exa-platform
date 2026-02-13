import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const completeUploadSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  width: z.number().optional(),
  height: z.number().optional(),
});

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      console.error("Failed to create file record:", insertError);
      return NextResponse.json({ error: "Failed to record file" }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord });
  } catch (error) {
    console.error("Complete library upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
