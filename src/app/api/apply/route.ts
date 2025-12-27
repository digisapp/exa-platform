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
    const { instagram_username, tiktok_username } = body;

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

    // Check for existing pending application
    const { data: existingApp } = await (supabase.from("model_applications") as any)
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (existingApp) {
      return NextResponse.json(
        { error: "You already have a pending application" },
        { status: 400 }
      );
    }

    // Get user's fan info for display name
    const { data: fan } = await (supabase.from("fans") as any)
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    // Create application
    const { error: insertError } = await (supabase.from("model_applications") as any)
      .insert({
        user_id: user.id,
        fan_id: actor?.id || null,
        display_name: fan?.display_name || user.email?.split("@")[0] || "Unknown",
        email: user.email,
        instagram_username: instagram_username || null,
        tiktok_username: tiktok_username || null,
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
