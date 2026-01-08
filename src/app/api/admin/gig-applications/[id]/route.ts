import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

    if (!status || !["accepted", "rejected", "pending", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the application first
    const { data: application, error: fetchError } = await adminClient
      .from("gig_applications")
      .select("*, gig:gigs(id, title)")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update application status
    const { error: updateError } = await adminClient
      .from("gig_applications")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: `Failed to update: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If accepted, increment spots_filled on the gig
    if (status === "accepted" && application.status !== "accepted") {
      const { error: rpcError } = await adminClient.rpc("increment_gig_spots_filled", { gig_id: application.gig_id });
      if (rpcError) {
        console.error("RPC increment error:", rpcError);
        // Non-fatal - application was already updated
      }
    }

    // If cancelling an accepted application, decrement spots_filled
    if ((status === "cancelled" || status === "rejected") && application.status === "accepted") {
      const { error: rpcError } = await adminClient.rpc("decrement_gig_spots_filled", { gig_id: application.gig_id });
      if (rpcError) {
        console.error("RPC decrement error:", rpcError);
        // Non-fatal - application was already updated
      }
    }

    return NextResponse.json({
      success: true,
      application: {
        id,
        gig_id: application.gig_id,
        model_id: application.model_id,
        gig_title: application.gig?.title,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gig application update error:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to update application: ${errorMessage}` },
      { status: 500 }
    );
  }
}
