import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const MIN_FOLLOWERS = 20000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const {
      gigId,
      modelId,
      tripNumber,
      instagramHandle,
      instagramFollowers,
      digisUsername,
      pitch,
    } = await request.json();

    // Validate required fields
    if (!gigId || !modelId || !tripNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (tripNumber !== 1 && tripNumber !== 2) {
      return NextResponse.json(
        { error: "Invalid trip number" },
        { status: 400 }
      );
    }

    if (!instagramHandle) {
      return NextResponse.json(
        { error: "Instagram handle is required" },
        { status: 400 }
      );
    }

    if (!instagramFollowers || instagramFollowers < MIN_FOLLOWERS) {
      return NextResponse.json(
        { error: `Minimum ${MIN_FOLLOWERS.toLocaleString()} Instagram followers required for sponsored spots` },
        { status: 400 }
      );
    }

    if (!digisUsername) {
      return NextResponse.json(
        { error: "Digis.cc username is required" },
        { status: 400 }
      );
    }

    // Verify model belongs to user
    const { data: model } = await supabase
      .from("models")
      .select("id, first_name, last_name, username")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get gig details
    const { data: gig } = await supabase
      .from("gigs")
      .select("id, title")
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Check for existing application
    const { data: existingApp } = await supabase
      .from("gig_applications")
      .select("id, status, payment_status, spot_type")
      .eq("gig_id", gigId)
      .eq("model_id", modelId)
      .single() as { data: { id: string; status: string; payment_status: string | null; spot_type: string | null } | null };

    if (existingApp) {
      if (existingApp.status === "approved") {
        return NextResponse.json(
          { error: "You have already been approved for this trip" },
          { status: 400 }
        );
      }
      if (existingApp.payment_status === "paid") {
        return NextResponse.json(
          { error: "You have already paid for this trip" },
          { status: 400 }
        );
      }

      // Update existing application to sponsored
      const { error: updateError } = await supabase
        .from("gig_applications")
        .update({
          trip_number: tripNumber,
          spot_type: "sponsored",
          payment_status: null,
          instagram_handle: instagramHandle.replace("@", ""),
          instagram_followers: instagramFollowers,
          digis_username: digisUsername,
          sponsorship_pitch: pitch || null,
          status: "pending",
        })
        .eq("id", existingApp.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update application" },
          { status: 500 }
        );
      }
    } else {
      // Create new application
      const { error: insertError } = await supabase
        .from("gig_applications")
        .insert({
          gig_id: gigId,
          model_id: modelId,
          trip_number: tripNumber,
          spot_type: "sponsored",
          instagram_handle: instagramHandle.replace("@", ""),
          instagram_followers: instagramFollowers,
          digis_username: digisUsername,
          sponsorship_pitch: pitch || null,
          status: "pending",
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to submit application" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sponsorship application submitted successfully",
    });
  } catch (error) {
    console.error("Sponsorship application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
