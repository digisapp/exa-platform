import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendScheduleCallEmail } from "@/lib/email";
import { createEmailToken } from "@/lib/email-token";
import { format } from "date-fns";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

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

    // Admin check
    const { data: actor } = (await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single()) as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { gigId, recipientFilter, template } = body;

    if (!gigId || !recipientFilter || !template) {
      return NextResponse.json(
        { error: "Missing required fields: gigId, recipientFilter, template" },
        { status: 400 }
      );
    }

    if (!["all", "pending", "approved"].includes(recipientFilter)) {
      return NextResponse.json(
        { error: "recipientFilter must be all, pending, or approved" },
        { status: 400 }
      );
    }

    if (template !== "schedule-call") {
      return NextResponse.json(
        { error: "Unsupported template" },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();

    // Get gig details
    const { data: gig } = await adminClient
      .from("gigs")
      .select(
        "id, title, start_at, location_city, location_state"
      )
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Get applications with model data
    let query = (adminClient.from("gig_applications") as any)
      .select(
        "id, status, model_id, model:models(id, email, first_name, last_name, username, phone)"
      )
      .eq("gig_id", gigId);

    if (recipientFilter === "pending") {
      query = query.eq("status", "pending");
    } else if (recipientFilter === "approved") {
      query = query.in("status", ["accepted", "approved"]);
    }

    const { data: applications, error: appsError } = await query;

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      return NextResponse.json(
        { error: "Failed to fetch applications" },
        { status: 500 }
      );
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No matching applications found",
        emailsSent: 0,
        emailsSkipped: 0,
        emailsFailed: 0,
      });
    }

    // Format gig details
    const gigDate = gig.start_at
      ? format(new Date(gig.start_at), "MMMM d, yyyy")
      : undefined;
    const gigLocation =
      gig.location_city && gig.location_state
        ? `${gig.location_city}, ${gig.location_state}`
        : gig.location_city || gig.location_state || undefined;

    let emailsSent = 0;
    let emailsSkipped = 0;
    let emailsFailed = 0;

    // Process in batches (Resend rate limit: 2/sec)
    const batchSize = 2;
    const batchDelayMs = 1100;

    console.log(
      `Starting mass email (${template}) to ${applications.length} applicants in batches of ${batchSize}`
    );

    for (let i = 0; i < applications.length; i += batchSize) {
      const batch = applications.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (app: any) => {
          const model = app.model;
          if (!model?.email) {
            emailsSkipped++;
            return;
          }

          try {
            const token = createEmailToken(model.id, gigId);
            const scheduleUrl = `${BASE_URL}/schedule-call?token=${token}`;

            const result = await sendScheduleCallEmail({
              to: model.email,
              modelName: model.first_name || model.username || "",
              gigTitle: gig.title,
              gigDate,
              gigLocation,
              scheduleUrl,
            });

            if (result.success) {
              if ((result as any).skipped) {
                emailsSkipped++;
              } else {
                emailsSent++;
              }
            } else {
              emailsFailed++;
              console.error(
                `Failed to send to ${model.email}: ${(result as any).error || "Unknown error"}`
              );
            }
          } catch (error) {
            console.error(`Exception sending to ${model.email}:`, error);
            emailsFailed++;
          }
        })
      );

      // Delay between batches
      if (i + batchSize < applications.length) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }
    }

    console.log(
      `Mass email complete: ${emailsSent} sent, ${emailsSkipped} skipped, ${emailsFailed} failed`
    );

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsSkipped,
      emailsFailed,
      totalApplications: applications.length,
    });
  } catch (error) {
    console.error("Mass email error:", error);
    return NextResponse.json(
      { error: "Failed to send mass email" },
      { status: 500 }
    );
  }
}
