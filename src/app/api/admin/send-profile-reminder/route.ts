import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendMiamiSwimWeekProfileReminderEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// POST /api/admin/send-profile-reminder - Send Miami Swim Week profile reminder emails
// Supports two modes:
// 1. { mswApplicants: true } - Send to MSW academy applicants without profile photos
// 2. Default - Send to all approved models without profile photos
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
    let mswApplicants = false;
    try {
      const body = await request.json();
      dryRun = body.dryRun === true;
      mswApplicants = body.mswApplicants === true;
      if (body.limit && typeof body.limit === "number") {
        limit = Math.min(body.limit, 1000);
      }
      if (body.days && typeof body.days === "number") {
        days = body.days;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // MSW applicants mode: cross-reference academy_applications with models table
    if (mswApplicants) {
      return await sendMswApplicantReminders({ dryRun, limit });
    }

    // Default mode: all approved models without profile photos
    let query = adminClient
      .from("models")
      .select("id, first_name, last_name, username, email, user_id, claimed_at")
      .or("profile_photo_url.is.null,profile_photo_url.eq.")
      .not("user_id", "is", null)
      .is("deleted_at", null);

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte("claimed_at", cutoffDate.toISOString());
    }

    const { data: models, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!models || models.length === 0) {
      return NextResponse.json({
        message: days
          ? `No models without profile photos found (last ${days} days)`
          : "No models without profile photos found",
        sent: 0,
        total: 0,
        filter: days ? { days } : undefined,
      });
    }

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const sentTo: string[] = [];

    for (const model of models) {
      const email = model.email;

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

      // Rate limit: 2 emails per 1.1s
      if (!dryRun && sentCount % 2 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
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

interface AcademyApplicant {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
}

// Send profile reminder emails specifically to Miami Swim Week applicants
// who don't have a profile photo on their model account
async function sendMswApplicantReminders({
  dryRun,
  limit,
}: {
  dryRun: boolean;
  limit: number;
}) {
  // 1. Get all Miami Swim Week applicants
  const { data: applications, error: appError } = await (adminClient as any)
    .from("academy_applications")
    .select("id, applicant_name, applicant_email, status")
    .eq("cohort", "miami-swim-week")
    .not("status", "eq", "cancelled")
    .not("status", "eq", "refunded")
    .limit(limit) as { data: AcademyApplicant[] | null; error: any };

  if (appError) throw appError;

  if (!applications || applications.length === 0) {
    return NextResponse.json({
      message: "No Miami Swim Week applicants found",
      sent: 0,
      total: 0,
      mode: "mswApplicants",
    });
  }

  // 2. Get the emails of all applicants
  const applicantEmails = applications.map((a) => a.applicant_email);

  // 3. Find which of these emails have a model account WITH a profile photo
  // (we want to EXCLUDE these - they already have photos)
  const { data: modelsWithPhotos } = await adminClient
    .from("models")
    .select("email, profile_photo_url")
    .in("email", applicantEmails)
    .not("profile_photo_url", "is", null);

  const emailsWithPhotos = new Set(
    (modelsWithPhotos || []).map((m) => m.email?.toLowerCase())
  );

  // 4. Filter to applicants who don't have a profile photo
  const applicantsToEmail = applications.filter(
    (a) => !emailsWithPhotos.has(a.applicant_email?.toLowerCase())
  );

  if (applicantsToEmail.length === 0) {
    return NextResponse.json({
      message: "All Miami Swim Week applicants already have profile photos",
      sent: 0,
      total: applications.length,
      withPhotos: emailsWithPhotos.size,
      mode: "mswApplicants",
    });
  }

  let sentCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const sentTo: string[] = [];

  for (const applicant of applicantsToEmail) {
    const email = applicant.applicant_email;
    const name = applicant.applicant_name?.split(" ")[0] || "Model";

    if (dryRun) {
      sentTo.push(`${applicant.applicant_name} <${email}>`);
      sentCount++;
      continue;
    }

    try {
      const result = await sendMiamiSwimWeekProfileReminderEmail({
        to: email,
        modelName: name,
      });

      if (result.success && !result.skipped) {
        sentCount++;
        sentTo.push(`${applicant.applicant_name} <${email}>`);
      } else if (result.skipped) {
        skippedCount++;
      }
    } catch (err) {
      console.error(`Failed to send MSW reminder to ${email}:`, err);
      errors.push(`Failed for ${applicant.id}: ${email}`);
    }

    // Rate limit: 2 emails per 1.1s
    if (!dryRun && sentCount % 2 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return NextResponse.json({
    message: dryRun
      ? `Dry run complete - would send ${sentCount} emails to MSW applicants without profile photos`
      : `Sent ${sentCount} Miami Swim Week profile reminder emails`,
    sent: sentCount,
    skipped: skippedCount,
    total: applications.length,
    withPhotos: emailsWithPhotos.size,
    withoutPhotos: applicantsToEmail.length,
    mode: "mswApplicants",
    errors: errors.length > 0 ? errors : undefined,
    sentTo: dryRun ? sentTo : undefined,
  });
}
