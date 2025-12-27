import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Update model application status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get the application
    const { data: application, error: fetchError } = await (supabase
      .from("model_applications") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Update application status
    const { error: updateError } = await (supabase
      .from("model_applications") as any)
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actor.id,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    // If approved, convert fan to model
    if (status === "approved") {
      // Check if model already exists
      const { data: existingModel } = await (supabase.from("models") as any)
        .select("id")
        .eq("user_id", application.user_id)
        .single();

      if (!existingModel) {
        // Create model record
        const username = application.instagram_username ||
          application.tiktok_username ||
          application.email.split("@")[0];

        // Make username unique by adding numbers if needed
        let finalUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        let attempt = 0;

        while (true) {
          const checkUsername = attempt === 0 ? finalUsername : `${finalUsername}${attempt}`;
          const { data: usernameCheck } = await (supabase.from("models") as any)
            .select("id")
            .eq("username", checkUsername)
            .single();

          if (!usernameCheck) {
            finalUsername = checkUsername;
            break;
          }
          attempt++;
          if (attempt > 100) {
            finalUsername = `${finalUsername}${Date.now()}`;
            break;
          }
        }

        // Create the model record
        const { error: modelError } = await (supabase.from("models") as any)
          .insert({
            user_id: application.user_id,
            email: application.email,
            username: finalUsername,
            first_name: application.display_name,
            instagram_name: application.instagram_username || null,
            tiktok_username: application.tiktok_username || null,
            is_approved: true,
            status: "approved",
            show_location: true,
            show_social_media: true,
            coin_balance: 0,
          });

        if (modelError) {
          console.error("Error creating model:", modelError);
          // Don't fail the whole request, just log
        }

        // Update actor type to model
        const { error: actorError } = await (supabase
          .from("actors") as any)
          .update({ type: "model" })
          .eq("user_id", application.user_id);

        if (actorError) {
          console.error("Error updating actor type:", actorError);
        }
      } else {
        // Model exists, just approve it
        await (supabase.from("models") as any)
          .update({ is_approved: true, status: "approved" })
          .eq("user_id", application.user_id);
      }
    }

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("Model application update error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
