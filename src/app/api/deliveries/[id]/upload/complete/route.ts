import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    // Verify delivery exists and belongs to this model
    const { data: delivery } = await adminClient
      .from("content_deliveries" as any)
      .select("id, model_id")
      .eq("id", deliveryId)
      .maybeSingle() as { data: any };

    if (!delivery || delivery.model_id !== modelId) {
      return NextResponse.json({ error: "Delivery not found or not yours" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = completeUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { storagePath, fileName, fileType, fileSize, width, height } = parsed.data;

    // Security: verify storage path matches expected pattern
    const expectedPrefix = `deliveries/${modelId}/${deliveryId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("portfolio")
      .getPublicUrl(storagePath);

    const isImage = fileType.startsWith("image/");
    const fileTypeCategory = isImage ? "image" : "video";

    // Create delivery_files record
    const { data: fileRecord, error: insertError } = await adminClient
      .from("delivery_files" as any)
      .insert({
        delivery_id: deliveryId,
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
      console.error("Failed to create delivery file record:", insertError);
      return NextResponse.json({ error: "Failed to record file" }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord });
  } catch (error) {
    console.error("Complete delivery upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
