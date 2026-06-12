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

        // Delete content items (unified content table)
        await (adminClient as any).from("content_items").delete().eq("model_id", model.id);

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

    // ── Fans: anonymize PII, keep the row + coin ledger ──────────────────
    let fansPurged = 0;
    const { data: fansToPurge } = await adminClient
      .from("fans")
      .select("id, user_id")
      .not("deleted_at", "is", null)
      .is("purged_at", null)
      .lt("deleted_at", cutoffDate.toISOString())
      .limit(50);

    for (const fan of (fansToPurge as { id: string; user_id: string | null }[] | null) ?? []) {
      try {
        await (adminClient.from("fans") as any)
          .update({
            display_name: `deleted_${fan.id.substring(0, 8)}`,
            email: null,
            avatar_url: null,
            purged_at: new Date().toISOString(),
          })
          .eq("id", fan.id);

        // Remove the login (FK is now SET NULL, so the fan row + ledger survive)
        if (fan.user_id) {
          await adminClient.auth.admin.deleteUser(fan.user_id);
        }
        fansPurged++;
      } catch (err) {
        logger.error("Failed to purge fan", err, { fanId: fan.id });
      }
    }

    // ── Brands: anonymize PII, keep the row + coin ledger ─────────────────
    let brandsPurged = 0;
    const { data: brandsToPurge } = await adminClient
      .from("brands")
      .select("id")
      .not("deleted_at", "is", null)
      .is("purged_at", null)
      .lt("deleted_at", cutoffDate.toISOString())
      .limit(50);

    for (const brand of (brandsToPurge as { id: string }[] | null) ?? []) {
      try {
        // brands have no user_id column — resolve the login via the actor row
        const { data: brandActor } = await adminClient
          .from("actors")
          .select("user_id")
          .eq("id", brand.id)
          .maybeSingle() as { data: { user_id: string | null } | null };

        await (adminClient.from("brands") as any)
          .update({
            company_name: `deleted_${brand.id.substring(0, 8)}`,
            contact_name: null,
            email: null,
            phone: null,
            website: null,
            logo_url: null,
            bio: null,
            username: null,
            purged_at: new Date().toISOString(),
          })
          .eq("id", brand.id);

        if (brandActor?.user_id) {
          await adminClient.auth.admin.deleteUser(brandActor.user_id);
        }
        brandsPurged++;
      } catch (err) {
        logger.error("Failed to purge brand", err, { brandId: brand.id });
      }
    }

    logger.info("Purge complete", {
      purgedCount,
      total: modelsToPurge.length,
      fansPurged,
      brandsPurged,
    });

    return NextResponse.json({
      success: true,
      purged: purgedCount,
      total: modelsToPurge.length,
      fansPurged,
      brandsPurged,
    });
  } catch (error) {
    logger.error("Cron purge-deleted-accounts error", error);
    return NextResponse.json({ error: "Failed to run purge" }, { status: 500 });
  }
}
