import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendContentPurchaseEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contentId } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID required" },
        { status: 400 }
      );
    }

    // Get buyer's actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Call the unlock function
    const { data: result, error: unlockError } = await (supabase.rpc as any)(
      "unlock_content",
      {
        p_buyer_id: actor.id,
        p_content_id: contentId,
      }
    );

    if (unlockError) {
      console.error("Unlock error:", unlockError);
      return NextResponse.json(
        { error: "Failed to unlock content" },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          balance: result.balance,
          required: result.required,
        },
        { status: result.error === "Insufficient coins" ? 402 : 400 }
      );
    }

    // Award points to content creator for sale (+5) - only if not already unlocked
    if (!result.already_unlocked) {
      const { data: content } = await (supabase
        .from("premium_content") as any)
        .select("id, model_id, title")
        .eq("id", contentId)
        .single();

      if (content?.model_id) {
        const { error: pointsError } = await (supabase.rpc as any)("award_points", {
          p_model_id: content.model_id,
          p_action: "content_sale",
          p_points: 5,
          p_metadata: { content_id: contentId, buyer_actor_id: actor.id },
        });
        if (pointsError) {
          console.error("Failed to award points for content sale:", pointsError);
          // Non-critical error, don't fail the unlock
        }

        // Send email notification to model (non-blocking)
        try {
          // Get model info
          const { data: model } = await (supabase
            .from("models") as any)
            .select("email, first_name, username")
            .eq("id", content.model_id)
            .single();

          // Get buyer name
          let buyerName = "Someone";
          if (actor.type === "fan") {
            const { data: fan } = await (supabase
              .from("fans") as any)
              .select("display_name")
              .eq("id", actor.id)
              .single();
            buyerName = fan?.display_name || "A fan";
          } else if (actor.type === "model") {
            const { data: buyerModel } = await (supabase
              .from("models") as any)
              .select("first_name, username")
              .eq("user_id", user.id)
              .single();
            buyerName = buyerModel?.first_name || buyerModel?.username || "A model";
          }

          if (model?.email) {
            sendContentPurchaseEmail({
              to: model.email,
              modelName: model.first_name || model.username || "Model",
              buyerName,
              contentTitle: content.title || "Exclusive Content",
              coinsEarned: result.amount_paid,
            }).catch((err) => console.error("Failed to send content purchase email:", err));
          }
        } catch (emailErr) {
          console.error("Error preparing content purchase email:", emailErr);
          // Non-critical, don't fail the unlock
        }
      }
    }

    return NextResponse.json({
      success: true,
      mediaUrl: result.media_url,
      amountPaid: result.amount_paid,
      newBalance: result.new_balance,
      alreadyUnlocked: result.already_unlocked || false,
    });
  } catch (error) {
    console.error("Content unlock error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
