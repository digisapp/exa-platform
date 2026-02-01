import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminNewCallRequest, sendCallRequestConfirmation } from "@/lib/sms";

// POST - Create a new call request (public or authenticated)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();

    const {
      name,
      instagram_handle,
      phone,
      email,
      message,
      source,
      source_detail,
      slot_id,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Check if user is a model
    let modelId = null;
    if (user) {
      const { data: model } = await supabase
        .from("models")
        .select("id")
        .eq("user_id", user.id)
        .single();

      modelId = model?.id || null;
    }

    // If slot_id provided, verify it's still available and book it
    let scheduledAt = null;
    if (slot_id) {
      // Check slot availability
      const { data: slot, error: slotError } = await (supabase as any)
        .from("availability_slots")
        .select("id, date, start_time, is_available")
        .eq("id", slot_id)
        .single();

      if (slotError || !slot) {
        return NextResponse.json(
          { error: "Time slot not found" },
          { status: 404 }
        );
      }

      if (!slot.is_available) {
        return NextResponse.json(
          { error: "This time slot is no longer available. Please select another." },
          { status: 409 }
        );
      }

      // Construct scheduled_at from date and start_time
      scheduledAt = `${slot.date}T${slot.start_time}`;
    }

    // Create the call request
    const { data: callRequest, error } = await (supabase as any)
      .from("call_requests")
      .insert({
        name,
        instagram_handle: instagram_handle || null,
        phone,
        email: email || null,
        message: message || null,
        source: source || "website",
        source_detail: source_detail || null,
        model_id: modelId,
        user_id: user?.id || null,
        status: slot_id ? "scheduled" : "pending",
        scheduled_at: scheduledAt,
      })
      .select("id, created_at, scheduled_at")
      .single();

    if (error) {
      console.error("Call request error:", error);
      return NextResponse.json(
        { error: "Failed to create call request" },
        { status: 500 }
      );
    }

    // If slot was booked, mark it as unavailable
    if (slot_id) {
      const { error: updateError } = await (supabase as any)
        .from("availability_slots")
        .update({
          is_available: false,
          booked_by: callRequest.id,
        })
        .eq("id", slot_id)
        .eq("is_available", true); // Extra check to prevent race conditions

      if (updateError) {
        console.error("Failed to mark slot as booked:", updateError);
        // The call request is still created, just without the slot being marked
      }
    }

    // Log activity
    await (supabase as any)
      .from("crm_activities")
      .insert({
        call_request_id: callRequest.id,
        model_id: modelId,
        activity_type: slot_id ? "call_scheduled" : "call_requested",
        description: slot_id
          ? `Call scheduled for ${scheduledAt} from ${source || "website"}`
          : `Call request submitted from ${source || "website"}`,
        metadata: { source, source_detail, slot_id, scheduled_at: scheduledAt },
      });

    // Send SMS notifications (non-blocking)
    Promise.all([
      // Notify admin of new call request
      notifyAdminNewCallRequest({
        name,
        phone,
        instagram_handle,
        source,
        scheduled_at: scheduledAt,
      }),
      // Send confirmation to the person who requested the call
      sendCallRequestConfirmation(phone, name, scheduledAt),
    ]).catch((err) => {
      console.error("SMS notification error:", err);
    });

    return NextResponse.json({
      success: true,
      id: callRequest.id,
      scheduled_at: callRequest.scheduled_at,
      message: slot_id
        ? "Call booked successfully!"
        : "Call request submitted successfully! We'll be in touch soon.",
    });
  } catch (error) {
    console.error("Call request error:", error);
    return NextResponse.json(
      { error: "Failed to submit call request" },
      { status: 500 }
    );
  }
}

// GET - Get call requests (for authenticated models to see their own)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get model's call requests
    const { data: callRequests, error } = await (supabase as any)
      .from("call_requests")
      .select(`
        id,
        status,
        scheduled_at,
        message,
        created_at,
        completed_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Fetch call requests error:", error);
      return NextResponse.json(
        { error: "Failed to fetch call requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      callRequests: callRequests || [],
    });
  } catch (error) {
    console.error("Fetch call requests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call requests" },
      { status: 500 }
    );
  }
}
