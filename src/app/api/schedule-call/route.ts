import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { notifyAdminNewCallRequest } from "@/lib/sms";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Create a call request from the public scheduling form
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { firstName, lastName, instagram, phone, day, time, gigTitle } = body;

    if (!firstName || !lastName || !phone || !day || !time) {
      return NextResponse.json(
        { error: "First name, last name, phone, day, and time are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const name = `${firstName.trim()} ${lastName.trim()}`;

    // Parse the selected day + time into a scheduled_at date
    let scheduledAt: string | null = null;
    try {
      const year = new Date().getFullYear();
      const dateStr = `${day}, ${year} ${time}`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        if (parsed < new Date()) {
          parsed.setFullYear(year + 1);
        }
        scheduledAt = parsed.toISOString();
      }
    } catch {
      // If parsing fails, store as message
    }

    const message = `${day} at ${time} ET${gigTitle ? ` — Re: ${gigTitle}` : ""}`;

    // Try to find model by instagram handle
    let modelId: string | null = null;
    if (instagram) {
      const handle = instagram.replace(/^@/, "").trim();
      if (handle) {
        const { data: model } = await (supabase as any)
          .from("models")
          .select("id")
          .eq("instagram_name", handle)
          .limit(1)
          .single();
        if (model) {
          modelId = model.id;
        }
      }
    }

    // Create call request
    const { error: insertError } = await (supabase as any)
      .from("call_requests")
      .insert({
        name,
        phone: phone.trim(),
        instagram_handle: instagram ? instagram.replace(/^@/, "").trim() : null,
        model_id: modelId,
        source: "gig-email",
        source_detail: gigTitle || null,
        status: scheduledAt ? "scheduled" : "pending",
        scheduled_at: scheduledAt,
        message,
      });

    if (insertError) {
      console.error("Call request insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create call request" },
        { status: 500 }
      );
    }

    // Notify admin via SMS (non-blocking)
    notifyAdminNewCallRequest({
      name,
      phone: phone.trim(),
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
