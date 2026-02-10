import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyEmailToken } from "@/lib/email-token";
import { notifyAdminNewCallRequest } from "@/lib/sms";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Validate token and return model info for pre-filling form
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    console.error("Schedule-call: no token in URL. Full URL:", request.url);
    return NextResponse.json(
      { error: "Missing token" },
      { status: 400 }
    );
  }

  console.log("Schedule-call: token length:", token.length, "token preview:", token.substring(0, 20) + "...");
  const payload = verifyEmailToken(token);
  if (!payload) {
    console.error("Schedule-call: token verification failed. Token:", token.substring(0, 30), "... length:", token.length, "has dot:", token.includes("."));
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const supabase = createServiceRoleClient();

  // Get model info
  const { data: model } = await (supabase
    .from("models") as any)
    .select("id, first_name, last_name, email, phone, username")
    .eq("id", payload.modelId)
    .single();

  if (!model) {
    return NextResponse.json(
      { error: "Model not found" },
      { status: 404 }
    );
  }

  // Get gig info
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title")
    .eq("id", payload.gigId)
    .single();

  return NextResponse.json({
    model: {
      firstName: model.first_name,
      lastName: model.last_name,
      email: model.email,
      phone: model.phone,
    },
    gig: gig ? { id: gig.id, title: gig.title } : null,
  });
}

// POST - Create a call request from the scheduling form
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { token, preferred_days, preferred_time_range, timezone, phone, notes } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    const payload = verifyEmailToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired link. Please contact us directly." },
        { status: 401 }
      );
    }

    if (!phone || !preferred_days?.length || !preferred_time_range) {
      return NextResponse.json(
        { error: "Phone, preferred days, and time range are required" },
        { status: 400 }
      );
    }

    const supabase: any = createServiceRoleClient();

    // Get model info
    const { data: model } = await supabase
      .from("models")
      .select("id, first_name, last_name, email, username")
      .eq("id", payload.modelId)
      .single();

    if (!model) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    // Check for duplicate submission (same model + same gig source)
    const { data: existing } = await supabase
      .from("call_requests")
      .select("id")
      .eq("model_id", payload.modelId)
      .eq("source", "gig-email")
      .eq("source_detail", payload.gigId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "already_scheduled", message: "You've already scheduled a call for this gig!" },
        { status: 409 }
      );
    }

    const modelName = [model.first_name, model.last_name]
      .filter(Boolean)
      .join(" ") || model.username || "Unknown";

    // Parse the selected day + time into a scheduled_at date
    const selectedDay = preferred_days[0]; // e.g. "Wed, Feb 11"
    const selectedTime = preferred_time_range; // e.g. "2:00 PM"
    let scheduledAt: string | null = null;

    try {
      // Parse "Wed, Feb 11" — append current year
      const year = new Date().getFullYear();
      const dateStr = `${selectedDay}, ${year} ${selectedTime}`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        // If the parsed date is in the past, it might be next year
        if (parsed < new Date()) {
          parsed.setFullYear(year + 1);
        }
        scheduledAt = parsed.toISOString();
      }
    } catch {
      // If parsing fails, store as message instead
    }

    const message = `${selectedDay} at ${selectedTime}${timezone ? ` (${timezone})` : ""}`;

    // Create call request
    const { data: callRequest, error: insertError } = await supabase
      .from("call_requests")
      .insert({
        name: modelName,
        phone,
        email: model.email || null,
        model_id: payload.modelId,
        source: "gig-email",
        source_detail: payload.gigId,
        status: scheduledAt ? "scheduled" : "pending",
        scheduled_at: scheduledAt,
        message,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Call request insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create call request" },
        { status: 500 }
      );
    }

    // Log CRM activity
    await supabase.from("crm_activities").insert({
      call_request_id: callRequest.id,
      model_id: payload.modelId,
      activity_type: "call_requested",
      description: `Call request via gig email for gig ${payload.gigId}`,
      metadata: {
        source: "gig-email",
        source_detail: payload.gigId,
        preferred_days,
        preferred_time_range,
        timezone,
      },
    });

    // Notify admin via SMS (non-blocking)
    notifyAdminNewCallRequest({
      name: modelName,
      phone,
      source: "gig-email",
    }).catch((err) => {
      console.error("SMS notification error:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Call request submitted! We'll be in touch soon.",
    });
  } catch (error) {
    console.error("Schedule call error:", error);
    return NextResponse.json(
      { error: "Failed to submit call request" },
      { status: 500 }
    );
  }
}
