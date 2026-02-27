import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendContentPurchaseEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const unlockSchema = z.object({
  contentId: z.string().uuid(),
});

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

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { contentId } = parsed.data;

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
    const { data: rpcData, error: unlockError } = await supabase.rpc(
      "unlock_content",
      {
        p_buyer_id: actor.id,
        p_content_id: contentId,
      }
    );
    const result = rpcData as Record<string, any>;

    if (unlockError) {
      console.error("Unlock error:", unlockError.message, unlockError.details, unlockError.hint, unlockError.code);
      return NextResponse.json(
        { error: unlockError.message || "Failed to unlock content" },
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
      const { data: content } = await supabase
        .from("premium_content")
        .select("id, model_id, title")
        .eq("id", contentId)
        .single();

      if (content?.model_id) {
        // Send email notification to model (non-blocking)
        try {
          // Get model info
          const { data: model } = await supabase
            .from("models")
            .select("email, first_name, username")
            .eq("id", content.model_id)
            .single();

          // Get buyer name
          let buyerName = "Someone";
          if (actor.type === "fan") {
            const { data: fan } = await supabase
              .from("fans")
              .select("display_name")
              .eq("id", actor.id)
              .single();
            buyerName = fan?.display_name || "A fan";
          } else if (actor.type === "model") {
            const { data: buyerModel } = await supabase
              .from("models")
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

    // Generate a fresh signed URL from the stored path (handles both old expired URLs and new storage paths)
    let mediaUrl: string | null = result.media_url ?? null;
    if (mediaUrl) {
      const rawPath = mediaUrl.startsWith("http")
        ? mediaUrl.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/)?.[1] ?? null
        : mediaUrl;
      if (rawPath) {
        const service = createServiceRoleClient();
        const { data } = await service.storage.from("portfolio").createSignedUrl(rawPath, 3600);
        if (data?.signedUrl) mediaUrl = data.signedUrl;
      }
    }

    return NextResponse.json({
      success: true,
      mediaUrl,
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
