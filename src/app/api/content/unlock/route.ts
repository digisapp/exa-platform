import { createClient } from "@/lib/supabase/server";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendContentPurchaseEmail } from "@/lib/email";
import { insertEarningNotification } from "@/lib/earning-notifications";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  CONTENT_MEDIA_BUCKET,
  CONTENT_MEDIA_SIGNED_URL_TTL,
  isContentMediaPath,
} from "@/lib/content-media";

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

    const suspended = await assertNotSuspended(actor.id);
    if (suspended) return suspended;

    // Call the unified unlock function (content_items system) via service-role
    // client: unlock_content_item is REVOKEd from authenticated/anon; actor.id
    // is derived from the authenticated session.
    const service = createServiceRoleClient();
    const { data: rpcData, error: unlockError } = await (service as any).rpc(
      "unlock_content_item",
      {
        p_buyer_id: actor.id,
        p_item_id: contentId,
      }
    );
    const result = rpcData as Record<string, any>;

    if (unlockError) {
      logger.error("Unlock error", unlockError, { details: unlockError.details, hint: unlockError.hint, code: unlockError.code });
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
      const { data: content } = await (supabase as any)
        .from("content_items")
        .select("id, model_id, title")
        .eq("id", contentId)
        .single();

      if (content?.model_id) {
        // Send email notification to model (non-blocking)
        try {
          // Get model info (service client: user_id is needed for the bell
          // notification and may not be readable cross-user through RLS)
          const { data: model } = await (service as any)
            .from("models")
            .select("email, first_name, username, user_id")
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
              .select("username")
              .eq("user_id", user.id)
              .single();
            buyerName = buyerModel?.username || "A model";
          }

          if (model?.email) {
            sendContentPurchaseEmail({
              to: model.email,
              modelName: model.first_name || model.username || "Model",
              buyerName,
              contentTitle: content.title || "Exclusive Content",
              coinsEarned: result.amount_paid,
            }).catch((err) => logger.error("Failed to send content purchase email", err));
          }

          // Light the bell (claimed models only — helper no-ops on null user_id)
          await insertEarningNotification(service, {
            recipientUserId: model?.user_id,
            type: "content_sale",
            title: "💸 Content sale",
            message: `${buyerName} unlocked "${content.title || "your content"}" · +${result.amount_paid} coins`,
            amountCoins: result.amount_paid,
            metadata: { content_item_id: contentId, buyer_id: actor.id },
          });
        } catch (emailErr) {
          logger.error("Error preparing content purchase email", emailErr);
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
        // New exclusive uploads live in the private content-media bucket;
        // legacy paths live in the public portfolio bucket (src/lib/content-media.ts)
        const bucket = isContentMediaPath(rawPath) ? CONTENT_MEDIA_BUCKET : "portfolio";
        const { data } = await service.storage
          .from(bucket)
          .createSignedUrl(rawPath, CONTENT_MEDIA_SIGNED_URL_TTL);
        // A private path must never reach the client raw — it's useless anyway
        mediaUrl = data?.signedUrl ?? (isContentMediaPath(rawPath) ? null : mediaUrl);
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
    logger.error("Content unlock error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
