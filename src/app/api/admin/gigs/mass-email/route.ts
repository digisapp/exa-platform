import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendScheduleCallEmail } from "@/lib/email";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

async function checkAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") return null;
  return user;
}

// GET - Fetch recipients list (for client-side batching)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gigId = searchParams.get("gigId");
    const recipientFilter = searchParams.get("recipientFilter");

    if (!gigId || !recipientFilter) {
      return NextResponse.json(
        { error: "Missing gigId or recipientFilter" },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();

    // Get gig details
    const { data: gig } = await adminClient
      .from("gigs")
      .select("id, title")
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Get applications with model data
    let query = (adminClient.from("gig_applications") as any)
      .select(
        "id, status, model_id, model:models(id, email, first_name, last_name, username)"
      )
      .eq("gig_id", gigId);

    if (recipientFilter === "pending") {
      query = query.eq("status", "pending");
    } else if (recipientFilter === "approved") {
      query = query.in("status", ["accepted", "approved"]);
    }

    const { data: applications, error: appsError } = await query;

    if (appsError) {
      return NextResponse.json(
        { error: "Failed to fetch applications" },
        { status: 500 }
      );
    }

    // Build recipient list
    const recipients = (applications || [])
      .filter((app: any) => app.model?.email)
      .map((app: any) => ({
        modelId: app.model.id,
        email: app.model.email,
        modelName: app.model.first_name || app.model.username || "",
      }));

    return NextResponse.json({
      recipients,
      gig: {
        id: gig.id,
        title: gig.title,
      },
    });
  } catch (error) {
    console.error("Mass email GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}

// POST - Send a batch of emails (called repeatedly by client)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipients, gig, template } = body;

    if (!recipients || !Array.isArray(recipients) || !gig || !template) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (template !== "schedule-call") {
      return NextResponse.json(
        { error: "Unsupported template" },
        { status: 400 }
      );
    }

    // Send up to 10 emails per batch (fits within ~6s with rate limiting)
    const batch = recipients.slice(0, 10);
    let emailsSent = 0;
    let emailsSkipped = 0;
    let emailsFailed = 0;
    const failedDetails: { email: string; reason: string }[] = [];

    async function sendOne(r: any): Promise<void> {
      try {
        const scheduleUrl = `${BASE_URL}/schedule-call?gig=${encodeURIComponent(gig.title)}`;

        const result = await sendScheduleCallEmail({
          to: r.email,
          modelName: r.modelName,
          gigTitle: gig.title,
          scheduleUrl,
        });

        if (result.success) {
          if ((result as any).skipped) {
            emailsSkipped++;
          } else {
            emailsSent++;
          }
        } else {
          const errMsg = (result as any).error?.message || JSON.stringify((result as any).error) || "Unknown error";
          // Retry once after 2s if rate limited
          if (errMsg.toLowerCase().includes("rate") || errMsg.toLowerCase().includes("too many")) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const retry = await sendScheduleCallEmail({
              to: r.email,
              modelName: r.modelName,
              gigTitle: gig.title,
              scheduleUrl,
            });
            if (retry.success && !(retry as any).skipped) {
              emailsSent++;
              return;
            }
          }
          emailsFailed++;
          failedDetails.push({ email: r.email, reason: errMsg });
          console.error(`Email failed for ${r.email}:`, errMsg);
        }
      } catch (err: any) {
        emailsFailed++;
        const reason = err?.message || String(err);
        failedDetails.push({ email: r.email, reason });
        console.error(`Email exception for ${r.email}:`, reason);
      }
    }

    // Process 2 at a time with 1.1s delay (Resend rate limit)
    for (let i = 0; i < batch.length; i += 2) {
      const pair = batch.slice(i, i + 2);
      await Promise.all(pair.map(sendOne));

      // Delay between pairs
      if (i + 2 < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsSkipped,
      emailsFailed,
      batchSize: batch.length,
      failedDetails: failedDetails.length > 0 ? failedDetails : undefined,
    });
  } catch (error) {
    console.error("Mass email POST error:", error);
    return NextResponse.json(
      { error: "Failed to send batch" },
      { status: 500 }
    );
  }
}
