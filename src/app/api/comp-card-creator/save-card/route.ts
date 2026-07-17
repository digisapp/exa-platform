import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Issues signed upload URLs for a copy of the comp card the model just
// exported, and records the storage paths on the model row so admins can view
// the card on /admin/comp-card-leads. The client uploads directly to storage —
// a multi-photo PDF can exceed the 4.5MB request body limit on Vercel.
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { kind } = await request.json().catch(() => ({}));
    if (kind !== "pdf" && kind !== "jpeg") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const service: any = createServiceRoleClient();
    const { data: model } = await service
      .from("models")
      .select("id, comp_card_assets")
      .eq("user_id", user.id)
      .single();
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const ts = Date.now();
    const wanted: { key: string; path: string }[] =
      kind === "pdf"
        ? [{ key: "pdf", path: `${model.id}/${ts}-comp-card.pdf` }]
        : [
            { key: "front", path: `${model.id}/${ts}-front.jpg` },
            { key: "back", path: `${model.id}/${ts}-back.jpg` },
          ];

    const uploads: Record<string, { path: string; signedUrl: string }> = {};
    const assets: Record<string, string> = { ...(model.comp_card_assets || {}) };
    for (const { key, path } of wanted) {
      const { data, error } = await service.storage
        .from("comp-cards")
        .createSignedUploadUrl(path);
      if (error) throw error;
      uploads[key] = { path, signedUrl: data.signedUrl };
      assets[key] = path;
    }
    assets.saved_at = new Date().toISOString();

    // Stamp exported_at too so a model with saved assets always shows up in
    // the admin list even if the separate track-export ping was lost.
    await service
      .from("models")
      .update({
        comp_card_assets: assets,
        comp_card_exported_at: new Date().toISOString(),
      })
      .eq("id", model.id);

    return NextResponse.json({ uploads });
  } catch (error) {
    logger.error("Comp card save-card error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
