import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import {
  generateExaDollPrompt,
  generateExaDollBase,
  startFaceSwap,
  checkFaceSwapStatus,
  detectSkinTone,
  type ExaDollModelInput,
} from "@/lib/exa-dolls";

async function isAdmin(supabase: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// POST: Generate Exa Doll for a specific model
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    if (!(await isAdmin(admin, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { modelId } = await params;

    // Fetch model data
    const { data: model, error: fetchError } = await admin
      .from("models")
      .select(
        "id, first_name, last_name, username, country_code, hair_color, eye_color, skin_tone, height, bust, waist, hips, profile_photo_url, focus_tags"
      )
      .eq("id", modelId)
      .single();

    if (fetchError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (!model.profile_photo_url) {
      return NextResponse.json(
        { error: "Model has no profile photo — needed for face swap" },
        { status: 400 }
      );
    }

    // Auto-detect skin tone if not set
    if (!model.skin_tone && model.profile_photo_url) {
      const detectedTone = await detectSkinTone(model.profile_photo_url);
      if (detectedTone) {
        model.skin_tone = detectedTone;
        await admin
          .from("models")
          .update({ skin_tone: detectedTone })
          .eq("id", modelId);
      }
    }

    // Allow custom prompt override from request body
    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || generateExaDollPrompt(model as ExaDollModelInput);

    // Step 1: Generate base doll image with Flux
    const baseResult = await generateExaDollBase(prompt);
    if ("error" in baseResult) {
      return NextResponse.json({ error: baseResult.error }, { status: 500 });
    }

    // Step 2: Start face swap
    const swapResult = await startFaceSwap(baseResult.baseImageUrl, model.profile_photo_url);
    if ("error" in swapResult) {
      // Still save the base image even if face swap fails
      await admin
        .from("models")
        .update({
          exa_doll_image_url: baseResult.baseImageUrl,
          exa_doll_prompt: prompt,
          exa_doll_generated_at: new Date().toISOString(),
        })
        .eq("id", modelId);

      return NextResponse.json({
        status: "base_only",
        imageUrl: baseResult.baseImageUrl,
        prompt,
        faceSwapError: swapResult.error,
      });
    }

    // Save prompt + base image now so we don't lose it if polling times out
    await admin
      .from("models")
      .update({
        exa_doll_image_url: baseResult.baseImageUrl,
        exa_doll_prompt: prompt,
        exa_doll_generated_at: new Date().toISOString(),
      })
      .eq("id", modelId);

    return NextResponse.json({
      status: "face_swap_pending",
      predictionId: swapResult.predictionId,
      baseImageUrl: baseResult.baseImageUrl,
      modelId,
    });
  } catch (error) {
    console.error("[ExaDolls] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Check face swap status and finalize
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    if (!(await isAdmin(admin, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { modelId } = await params;
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("predictionId");

    if (!predictionId) {
      return NextResponse.json({ error: "Missing predictionId" }, { status: 400 });
    }

    const result = await checkFaceSwapStatus(predictionId);

    if (result.status === "completed" && result.imageUrl) {
      // Save final face-swapped image to Supabase storage (overwrites base image URL)
      const finalUrl = await saveToStorage(admin, modelId, result.imageUrl);

      await admin
        .from("models")
        .update({ exa_doll_image_url: finalUrl })
        .eq("id", modelId);

      return NextResponse.json({
        status: "completed",
        imageUrl: finalUrl,
      });
    }

    if (result.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: result.error,
      });
    }

    return NextResponse.json({ status: "processing" });
  } catch (error) {
    console.error("[ExaDolls] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update skin tone or regenerate prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    if (!(await isAdmin(admin, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { modelId } = await params;
    const body = await request.json();

    const updates: Record<string, string | null> = {};
    if (body.skin_tone !== undefined) updates.skin_tone = body.skin_tone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await admin
      .from("models")
      .update(updates)
      .eq("id", modelId);

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ExaDolls] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Download image from external URL and save to Supabase storage
 */
async function saveToStorage(
  admin: ReturnType<typeof createServiceRoleClient>,
  modelId: string,
  imageUrl: string
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to download image");

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `exa-doll-${Date.now()}.jpg`;
    const path = `${modelId}/${filename}`;

    const { error } = await admin.storage
      .from("portfolio")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("[ExaDolls] Storage upload error:", error);
      return imageUrl; // Fall back to external URL
    }

    const { data: { publicUrl } } = admin.storage
      .from("portfolio")
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error("[ExaDolls] Save to storage error:", error);
    return imageUrl; // Fall back to external URL
  }
}
