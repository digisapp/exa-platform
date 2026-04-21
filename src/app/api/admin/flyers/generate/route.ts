import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { type FlyerDesignSettings, designToParams } from "@/types/flyer-design";

export const maxDuration = 120;

const CONCURRENCY = 3;

/**
 * GET /api/admin/flyers/generate?event_id=xxx
 * Returns eligible model IDs for flyer generation.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const admin = createServiceRoleClient();

  const { data: event } = await (admin.from("events") as any)
    .select("id, name")
    .eq("id", eventId)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: eventBadge } = await (admin.from("badges") as any)
    .select("id")
    .eq("event_id", eventId)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .single();
  if (!eventBadge) return NextResponse.json({ error: `No event badge for ${event.name}` }, { status: 404 });

  const { data: badgeHolders } = await (admin.from("model_badges") as any)
    .select("model_id")
    .eq("badge_id", eventBadge.id);

  const modelIds = (badgeHolders || []).map((b: any) => b.model_id);

  return NextResponse.json({ model_ids: modelIds, total: modelIds.length });
}

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
  const { event_id, model_ids, design, force, scale } = body as {
    event_id: string;
    model_ids?: string[];
    design?: FlyerDesignSettings;
    force?: boolean;
    scale?: number;
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
    return NextResponse.json({ error: `No event badge found for event ${event.name}` }, { status: 404 });
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
    return NextResponse.json({ error: `No models with badge for ${event.name} (badge: ${eventBadge.id})` }, { status: 404 });
  }

  // 4. Fetch model data (select * to avoid column name mismatches)
  const { data: models, error: modelsError } = await (admin.from("models") as any)
    .select("*")
    .in("id", targetModelIds);

  if (modelsError) {
    return NextResponse.json({
      error: `Models query failed: ${modelsError.message}`,
      details: { targetModelIds: targetModelIds.slice(0, 5), count: targetModelIds.length },
    }, { status: 500 });
  }

  if (!models || models.length === 0) {
    return NextResponse.json({
      error: `Models query returned empty for ${targetModelIds.length} badge holders`,
      details: { sampleIds: targetModelIds.slice(0, 3) },
    }, { status: 404 });
  }

  // 5. If force=true, delete existing flyers
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

    // Use profile photo for circle avatar display
    const bestPhotoUrl = model.profile_photo_url || "";

    // Build template URL
    const templateUrl = new URL("/api/admin/flyers/template", request.nextUrl.origin);
    templateUrl.searchParams.set("name", modelName);
    if (bestPhotoUrl) templateUrl.searchParams.set("photo", bestPhotoUrl);
    if (scale && scale > 1) templateUrl.searchParams.set("scale", String(scale));

    // Instagram handle (column is instagram_name on models table)
    const igHandle = model.instagram_name || "";
    if (igHandle) templateUrl.searchParams.set("ig", igHandle);

    // Event show URL for QR code — use model's affiliate link for tracking
    const showUrl = model.affiliate_code
      ? `https://www.examodels.com/shows/${event.slug}?ref=${model.affiliate_code}`
      : `https://www.examodels.com/shows/${event.slug}`;
    templateUrl.searchParams.set("eventUrl", showUrl);

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
    // Cache-bust so browser/Next.js Image don't serve stale version
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    await (admin.from("flyers" as any) as any).insert({
      model_id: model.id,
      event_id: event_id,
      storage_path: storagePath,
      public_url: versionedUrl,
      width: 1080 * (scale || 1),
      height: 1350 * (scale || 1),
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
