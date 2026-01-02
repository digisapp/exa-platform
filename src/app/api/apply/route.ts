import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { instagram_username, tiktok_username, phone, date_of_birth, height } = body;

    // Validate - need at least one social handle
    if (!instagram_username && !tiktok_username) {
      return NextResponse.json(
        { error: "Please provide at least one social media handle" },
        { status: 400 }
      );
    }

    // Check if user is already a model
    const { data: existingModel } = await (supabase.from("models") as any)
      .select("id, is_approved")
      .eq("user_id", user.id)
      .single();

    if (existingModel?.is_approved) {
      return NextResponse.json(
        { error: "You're already a verified model" },
        { status: 400 }
      );
    }

    // Check for existing application (any status except rejected)
    const { data: existingApp } = await (supabase.from("model_applications") as any)
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingApp) {
      // Return success with existing application (idempotent)
      return NextResponse.json({
        success: true,
        message: existingApp.status === "pending"
          ? "Application already submitted and pending review"
          : "Application already exists",
        applicationId: existingApp.id,
        status: existingApp.status,
        existing: true,
      });
    }

    // Get user's fan info for display name
    const { data: fan } = await (supabase.from("fans") as any)
      .select("id, display_name")
      .eq("user_id", user.id)
      .single();

    // Determine display name - prefer fan display name, then instagram, then tiktok, then email
    const displayName = fan?.display_name ||
                        instagram_username ||
                        tiktok_username ||
                        user.email?.split("@")[0] ||
                        "Unknown";

    // Create application
    const { error: insertError } = await (supabase.from("model_applications") as any)
      .insert({
        user_id: user.id,
        fan_id: fan?.id || null,
        display_name: displayName,
        email: user.email,
        instagram_username: instagram_username || null,
        tiktok_username: tiktok_username || null,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
        height: height || null,
        status: "pending",
      });

    if (insertError) {
      console.error("Application insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (error) {
    console.error("Apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

// Get user's application status
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: application } = await (supabase.from("model_applications") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ application });
  } catch (error) {
    console.error("Get application error:", error);
    return NextResponse.json(
      { error: "Failed to get application" },
      { status: 500 }
    );
  }
}
