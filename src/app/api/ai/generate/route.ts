import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startGeneration, faceSwap, AI_SCENARIOS, AI_GENERATION_COST, type ScenarioId } from "@/lib/fal";

// Allow longer timeout for full generation + face swap
export const maxDuration = 60;

// Download image from URL and return as buffer
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[AI Generate] Failed to download image:", error);
    return null;
  }
}

// POST - Generate AI image (synchronous - does everything in one call)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model info
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, coin_balance, is_approved")
      .eq("user_id", user.id)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (!model.is_approved) {
      return NextResponse.json({ error: "Your profile must be approved to use AI Studio" }, { status: 403 });
    }

    // Parse request
    const body = await request.json();
    const { sourceImageUrl, scenarioId } = body as {
      sourceImageUrl: string;
      scenarioId: ScenarioId;
    };

    if (!sourceImageUrl || !scenarioId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate scenario
    const scenario = AI_SCENARIOS[scenarioId];
    if (!scenario) {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
    }

    // Check coin balance
    const coinBalance = model.coin_balance ?? 0;
    if (coinBalance < AI_GENERATION_COST) {
      return NextResponse.json({
        error: `Not enough coins. You need ${AI_GENERATION_COST} coins.`,
        required: AI_GENERATION_COST,
        balance: coinBalance,
      }, { status: 402 });
    }

    // Deduct coins first
    const { error: coinError } = await supabase
      .from("models")
      .update({ coin_balance: coinBalance - AI_GENERATION_COST })
      .eq("id", model.id);

    if (coinError) {
      console.error("[AI Generate] Failed to deduct coins:", coinError);
    }

    // Step 1: Generate base image with Flux (synchronous - waits for result)
    console.log("[AI Generate] Step 1: Generating base image with Flux...");
    const fluxResult = await startGeneration(sourceImageUrl, scenarioId);

    if ("error" in fluxResult) {
      // Refund coins on error
      await supabase
        .from("models")
        .update({ coin_balance: coinBalance })
        .eq("id", model.id);
      return NextResponse.json({ error: fluxResult.error }, { status: 500 });
    }

    console.log("[AI Generate] Step 1 complete! Base image:", fluxResult.baseImageUrl.slice(0, 50));

    // Step 2: Face swap with Replicate/Easel
    console.log("[AI Generate] Step 2: Face swapping...");
    const swapResult = await faceSwap(fluxResult.baseImageUrl, sourceImageUrl);

    if ("error" in swapResult) {
      // Refund coins on error
      await supabase
        .from("models")
        .update({ coin_balance: coinBalance })
        .eq("id", model.id);
      return NextResponse.json({ error: swapResult.error }, { status: 500 });
    }

    if (!swapResult.images || swapResult.images.length === 0) {
      await supabase
        .from("models")
        .update({ coin_balance: coinBalance })
        .eq("id", model.id);
      return NextResponse.json({ error: "Face swap returned no image" }, { status: 500 });
    }

    console.log("[AI Generate] Step 2 complete! Saving to storage...");

    // Step 3: Save to permanent storage
    const generationId = crypto.randomUUID();
    const outputUrl = swapResult.images[0].url;
    const buffer = await downloadImage(outputUrl);

    let permanentUrl = outputUrl; // Fallback to original URL
    if (buffer) {
      const filename = `${model.id}/ai-${generationId}-0.webp`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(filename, buffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("portfolio")
          .getPublicUrl(filename);
        permanentUrl = publicUrl;
      }
    }

    // Create generation record
    const { data: generation, error: insertError } = await supabase
      .from("ai_generations")
      .insert({
        id: generationId,
        model_id: model.id,
        source_image_url: sourceImageUrl,
        scenario_id: scenarioId,
        scenario_name: scenario.name,
        prompt: scenario.prompt,
        status: "completed",
        result_urls: [permanentUrl],
        coins_spent: AI_GENERATION_COST,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[AI Generate] Failed to create record:", insertError);
      // Don't fail - the image was generated successfully
    }

    console.log("[AI Generate] Complete! Image saved:", permanentUrl.slice(0, 50));

    return NextResponse.json({
      success: true,
      generationId: generation?.id || generationId,
      status: "completed",
      resultUrls: [permanentUrl],
      coinsSpent: AI_GENERATION_COST,
      newBalance: coinBalance - AI_GENERATION_COST,
    });
  } catch (error) {
    console.error("[AI Generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List user's generations
export async function GET(request: NextRequest) {
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

    // Get generations
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: generations, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[AI Generate] Failed to fetch generations:", error);
      return NextResponse.json({ error: "Failed to fetch generations" }, { status: 500 });
    }

    return NextResponse.json({ generations });
  } catch (error) {
    console.error("[AI Generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
