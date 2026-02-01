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
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Call request error:", error);
      return NextResponse.json(
        { error: "Failed to create call request" },
        { status: 500 }
      );
    }

    // Log activity
    await (supabase as any)
      .from("crm_activities")
      .insert({
        call_request_id: callRequest.id,
        model_id: modelId,
        activity_type: "call_requested",
        description: `Call request submitted from ${source || "website"}`,
        metadata: { source, source_detail },
      });

    // Send SMS notifications (non-blocking)
    Promise.all([
      // Notify admin of new call request
      notifyAdminNewCallRequest({
        name,
        phone,
        instagram_handle,
        source,
      }),
      // Send confirmation to the person who requested the call
      sendCallRequestConfirmation(phone, name),
    ]).catch((err) => {
      console.error("SMS notification error:", err);
    });

    return NextResponse.json({
      success: true,
      id: callRequest.id,
      message: "Call request submitted successfully! We'll be in touch soon.",
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
