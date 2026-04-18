import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { type FlyerDesignSettings, designToParams } from "@/types/flyer-design";

// Allow up to 5 minutes for large batches (Vercel Pro)
export const maxDuration = 300;

const CONCURRENCY = 5;

/**
 * POST /api/admin/flyers/generate
 * Body: { event_id: string, model_ids?: string[], design?: FlyerDesignSettings, force?: boolean }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { event_id, model_ids, design, force } = body as {
    event_id: string;
    model_ids?: string[];
    design?: FlyerDesignSettings;
    force?: boolean;
  };

  if (!event_id) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // 1. Get event details
  const { data: event } = await (admin.from("events") as any)
    .select("id, name, slug, short_name, start_date, end_date, location_city, location_state")
    .eq("id", event_id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // 2. Get event badge
  const { data: eventBadge } = await (admin.from("badges") as any)
    .select("id")
    .eq("event_id", event_id)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .single();

  if (!eventBadge) {
    return NextResponse.json({ error: "No event badge found" }, { status: 404 });
  }

  // 3. Get approved models (badge holders)
  const { data: badgeHolders } = await (admin.from("model_badges") as any)
    .select("model_id")
    .eq("badge_id", eventBadge.id);

  let targetModelIds = badgeHolders?.map((b: any) => b.model_id) || [];

  if (model_ids && model_ids.length > 0) {
    const allowedSet = new Set(targetModelIds);
    targetModelIds = model_ids.filter((id: string) => allowedSet.has(id));
  }

  if (targetModelIds.length === 0) {
    return NextResponse.json({ error: "No approved models found for this event" }, { status: 404 });
  }

  // 4. Fetch model data — include instagram, focus_tags, and photo dimensions for hero selection
  const { data: models } = await (admin.from("models") as any)
    .select(
      "id, first_name, last_name, username, profile_photo_url, profile_photo_width, profile_photo_height, instagram_username"
    )
    .in("id", targetModelIds)
    .not("profile_photo_url", "is", null);

  if (!models || models.length === 0) {
    return NextResponse.json({ error: "No models with profile photos found" }, { status: 404 });
  }

  // 5. Fetch portfolio photos for hero-quality selection (single batch query)
  const modelIds = models.map((m: any) => m.id);
  const { data: allPhotos } = await (admin.from("media_assets") as any)
    .select("model_id, url, width, height, created_at, is_primary")
    .in("model_id", modelIds)
    .eq("type", "photo")
    .in("asset_type", ["portfolio", "avatar"])
    .order("created_at", { ascending: false });

  const modelPortfolioMap = new Map<string, any[]>();
  for (const photo of allPhotos || []) {
    const existing = modelPortfolioMap.get(photo.model_id) || [];
    if (existing.length < 10) { // keep top 10 per model
      existing.push(photo);
      modelPortfolioMap.set(photo.model_id, existing);
    }
  }

  // 6. If force=true, delete existing flyers
  if (force) {
    const deleteIds = models.map((m: any) => m.id);
    const { data: existingFlyers } = await (admin.from("flyers" as any) as any)
      .select("id, storage_path")
      .eq("event_id", event_id)
      .in("model_id", deleteIds);

    if (existingFlyers && existingFlyers.length > 0) {
      const paths = existingFlyers.map((f: any) => f.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await admin.storage.from("portfolio").remove(paths);
      }
      const ids = existingFlyers.map((f: any) => f.id);
      await (admin.from("flyers" as any) as any).delete().in("id", ids);
    }
  }

  // 7. Generate flyers in parallel batches
  const results: { model_id: string; success: boolean; error?: string }[] = [];
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  async function generateOne(model: any) {
    const modelName =
      [model.first_name, model.last_name].filter(Boolean).join(" ") ||
      model.username ||
      "Model";

    // Check existing (skip unless force)
    if (!force) {
      const { data: existing } = await (admin.from("flyers" as any) as any)
        .select("id")
        .eq("model_id", model.id)
        .eq("event_id", event_id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        results.push({ model_id: model.id, success: true, error: "skipped (exists)" });
        return;
      }
    }

    // Select best photo using hero portrait logic
    const portfolioPhotos = modelPortfolioMap.get(model.id) || [];
    let bestPhotoUrl = model.profile_photo_url;

    // Check portfolio for high-res portrait photos first
    const highResPortrait = portfolioPhotos.find(
      (p: any) =>
        p.width && p.height &&
        Math.max(p.width, p.height) >= 1500 &&
        p.height >= p.width // portrait orientation
    );
    if (highResPortrait) {
      bestPhotoUrl = highResPortrait.url;
    } else {
      // Check for any primary photo
      const primary = portfolioPhotos.find((p: any) => p.is_primary && p.url);
      if (primary && primary.width && Math.max(primary.width, primary.height || 0) >= 800) {
        bestPhotoUrl = primary.url;
      }
    }

    // Build template URL
    const templateUrl = new URL("/api/admin/flyers/template", request.nextUrl.origin);
    templateUrl.searchParams.set("name", modelName);
    templateUrl.searchParams.set("photo", bestPhotoUrl);

    if (model.instagram_username) {
      templateUrl.searchParams.set("ig", model.instagram_username);
    }

    // Forward all design params
    if (design) {
      const designParams = designToParams(design);
      for (const [key, value] of Object.entries(designParams)) {
        templateUrl.searchParams.set(key, value);
      }
    }

    const flyerResponse = await fetch(templateUrl.toString());
    if (!flyerResponse.ok) {
      throw new Error(`Template render failed: ${flyerResponse.status}`);
    }

    const flyerBytes = new Uint8Array(await flyerResponse.arrayBuffer());
    const storagePath = `flyers/${event.slug}/${model.id}.png`;

    const { error: uploadError } = await admin.storage
      .from("portfolio")
      .upload(storagePath, flyerBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = admin.storage.from("portfolio").getPublicUrl(storagePath);

    await (admin.from("flyers" as any) as any).insert({
      model_id: model.id,
      event_id: event_id,
      storage_path: storagePath,
      public_url: publicUrl,
      width: 1080,
      height: 1350,
    });

    generated++;
    results.push({ model_id: model.id, success: true });
  }

  for (let i = 0; i < models.length; i += CONCURRENCY) {
    const batch = models.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map((model: any) =>
        generateOne(model).catch((err: any) => {
          failed++;
          results.push({ model_id: model.id, success: false, error: err.message });
        })
      )
    );
  }

  return NextResponse.json({
    success: true,
    total: models.length,
    generated,
    skipped,
    failed,
    results,
  });
}
