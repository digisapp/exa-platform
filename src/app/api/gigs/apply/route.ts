import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const gigApplySchema = z.object({
  gigId: z.string().uuid(),
});

// POST - Apply to a gig
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = gigApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { gigId } = parsed.data;

    // Get the model's ID (models are linked by user_id, not actor)
    const { data: model } = await (supabase
      .from("models") as any)
      .select("id, is_approved")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (!model.is_approved) {
      return NextResponse.json({ error: "Your profile must be approved to apply" }, { status: 403 });
    }

    // Check if already applied
    const { data: existingApp } = await (supabase
      .from("gig_applications") as any)
      .select("id, status")
      .eq("gig_id", gigId)
      .eq("model_id", model.id)
      .single();

    if (existingApp) {
      return NextResponse.json({
        error: "You have already applied to this gig",
        status: existingApp.status
      }, { status: 400 });
    }

    // Check if gig is still open
    const { data: gig } = await (supabase
      .from("gigs") as any)
      .select("id, status, spots, spots_filled")
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    if (gig.status !== "open") {
      return NextResponse.json({ error: "This gig is no longer accepting applications" }, { status: 400 });
    }

    if (gig.spots && gig.spots_filled >= gig.spots) {
      return NextResponse.json({ error: "This gig is full" }, { status: 400 });
    }

    // Create application
    const { data: application, error } = await (supabase
      .from("gig_applications") as any)
      .insert({
        gig_id: gigId,
        model_id: model.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating application:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
      }
    });
  } catch (error) {
    console.error("Apply to gig error:", error);
    return NextResponse.json(
      { error: "Failed to apply to gig" },
      { status: 500 }
    );
  }
}

// DELETE - Withdraw application (only pending applications)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID required" }, { status: 400 });
    }

    // Get the model's ID
    const { data: model } = await (supabase
      .from("models") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get the application and verify ownership
    const { data: application } = await (supabase
      .from("gig_applications") as any)
      .select("id, status, model_id")
      .eq("id", applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.model_id !== model.id) {
      return NextResponse.json({ error: "Not your application" }, { status: 403 });
    }

    // Only allow withdrawing pending applications
    if (application.status !== "pending") {
      return NextResponse.json({
        error: "Can only withdraw pending applications. Contact admin for accepted applications."
      }, { status: 400 });
    }

    // Use service role client to bypass RLS for delete
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete the application
    const { error } = await adminClient
      .from("gig_applications")
      .delete()
      .eq("id", applicationId);

    if (error) {
      console.error("Delete error:", error);
      throw error;
    }

    // Revalidate the gigs page to show updated applications
    revalidatePath("/gigs");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Withdraw application error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw application" },
      { status: 500 }
    );
  }
}
