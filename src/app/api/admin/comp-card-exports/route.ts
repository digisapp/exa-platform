import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service: any = createServiceRoleClient();
    const { data: models, error } = await service
      .from("models")
      .select("id, first_name, last_name, username, instagram_name, city, state, height, bust, waist, hips, eye_color, hair_color, dress_size, shoe_size, profile_photo_url, comp_card_exported_at, comp_card_assets")
      .not("comp_card_exported_at", "is", null)
      .order("comp_card_exported_at", { ascending: false });

    if (error) throw error;

    // Resolve saved-card storage paths to short-lived signed URLs in one batch.
    const ASSET_KEYS = ["pdf", "front", "back"] as const;
    const paths: string[] = [];
    for (const m of models || []) {
      const assets = m.comp_card_assets || {};
      for (const key of ASSET_KEYS) if (assets[key]) paths.push(assets[key]);
    }

    const urlByPath: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: signed } = await service.storage
        .from("comp-cards")
        .createSignedUrls(paths, 3600);
      for (const s of signed || []) {
        if (s.path && s.signedUrl && !s.error) urlByPath[s.path] = s.signedUrl;
      }
    }

    const result = (models || []).map((m: any) => {
      const { comp_card_assets, ...rest } = m;
      const assets = comp_card_assets || {};
      const files: Record<string, string> = {};
      for (const key of ASSET_KEYS) {
        if (assets[key] && urlByPath[assets[key]]) files[key] = urlByPath[assets[key]];
      }
      return {
        ...rest,
        comp_card_files: Object.keys(files).length > 0 ? files : null,
      };
    });

    return NextResponse.json({ models: result });
  } catch (error) {
    logger.error("Comp card exports fetch error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
