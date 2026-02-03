import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Save generated image to portfolio
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Parse request
    const body = await request.json();
    const { generationId, imageUrl, saveToPortfolio } = body as {
      generationId: string;
      imageUrl: string;
      saveToPortfolio: boolean;
    };

    if (!generationId || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the generation belongs to this model
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .select("id, scenario_name, result_urls")
      .eq("id", generationId)
      .eq("model_id", model.id)
      .single();

    if (genError || !generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Verify the image URL is from this generation
    if (!generation.result_urls?.includes(imageUrl)) {
      return NextResponse.json({ error: "Image not from this generation" }, { status: 400 });
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from("ai_saved_photos")
      .select("id")
      .eq("generation_id", generationId)
      .eq("image_url", imageUrl)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Image already saved" }, { status: 400 });
    }

    let portfolioMediaId = null;

    // If saving to portfolio, create a media asset
    if (saveToPortfolio) {
      // Download image and re-upload to our storage
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
      }

      const imageBlob = await imageResponse.blob();
      const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const storagePath = `${model.id}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, imageBlob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("[AI Save] Upload error:", uploadError);
        return NextResponse.json({ error: "Failed to save to storage" }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);

      // Create media asset record
      const { data: mediaAsset, error: mediaError } = await supabase
        .from("media_assets")
        .insert({
          model_id: model.id,
          asset_type: "portfolio",
          photo_url: publicUrl,
          url: publicUrl,
          storage_path: storagePath,
          bucket: "avatars",
          title: `AI: ${generation.scenario_name}`,
        })
        .select()
        .single();

      if (mediaError) {
        console.error("[AI Save] Media asset error:", mediaError);
        return NextResponse.json({ error: "Failed to create portfolio entry" }, { status: 500 });
      }

      portfolioMediaId = mediaAsset.id;
    }

    // Save to ai_saved_photos
    const { data: savedPhoto, error: saveError } = await supabase
      .from("ai_saved_photos")
      .insert({
        model_id: model.id,
        generation_id: generationId,
        image_url: imageUrl,
        scenario_name: generation.scenario_name,
        added_to_portfolio: saveToPortfolio,
        portfolio_media_id: portfolioMediaId,
      })
      .select()
      .single();

    if (saveError) {
      console.error("[AI Save] Save error:", saveError);
      return NextResponse.json({ error: "Failed to save photo" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      savedPhoto,
      addedToPortfolio: saveToPortfolio,
    });
  } catch (error) {
    console.error("[AI Save] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
