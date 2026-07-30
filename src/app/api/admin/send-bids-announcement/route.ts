import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { sendEXABidsAnnouncementEmail } from "@/lib/email";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";

const adminClient = createServiceRoleClient();

// POST /api/admin/send-bids-announcement - Send EXA Bids feature announcement to models with profile photos
export const POST = withAuth(
  async ({ request }) => {
    // Get optional parameters from body
    const announcementSchema = z.object({
      dryRun: z.boolean().default(false),
      limit: z.number().int().positive().max(1000).default(1000),
      testEmail: z.string().email().nullable().optional(),
    });
    const parsed = announcementSchema.safeParse(await request.json().catch(() => ({})));
    const { dryRun, limit, testEmail } = parsed.success
      ? { ...parsed.data, testEmail: parsed.data.testEmail ?? null }
      : { dryRun: false, limit: 1000, testEmail: null };

    // If testEmail specified, send only to that address
    if (testEmail) {
      const result = await sendEXABidsAnnouncementEmail({
        to: testEmail,
        modelName: "Model",
      });
      return NextResponse.json({
        message: `Test email sent to ${testEmail}`,
        sent: result.success ? 1 : 0,
        skipped: result.skipped ? 1 : 0,
        errors: result.success ? undefined : [String(result.error)],
      });
    }

    // Find approved models with a profile photo
    const { data: models, error } = await adminClient
      .from("models")
      .select("id, first_name, last_name, username, user_id")
      .not("profile_photo_url", "is", null)
      .eq("is_approved", true)
      .not("user_id", "is", null)
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!models || models.length === 0) {
      return NextResponse.json({
        message: "No eligible models found",
        sent: 0,
        total: 0,
      });
    }

    // Get user emails from auth
    const userIds = models.map((m) => m.user_id).filter(Boolean);
    const { data: users } = await adminClient.auth.admin.listUsers();
    const userEmails = new Map(
      users?.users
        ?.filter((u: any) => userIds.includes(u.id))
        .map((u: any) => [u.id, u.email]) || []
    );

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const sentTo: string[] = [];

    for (const model of models) {
      const email = model.user_id ? userEmails.get(model.user_id) : null;

      if (!email) {
        skippedCount++;
        continue;
      }

      const modelName = model.first_name || model.username || "Model";

      if (dryRun) {
        sentTo.push(`${modelName} <${email}>`);
        sentCount++;
        continue;
      }

      try {
        const result = await sendEXABidsAnnouncementEmail({ to: email, modelName });

        if (result.success && !result.skipped) {
          sentCount++;
          sentTo.push(`${modelName} <${email}>`);
        } else if (result.skipped) {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Failed to send bids announcement to ${email}:`, err);
        errors.push(`Failed for ${model.id}: ${email}`);
      }
    }

    return NextResponse.json({
      message: dryRun
        ? `Dry run complete — would send to ${sentCount} models`
        : `Sent EXA Bids announcement to ${sentCount} models`,
      sent: sentCount,
      skipped: skippedCount,
      total: models.length,
      errors: errors.length > 0 ? errors : undefined,
      sentTo: dryRun ? sentTo : undefined,
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
