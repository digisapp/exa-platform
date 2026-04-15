import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

// GET /api/cron/purge-deleted-accounts - Purge personal data from soft-deleted accounts
// Runs daily at 2 AM via Vercel cron
// - Accounts deleted 90+ days ago get personal data wiped
// - Financial records are kept with anonymized references
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find models deleted 90+ days ago that haven't been purged yet
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { data: modelsToPurge, error: fetchError } = await adminClient
      .from("models")
      .select("id, user_id, username")
      .not("deleted_at", "is", null)
      .is("purged_at", null)
      .lt("deleted_at", cutoffDate.toISOString())
      .limit(50); // Process in batches to avoid timeouts

    if (fetchError) {
      logger.error("Purge fetch error", fetchError);
      return NextResponse.json({ error: "Failed to fetch accounts to purge" }, { status: 500 });
    }

    if (!modelsToPurge || modelsToPurge.length === 0) {
      return NextResponse.json({ success: true, purged: 0 });
    }

    let purgedCount = 0;

    for (const model of modelsToPurge) {
      try {
        // Clean up non-cascading FK references first (cast to any for tables not in generated types)
        await adminClient.from("referrals").delete().or(`referrer_id.eq.${model.id},referred_id.eq.${model.id}`);
        await (adminClient.from("swim_shop_affiliates" as any) as any).delete().eq("model_id", model.id);
        await (adminClient.from("swim_shop_orders" as any) as any).update({ affiliate_model_id: null }).eq("affiliate_model_id", model.id);
        await (adminClient.from("swim_shop_products" as any) as any).update({ affiliate_model_id: null }).eq("affiliate_model_id", model.id);

        // Anonymize the model record (keep row for financial record integrity)
        const anonymizedUsername = `deleted_${model.id.substring(0, 8)}`;
        await (adminClient
          .from("models") as any)
          .update({
            username: anonymizedUsername,
            first_name: null,
            last_name: null,
            email: null,
            phone: null,
            bio: null,
            profile_photo_url: null,
            instagram_name: null,
            tiktok_username: null,
            city: null,
            state: null,
            dob: null,
            exa_doll_image_url: null,
            exa_doll_prompt: null,
            skin_tone: null,
            purged_at: new Date().toISOString(),
          })
          .eq("id", model.id);

        // Delete media assets (photos/videos)
        await adminClient.from("media_assets").delete().eq("model_id", model.id);

        // Delete premium content
        await adminClient.from("premium_content").delete().eq("model_id", model.id);

        // Delete the auth user if they have one
        if (model.user_id) {
          await adminClient.auth.admin.deleteUser(model.user_id);
        }

        purgedCount++;
        logger.info("Purged account", { modelId: model.id, username: model.username });
      } catch (err) {
        logger.error("Failed to purge model", err, { modelId: model.id });
        // Continue with next model
      }
    }

    logger.info("Purge complete", { purgedCount, total: modelsToPurge.length });

    return NextResponse.json({
      success: true,
      purged: purgedCount,
      total: modelsToPurge.length,
    });
  } catch (error) {
    logger.error("Cron purge-deleted-accounts error", error);
    return NextResponse.json({ error: "Failed to run purge" }, { status: 500 });
  }
}
