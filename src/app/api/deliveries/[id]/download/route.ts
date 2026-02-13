import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// POST - Generate signed download URLs for all files in a delivery
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

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get delivery and verify access
    const { data: delivery } = await adminClient
      .from("content_deliveries" as any)
      .select("id, model_id, recipient_actor_id")
      .eq("id", deliveryId)
      .maybeSingle() as { data: any };

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    const isRecipient = delivery.recipient_actor_id === actor.id;
    const isAdmin = actor.type === "admin";

    let isModel = false;
    if (delivery.model_id) {
      const { data: modelRecord } = await supabase
        .from("models")
        .select("user_id")
        .eq("id", delivery.model_id)
        .maybeSingle();
      isModel = modelRecord?.user_id === user.id;
    }

    if (!isModel && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all files
    const { data: files } = await adminClient
      .from("delivery_files" as any)
      .select("id, file_name, storage_path, size_bytes, mime_type")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true }) as { data: any };

    if (!files || files.length === 0) {
      return NextResponse.json({ downloads: [] });
    }

    // Generate signed download URLs (1 hour expiry)
    const downloads = await Promise.all(
      files.map(async (file: any) => {
        const { data: signedData } = await adminClient.storage
          .from("portfolio")
          .createSignedUrl(file.storage_path, 3600, {
            download: file.file_name,
          });

        return {
          fileId: file.id,
          fileName: file.file_name,
          downloadUrl: signedData?.signedUrl || null,
          size: file.size_bytes,
          mimeType: file.mime_type,
        };
      })
    );

    return NextResponse.json({ downloads });
  } catch (error) {
    console.error("Download delivery files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
