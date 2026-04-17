import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    const { contentItemId } = await request.json();
    if (!contentItemId || typeof contentItemId !== "string") {
      return NextResponse.json({ error: "contentItemId is required" }, { status: 400 });
    }

    const adminDb = createServiceRoleClient();

    // Verify the content item belongs to this model
    const { data: item } = await (adminDb as any)
      .from("content_items")
      .select("id")
      .eq("id", contentItemId)
      .eq("model_id", modelId)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Clear any existing primary for this model, then set the new one
    await (adminDb as any)
      .from("content_items")
      .update({ is_primary: false })
      .eq("model_id", modelId)
      .eq("is_primary", true);

    await (adminDb as any)
      .from("content_items")
      .update({ is_primary: true })
      .eq("id", contentItemId)
      .eq("model_id", modelId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
