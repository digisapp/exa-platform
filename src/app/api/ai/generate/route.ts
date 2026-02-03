import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startGeneration, AI_SCENARIOS, AI_GENERATION_COST, type ScenarioId } from "@/lib/replicate";

// POST - Start a new AI generation
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
    if (model.coin_balance < AI_GENERATION_COST) {
      return NextResponse.json({
        error: `Not enough coins. You need ${AI_GENERATION_COST} coins.`,
        required: AI_GENERATION_COST,
        balance: model.coin_balance,
      }, { status: 402 });
    }

    // Start the generation on Replicate
    const result = await startGeneration(sourceImageUrl, scenarioId);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Deduct coins
    const { error: coinError } = await supabase
      .from("models")
      .update({ coin_balance: model.coin_balance - AI_GENERATION_COST })
      .eq("id", model.id);

    if (coinError) {
      console.error("[AI Generate] Failed to deduct coins:", coinError);
      // Continue anyway - we'll handle this manually if needed
    }

    // Create generation record
    const { data: generation, error: insertError } = await supabase
      .from("ai_generations")
      .insert({
        model_id: model.id,
        source_image_url: sourceImageUrl,
        scenario_id: scenarioId,
        scenario_name: scenario.name,
        prompt: scenario.prompt,
        status: "processing",
        replicate_prediction_id: result.predictionId,
        coins_spent: AI_GENERATION_COST,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[AI Generate] Failed to create record:", insertError);
      return NextResponse.json({ error: "Failed to save generation" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      predictionId: result.predictionId,
      coinsSpent: AI_GENERATION_COST,
      newBalance: model.coin_balance - AI_GENERATION_COST,
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
