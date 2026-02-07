import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendMiamiSwimWeekProfileReminderEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// POST /api/admin/send-profile-reminder - Send Miami Swim Week profile reminder emails
// to models without profile photos
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get optional parameters from body
    let dryRun = false;
    let limit = 1000;
    let days: number | null = null;
    try {
      const body = await request.json();
      dryRun = body.dryRun === true;
      if (body.limit && typeof body.limit === "number") {
        limit = Math.min(body.limit, 1000);
      }
      // Filter for recently approved models (claimed within last N days)
      if (body.days && typeof body.days === "number") {
        days = body.days;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Find models without profile photos who are approved and have claimed their profile
    let query = adminClient
      .from("models")
      .select("id, first_name, last_name, username, user_id, claimed_at")
      .is("profile_photo_url", null)
      .eq("is_approved", true)
      .not("user_id", "is", null)
      .not("claimed_at", "is", null);

    // If days specified, only get models claimed/approved within last N days
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte("claimed_at", cutoffDate.toISOString());
    }

    const { data: models, error } = await query
      .order("claimed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!models || models.length === 0) {
      return NextResponse.json({
        message: days
          ? `No models without profile photos found (approved in last ${days} days)`
          : "No models without profile photos found",
        sent: 0,
        total: 0,
        filter: days ? { days } : undefined,
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

    // Send emails
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
        const result = await sendMiamiSwimWeekProfileReminderEmail({
          to: email,
          modelName,
        });

        if (result.success && !result.skipped) {
          sentCount++;
          sentTo.push(`${modelName} <${email}>`);
        } else if (result.skipped) {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
        errors.push(`Failed for ${model.id}: ${email}`);
      }
    }

    return NextResponse.json({
      message: dryRun
        ? `Dry run complete - would send ${sentCount} emails${days ? ` (models approved in last ${days} days)` : ""}`
        : `Sent ${sentCount} emails${days ? ` (models approved in last ${days} days)` : ""}`,
      sent: sentCount,
      skipped: skippedCount,
      total: models.length,
      filter: days ? { days } : undefined,
      errors: errors.length > 0 ? errors : undefined,
      sentTo: dryRun ? sentTo : undefined,
    });
  } catch (error) {
    console.error("Send profile reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send profile reminders" },
      { status: 500 }
    );
  }
}
